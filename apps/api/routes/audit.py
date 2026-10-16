from typing import Any, Dict, List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.database import get_db_session
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext

router = APIRouter(prefix="/api/v1/audit-events", tags=["Audit Trail"])


class AuditEventResponse(BaseModel):
    id: str
    organization_id: str
    actor_user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any]
    timestamp: str

    model_config = {"from_attributes": True}


@router.get(
    "",
    response_model=List[AuditEventResponse],
    status_code=status.HTTP_200_OK,
    summary="List Tenant Audit Events",
)
async def list_audit_events(
    limit: int = 100,
    tenant_context: TenantContext = Depends(require_permission("audit:read")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    events = await repo.list_audit_events(limit=limit)
    return [
        AuditEventResponse(
            id=e.id,
            organization_id=e.organization_id,
            actor_user_id=e.actor_user_id,
            action=e.action,
            resource_type=e.resource_type,
            resource_id=e.resource_id,
            details=e.details,
            timestamp=e.timestamp.isoformat(),
        )
        for e in events
    ]
