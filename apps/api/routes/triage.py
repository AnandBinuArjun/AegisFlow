from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.config import get_settings
from apps.api.database import get_db_session
from apps.api.models import Finding, FindingOccurrence
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext
from packages.connectors.llm_gateway import LLMTriageRequest, LLMTriageResponse, get_llm_gateway
from packages.policy.context_builder import sanitize_code_snippet, validate_cited_evidence

router = APIRouter(prefix="/api/v1/findings", tags=["AI Triage Gateway"])
settings = get_settings()


@router.post(
    "/{finding_id}/triage",
    response_model=LLMTriageResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Evidence-Linked AI Triage Proposal",
)
async def generate_finding_triage(
    finding_id: str,
    tenant_context: TenantContext = Depends(require_permission("triage:execute")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    finding = await repo.get_by_id(Finding, finding_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found in authenticated organization.",
        )

    # Fetch latest source occurrence for snippet
    stmt = (
        select(FindingOccurrence)
        .where(FindingOccurrence.finding_id == finding.id)
        .order_by(FindingOccurrence.created_at.desc())
    )
    occ = (await session.execute(stmt)).scalars().first()

    raw_snippet = occ.snippet if occ else ""
    raw_message = occ.message if occ else finding.description

    # Redact sensitive credentials and minimize context
    sanitized_snippet = sanitize_code_snippet(raw_snippet)

    gateway = get_llm_gateway(settings.LLM_PROVIDER, settings.LLM_MODEL)
    request = LLMTriageRequest(
        finding_id=finding.id,
        rule_id=finding.rule_id,
        severity=finding.severity.value,
        file_path=finding.file_path,
        code_snippet=sanitized_snippet,
        scanner_message=raw_message,
    )

    triage_result = await gateway.generate_triage(request)

    # Validate that every cited evidence ID exists and matches the finding
    if not validate_cited_evidence(triage_result.cited_evidence_ids, finding.id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI triage output rejected: Cited evidence IDs are invalid or unverified.",
        )

    # Audit the triage action without recording full source code
    await repo.record_audit(
        action="finding:ai_triage",
        resource_type="finding",
        resource_id=finding.id,
        details={
            "provider": triage_result.provider_name,
            "model_version": triage_result.model_version,
            "confidence_score": triage_result.confidence_score,
        },
    )

    return triage_result
