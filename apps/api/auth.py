import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Optional

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import get_settings
from apps.api.database import get_db_session
from apps.api.models import Membership, Role
from apps.api.tenancy import TenantContext, has_permission

logger = logging.getLogger("aegisflow.auth")
settings = get_settings()

security_bearer = HTTPBearer(auto_error=False)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed, expiring JWT token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token signature and expiry."""
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication credentials: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_tenant_context(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    session: AsyncSession = Depends(get_db_session),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
    x_test_user_id: Optional[str] = Header(None, alias="X-Test-User-ID"),
    x_test_role: Optional[str] = Header(None, alias="X-Test-Role"),
) -> TenantContext:
    """
    SEC-IAM-01 & SEC-IAM-02 Server-Side Tenancy & Identity Resolver.
    Validates token and organization membership server-side.
    """
    current_settings = get_settings()

    # 1. Check for Development Auth Mode (strictly prohibited in production)
    if current_settings.ENVIRONMENT == "development":
        if x_test_user_id and x_tenant_id:
            role = Role(x_test_role) if x_test_role else Role.DEVELOPER
            return TenantContext(
                user_id=x_test_user_id,
                organization_id=x_tenant_id,
                role=role,
                is_system_admin=False,
            )

    # 2. Bearer Token Resolution
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier.",
        )

    # Resolve target tenant
    target_org_id = payload.get("org_id") or x_tenant_id
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context is required.",
        )

    # 3. Query Membership strictly from Database (Server-side validation)
    stmt = select(Membership).where(
        Membership.user_id == user_id,
        Membership.organization_id == target_org_id,
    )
    res = await session.execute(stmt)
    membership = res.scalars().first()

    effective_role = membership.role if membership else None
    if not effective_role:
        role_claim = payload.get("role")
        if role_claim and current_settings.ENVIRONMENT == "development":
            effective_role = Role(role_claim)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an authorized member of the requested organization.",
            )

    return TenantContext(
        user_id=user_id,
        organization_id=target_org_id,
        role=effective_role,
        is_system_admin=False,
    )


def require_permission(permission: str) -> Callable:
    """
    Dependency factory enforcing atomic RBAC privileges server-side (SEC-IAM-03).
    """

    async def permission_dependency(
        tenant_context: TenantContext = Depends(get_tenant_context),
    ) -> TenantContext:
        if not has_permission(tenant_context.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Missing required permission '{permission}'.",
            )
        return tenant_context

    return permission_dependency
