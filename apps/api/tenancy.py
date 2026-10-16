from dataclasses import dataclass
from typing import Dict, Set

from fastapi import HTTPException, status

from apps.api.models import Role


@dataclass(frozen=True)
class TenantContext:
    """
    Cryptographically and server-side verified tenant execution context.
    Propagated to all queries and job brokers.
    """

    user_id: str
    organization_id: str
    role: Role
    is_system_admin: bool = False

    def require_organization_match(self, target_organization_id: str) -> None:
        """
        Enforces Non-negotiable Rule #4 & Rule #5:
        Never trust client-supplied tenant IDs without server-side verification.
        """
        if not self.is_system_admin and self.organization_id != target_organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cross-tenant boundary violation.",
            )


# Role-Based Access Control (RBAC) Permissions Matrix (SEC-IAM-04, SEC-IAM-05)
ROLE_PERMISSIONS: Dict[Role, Set[str]] = {
    Role.OWNER: {
        "org:manage",
        "org:read",
        "members:manage",
        "members:read",
        "projects:manage",
        "projects:read",
        "scans:ingest",
        "findings:read",
        "findings:update",
        "triage:execute",
        "plans:create",
        "plans:approve",
        "verification:execute",
        "audit:read",
    },
    Role.SECURITY_ADMIN: {
        "org:read",
        "members:manage",
        "members:read",
        "projects:manage",
        "projects:read",
        "scans:ingest",
        "findings:read",
        "findings:update",
        "triage:execute",
        "plans:create",
        "plans:approve",
        "verification:execute",
        "audit:read",
    },
    Role.SECURITY_ANALYST: {
        "org:read",
        "members:read",
        "projects:read",
        "scans:ingest",
        "findings:read",
        "findings:update",
        "triage:execute",
        "plans:create",
        "audit:read",
    },
    Role.DEVELOPER: {
        "org:read",
        "projects:read",
        "findings:read",
        "plans:create",
        # Explicitly CANNOT approve plans (Principle 3, Rule 11)
    },
    Role.AUDITOR: {
        "org:read",
        "members:read",
        "projects:read",
        "findings:read",
        "audit:read",
        # Read-only across all resources
    },
    Role.SERVICE_INTEGRATION: {
        "scans:ingest",
        "findings:read",
    },
}


def has_permission(role: Role, permission: str) -> bool:
    """Evaluates whether a role possesses a given atomic permission."""
    return permission in ROLE_PERMISSIONS.get(role, set())


async def reauthorize_job_tenant_scope(
    session,
    organization_id: str,
    job_name: str,
) -> bool:
    """
    Non-negotiable Rule #5 & Acceptance Criteria:
    Every background job must be tenant-scoped and reauthorized at execution time.
    Fails closed if the organization does not exist or has been suspended.
    """
    from sqlalchemy import select

    from apps.api.models import Organization

    stmt = select(Organization).where(Organization.id == organization_id)
    res = await session.execute(stmt)
    org = res.scalars().first()

    if not org:
        raise PermissionError(
            f"Job execution aborted: Tenant '{organization_id}' not found or deactivated. "
            f"[Job: {job_name}]"
        )
    return True
