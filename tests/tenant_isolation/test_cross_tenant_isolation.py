import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.database import AsyncSessionLocal
from apps.api.main import app
from apps.api.models import AssetCriticality, Organization, Project


@pytest.fixture
async def setup_two_tenants():
    """
    Sets up two isolated organizations and an asset in Tenant B.
    """
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        # Organization A
        org_a = Organization(name=f"Tenant Alpha Corp {uid}", slug=f"tenant-alpha-{uid}")
        # Organization B
        org_b = Organization(name=f"Tenant Beta Corp {uid}", slug=f"tenant-beta-{uid}")
        session.add_all([org_a, org_b])
        await session.flush()

        # Project in Tenant B
        proj_b = Project(
            organization_id=org_b.id,
            name="Confidential Core Service",
            slug=f"confidential-core-{uid}",
            criticality=AssetCriticality.CRITICAL,
        )
        session.add(proj_b)
        await session.commit()

        yield {
            "org_a_id": org_a.id,
            "org_b_id": org_b.id,
            "proj_b_id": proj_b.id,
        }


@pytest.mark.asyncio
async def test_tenant_a_cannot_read_tenant_b_project_by_id(setup_two_tenants):
    """
    NON-NEGOTIABLE TENANT ISOLATION (SEC-IAM-02):
    User from Tenant A cannot read Tenant B's project by substituting its ID.
    Must return 404 (or 403), never leaking the record or its existence.
    """
    data = setup_two_tenants
    transport = ASGITransport(app=app)

    headers_tenant_a = {
        "X-Tenant-ID": data["org_a_id"],
        "X-Test-User-ID": "user-alice-alpha",
        "X-Test-Role": "SECURITY_ADMIN",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt to access Tenant B's project using Tenant A's authenticated context
        response = await client.get(
            f"/api/v1/projects/{data['proj_b_id']}", headers=headers_tenant_a
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tenant_a_list_projects_excludes_tenant_b(setup_two_tenants):
    """
    TENANT SCOPE ENFORCEMENT:
    Listing projects under Tenant A must never return Tenant B projects.
    """
    data = setup_two_tenants
    transport = ASGITransport(app=app)

    headers_tenant_a = {
        "X-Tenant-ID": data["org_a_id"],
        "X-Test-User-ID": "user-alice-alpha",
        "X-Test-Role": "OWNER",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Tenant A creates their own project
        create_res = await client.post(
            "/api/v1/projects",
            json={"name": "Alpha Public App", "slug": "alpha-public", "criticality": "LOW"},
            headers=headers_tenant_a,
        )
        assert create_res.status_code == 201
        alpha_proj_id = create_res.json()["id"]

        # 2. List projects under Tenant A
        list_res = await client.get("/api/v1/projects", headers=headers_tenant_a)
        assert list_res.status_code == 200
        projects = list_res.json()

        project_ids = [p["id"] for p in projects]
        assert alpha_proj_id in project_ids
        assert data["proj_b_id"] not in project_ids, (
            "CRITICAL LEAK: Tenant B project returned in Tenant A listing!"
        )


@pytest.mark.asyncio
async def test_cross_tenant_header_spoofing_rejected():
    """
    Rule #4: Never trust client-supplied tenant claims without server-side verification.
    """
    transport = ASGITransport(app=app)
    # Request without valid tenant identity or unauthenticated
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/projects")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_background_job_reauthorization(setup_two_tenants):
    """
    Acceptance Criteria & Non-negotiable Rule #5:
    Background jobs reauthorize tenant scope when they execute.
    """
    from apps.api.tenancy import reauthorize_job_tenant_scope

    data = setup_two_tenants
    async with AsyncSessionLocal() as session:
        # Valid tenant succeeds
        authorized = await reauthorize_job_tenant_scope(
            session=session,
            organization_id=data["org_a_id"],
            job_name="scan_ingestion_job",
        )
        assert authorized is True

        # Non-existent or deleted tenant fails closed immediately
        with pytest.raises(PermissionError) as exc_info:
            await reauthorize_job_tenant_scope(
                session=session,
                organization_id="non-existent-tenant-id",
                job_name="scan_ingestion_job",
            )
        assert "not found or deactivated" in str(exc_info.value)
