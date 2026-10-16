from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.database import get_db_session
from apps.api.models import Project
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext
from workers.ingestion.service import (
    IngestionMalformedError,
    IngestionPayloadTooLargeError,
    IngestionService,
)

router = APIRouter(prefix="/api/v1/scans", tags=["Scanner Ingestion"])


class IngestScanJsonRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    scanner_type: str = Field(..., pattern="^(semgrep|trivy)$")
    scanner_version: Optional[str] = None
    commit_sha: Optional[str] = Field(None, max_length=64)
    payload: Dict[str, Any] = Field(..., description="Raw SARIF or Trivy JSON report")


class IngestScanResponse(BaseModel):
    status: str
    scan_id: str
    total_parsed: Optional[int] = None
    new_findings: Optional[int] = None
    updated_findings: Optional[int] = None
    message: Optional[str] = None


@router.post(
    "/ingest",
    response_model=IngestScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Scanner Report (Semgrep SARIF / Trivy JSON)",
)
async def ingest_scan(
    response: Response,
    body: IngestScanJsonRequest,
    tenant_context: TenantContext = Depends(require_permission("scans:ingest")),
    session: AsyncSession = Depends(get_db_session),
):
    # Verify project exists and belongs strictly to the caller's organization
    repo = TenantScopedRepository(session, tenant_context)
    project = await repo.get_by_id(Project, body.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target project not found in authenticated organization.",
        )

    import json

    raw_bytes = json.dumps(body.payload).encode("utf-8")

    ingestion_service = IngestionService(session, tenant_context)

    try:
        result = await ingestion_service.ingest_report(
            scanner_type=body.scanner_type,
            project_id=body.project_id,
            raw_payload_bytes=raw_bytes,
            commit_sha=body.commit_sha,
            scanner_version=body.scanner_version,
        )
    except IngestionPayloadTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except IngestionMalformedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    response.status_code = (
        status.HTTP_200_OK
        if result.get("status") == "duplicate_skipped"
        else status.HTTP_201_CREATED
    )

    return IngestScanResponse(
        status=result["status"],
        scan_id=result["scan_id"],
        total_parsed=result.get("total_parsed"),
        new_findings=result.get("new_findings"),
        updated_findings=result.get("updated_findings"),
        message=result.get("message"),
    )
