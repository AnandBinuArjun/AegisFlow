import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app


@pytest.mark.asyncio
async def test_audit_event_logged_and_developer_cannot_read_audit():
    """
    SEC-IAM-09 & Non-negotiable Rule #15:
    Sensitive actions (like project creation) generate audit events.
    Auditors can view audit events; Developers cannot read audit logs.
    """
    import uuid

    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    org_id = f"test-audit-org-{uid}"

    admin_headers = {
        "X-Tenant-ID": org_id,
        "X-Test-User-ID": "admin-actor-1",
        "X-Test-Role": "SECURITY_ADMIN",
    }

    dev_headers = {
        "X-Tenant-ID": org_id,
        "X-Test-User-ID": "dev-actor-2",
        "X-Test-Role": "DEVELOPER",
    }

    auditor_headers = {
        "X-Tenant-ID": org_id,
        "X-Test-User-ID": "auditor-actor-3",
        "X-Test-Role": "AUDITOR",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin creates project -> triggers audit log
        create_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Audited Microservice",
                "slug": f"audited-ms-{uid}",
                "criticality": "HIGH",
            },
            headers=admin_headers,
        )
        assert create_res.status_code == 201

        # 2. Developer attempts to read audit logs -> must be forbidden (403)
        dev_audit_res = await client.get("/api/v1/audit-events", headers=dev_headers)
        assert dev_audit_res.status_code == 403
        assert "Missing required permission 'audit:read'" in dev_audit_res.json()["detail"]

        # 3. Auditor reads audit logs -> authorized (200)
        auditor_res = await client.get("/api/v1/audit-events", headers=auditor_headers)
        assert auditor_res.status_code == 200
        events = auditor_res.json()
        assert len(events) >= 1

        project_create_events = [e for e in events if e["action"] == "project:create"]
        assert len(project_create_events) >= 1
        assert project_create_events[0]["actor_user_id"] == "admin-actor-1"
        assert project_create_events[0]["resource_type"] == "project"
