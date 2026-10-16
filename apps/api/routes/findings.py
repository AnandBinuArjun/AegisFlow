from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.database import get_db_session
from apps.api.models import Finding, FindingOccurrence, FindingStatus, Project, Severity
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext
from packages.policy.prioritization import calculate_risk_score

router = APIRouter(prefix="/api/v1/findings", tags=["Findings & Prioritization"])


class FindingOccurrenceSummary(BaseModel):
    id: str
    scan_id: str
    commit_sha: Optional[str]
    message: str
    snippet: Optional[str]
    created_at: str


class FindingListItemResponse(BaseModel):
    id: str
    project_id: str
    rule_id: str
    title: str
    severity: str
    status: str
    file_path: str
    line_start: Optional[int]
    line_end: Optional[int]
    calculated_risk_score: float
    priority_band: str
    first_seen_at: str
    last_seen_at: str


class FindingDetailResponse(BaseModel):
    id: str
    project_id: str
    rule_id: str
    title: str
    description: str
    severity: str
    status: str
    file_path: str
    line_start: Optional[int]
    line_end: Optional[int]
    first_seen_at: str
    last_seen_at: str
    risk_assessment: Dict[str, Any]
    occurrences: List[FindingOccurrenceSummary]


class UpdateFindingStatusRequest(BaseModel):
    status: FindingStatus
    justification: str = Field(..., min_length=3, max_length=1000)


class OverrideRiskScoreRequest(BaseModel):
    override_score: float = Field(..., ge=0.0, le=100.0)
    override_reason: str = Field(..., min_length=5, max_length=1000)


@router.get(
    "",
    response_model=List[FindingListItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List Findings with Risk Scores",
)
async def list_findings(
    project_id: Optional[str] = Query(None),
    severity: Optional[Severity] = Query(None),
    finding_status: Optional[FindingStatus] = Query(None, alias="status"),
    tenant_context: TenantContext = Depends(require_permission("findings:read")),
    session: AsyncSession = Depends(get_db_session),
):
    stmt = select(Finding).where(Finding.organization_id == tenant_context.organization_id)
    if project_id:
        stmt = stmt.where(Finding.project_id == project_id)
    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if finding_status:
        stmt = stmt.where(Finding.status == finding_status)
    stmt = stmt.order_by(Finding.last_seen_at.desc())

    res = await session.execute(stmt)
    findings = list(res.scalars().all())

    results: List[FindingListItemResponse] = []
    for f in findings:
        risk = calculate_risk_score(severity=f.severity)
        results.append(
            FindingListItemResponse(
                id=f.id,
                project_id=f.project_id,
                rule_id=f.rule_id,
                title=f.title,
                severity=f.severity.value,
                status=f.status.value,
                file_path=f.file_path,
                line_start=f.line_start,
                line_end=f.line_end,
                calculated_risk_score=risk.score,
                priority_band=risk.priority_band,
                first_seen_at=f.first_seen_at.isoformat(),
                last_seen_at=f.last_seen_at.isoformat(),
            )
        )
    return results


@router.get(
    "/{finding_id}",
    response_model=FindingDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Finding Detail and Explainable Prioritization",
)
async def get_finding(
    finding_id: str,
    tenant_context: TenantContext = Depends(require_permission("findings:read")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    finding = await repo.get_by_id(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    # Fetch project criticality context
    proj = await repo.get_by_id(Project, finding.project_id)
    crit = proj.criticality if proj else None

    # Calculate explainable risk assessment
    risk = calculate_risk_score(severity=finding.severity, asset_criticality=crit)

    # Fetch source occurrences
    o_stmt = (
        select(FindingOccurrence)
        .where(
            FindingOccurrence.organization_id == tenant_context.organization_id,
            FindingOccurrence.finding_id == finding.id,
        )
        .order_by(FindingOccurrence.created_at.desc())
    )
    occurrences = list((await session.execute(o_stmt)).scalars().all())

    return FindingDetailResponse(
        id=finding.id,
        project_id=finding.project_id,
        rule_id=finding.rule_id,
        title=finding.title,
        description=finding.description,
        severity=finding.severity.value,
        status=finding.status.value,
        file_path=finding.file_path,
        line_start=finding.line_start,
        line_end=finding.line_end,
        first_seen_at=finding.first_seen_at.isoformat(),
        last_seen_at=finding.last_seen_at.isoformat(),
        risk_assessment=risk.to_dict(),
        occurrences=[
            FindingOccurrenceSummary(
                id=o.id,
                scan_id=o.scan_id,
                commit_sha=o.commit_sha,
                message=o.message,
                snippet=o.snippet,
                created_at=o.created_at.isoformat(),
            )
            for o in occurrences
        ],
    )


@router.patch(
    "/{finding_id}/status",
    response_model=FindingListItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Finding Status (Audited)",
)
async def update_finding_status(
    finding_id: str,
    payload: UpdateFindingStatusRequest,
    tenant_context: TenantContext = Depends(require_permission("findings:update")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    finding = await repo.get_by_id(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    old_status = finding.status.value
    finding.status = payload.status
    await session.flush()

    await repo.record_audit(
        action="finding:status_update",
        resource_type="finding",
        resource_id=finding.id,
        details={
            "old_status": old_status,
            "new_status": payload.status.value,
            "justification": payload.justification,
        },
    )

    risk = calculate_risk_score(severity=finding.severity)
    return FindingListItemResponse(
        id=finding.id,
        project_id=finding.project_id,
        rule_id=finding.rule_id,
        title=finding.title,
        severity=finding.severity.value,
        status=finding.status.value,
        file_path=finding.file_path,
        line_start=finding.line_start,
        line_end=finding.line_end,
        calculated_risk_score=risk.score,
        priority_band=risk.priority_band,
        first_seen_at=finding.first_seen_at.isoformat(),
        last_seen_at=finding.last_seen_at.isoformat(),
    )
