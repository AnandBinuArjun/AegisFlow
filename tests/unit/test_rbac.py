import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from apps.api.models import Role
from apps.api.tenancy import has_permission


def test_rbac_matrix_principle_guarantees():
    """
    Core Security Principle:
    Developer & Auditor CANNOT approve plans.
    Only Owner and Security Admin have approval authorization.
    """
    # 1. Developer cannot approve plans
    assert not has_permission(Role.DEVELOPER, "plans:approve")
    assert has_permission(Role.DEVELOPER, "plans:create")
    assert has_permission(Role.DEVELOPER, "findings:read")

    # 2. Auditor is read-only
    assert not has_permission(Role.AUDITOR, "plans:approve")
    assert not has_permission(Role.AUDITOR, "plans:create")
    assert not has_permission(Role.AUDITOR, "projects:manage")
    assert has_permission(Role.AUDITOR, "audit:read")
    assert has_permission(Role.AUDITOR, "findings:read")

    # 3. Security Admin & Owner have plan approval rights
    assert has_permission(Role.SECURITY_ADMIN, "plans:approve")
    assert has_permission(Role.OWNER, "plans:approve")


@pytest.mark.asyncio
async def test_developer_cannot_create_project():
    """
    SEC-IAM-03: Object-level server-side RBAC enforcement.
    Developer role lacks 'projects:manage' and must be rejected with HTTP 403.
    """
    transport = ASGITransport(app=app)
    headers = {
        "X-Tenant-ID": "test-org-123",
        "X-Test-User-ID": "dev-user-bob",
        "X-Test-Role": "DEVELOPER",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/projects",
            json={"name": "Dev Unauthorized Project", "slug": "dev-proj", "criticality": "LOW"},
            headers=headers,
        )
        assert response.status_code == 403
        assert "Missing required permission 'projects:manage'" in response.json()["detail"]


@pytest.mark.asyncio
async def test_security_admin_can_create_project():
    """
    Security Admin possesses 'projects:manage' and is authorized.
    """
    transport = ASGITransport(app=app)
    import uuid

    uid = uuid.uuid4().hex[:6]
    headers = {
        "X-Tenant-ID": f"test-org-{uid}",
        "X-Test-User-ID": "admin-user-carol",
        "X-Test-Role": "SECURITY_ADMIN",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/projects",
            json={
                "name": "SecAdmin Authorized Project",
                "slug": f"secadmin-proj-{uid}",
                "criticality": "HIGH",
            },
            headers=headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "SecAdmin Authorized Project"
        assert data["criticality"] == "HIGH"
