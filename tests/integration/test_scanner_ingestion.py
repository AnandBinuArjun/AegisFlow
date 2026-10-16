import json
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from apps.api.database import AsyncSessionLocal
from apps.api.main import app
from apps.api.models import (
    AssetCriticality,
    Finding,
    FindingOccurrence,
    Organization,
    Project,
)


@pytest.fixture
async def setup_ingestion_project():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Ingestion Org {uid}", slug=f"ingest-org-{uid}")
        session.add(org)
        await session.flush()

        proj = Project(
            organization_id=org.id,
            name=f"Ingestion Project {uid}",
            slug=f"ingest-proj-{uid}",
            criticality=AssetCriticality.HIGH,
        )
        session.add(proj)
        await session.commit()

        yield {
            "org_id": org.id,
            "project_id": proj.id,
        }


@pytest.mark.asyncio
async def test_semgrep_sarif_ingestion_and_idempotency(setup_ingestion_project):
    """
    Phase 2 Acceptance Criteria:
    - Normalizes Semgrep SARIF into canonical findings and source occurrence records.
    - Duplicate submissions do not create duplicate logical findings (idempotency).
    """
    data = setup_ingestion_project
    transport = ASGITransport(app=app)
    headers = {
        "X-Tenant-ID": data["org_id"],
        "X-Test-User-ID": "ingest-bot",
        "X-Test-Role": "SERVICE_INTEGRATION",
    }

    with open("fixtures/semgrep/valid_report.sarif.json", "r", encoding="utf-8") as f:
        sarif_payload = json.load(f)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest first time
        res1 = await client.post(
            "/api/v1/scans/ingest",
            json={
                "project_id": data["project_id"],
                "scanner_type": "semgrep",
                "scanner_version": "1.65.0",
                "commit_sha": "a1b2c3d4e5f67890",
                "payload": sarif_payload,
            },
            headers=headers,
        )
        assert res1.status_code == 201
        body1 = res1.json()
        assert body1["status"] == "success"
        assert body1["new_findings"] == 2
        scan_id_1 = body1["scan_id"]

        # 2. Ingest duplicate report (exact same payload hash)
        res2 = await client.post(
            "/api/v1/scans/ingest",
            json={
                "project_id": data["project_id"],
                "scanner_type": "semgrep",
                "scanner_version": "1.65.0",
                "commit_sha": "a1b2c3d4e5f67890",
                "payload": sarif_payload,
            },
            headers=headers,
        )
        assert res2.status_code in [200, 201]
        body2 = res2.json()
        assert body2["status"] == "duplicate_skipped"
        assert body2["scan_id"] == scan_id_1

    # Verify Database state
    async with AsyncSessionLocal() as session:
        f_stmt = select(Finding).where(Finding.project_id == data["project_id"])
        findings = list((await session.execute(f_stmt)).scalars().all())
        assert len(findings) == 2, "Duplicate logical findings were incorrectly created!"

        # Provenance occurrences
        o_stmt = select(FindingOccurrence).where(FindingOccurrence.scan_id == scan_id_1)
        occurrences = list((await session.execute(o_stmt)).scalars().all())
        assert len(occurrences) == 2


@pytest.mark.asyncio
async def test_trivy_json_ingestion(setup_ingestion_project):
    """
    Phase 2 Acceptance Criteria:
    Normalizes Trivy JSON vulnerabilities and associates CVEs.
    """
    data = setup_ingestion_project
    transport = ASGITransport(app=app)
    headers = {
        "X-Tenant-ID": data["org_id"],
        "X-Test-User-ID": "ingest-bot",
        "X-Test-Role": "SERVICE_INTEGRATION",
    }

    with open("fixtures/trivy/valid_report.json", "r", encoding="utf-8") as f:
        trivy_payload = json.load(f)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/scans/ingest",
            json={
                "project_id": data["project_id"],
                "scanner_type": "trivy",
                "scanner_version": "0.48.0",
                "payload": trivy_payload,
            },
            headers=headers,
        )
        assert res.status_code == 201
        body = res.json()
        assert body["status"] == "success"
        assert body["new_findings"] == 2


@pytest.mark.asyncio
async def test_malformed_scanner_payload_rejected(setup_ingestion_project):
    """
    Phase 2 Acceptance Criteria:
    Malformed payloads are rejected safely with HTTP 422.
    """
    data = setup_ingestion_project
    transport = ASGITransport(app=app)
    headers = {
        "X-Tenant-ID": data["org_id"],
        "X-Test-User-ID": "ingest-bot",
        "X-Test-Role": "SERVICE_INTEGRATION",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/scans/ingest",
            json={
                "project_id": data["project_id"],
                "scanner_type": "semgrep",
                "payload": {"invalid_key": "not a sarif document"},
            },
            headers=headers,
        )
        assert res.status_code == 422
        assert "Invalid SARIF document" in res.json()["detail"]


@pytest.mark.asyncio
async def test_cross_tenant_project_ingestion_rejected(setup_ingestion_project):
    """
    Phase 2 Acceptance Criteria:
    Connector-provided tenant IDs cannot override trusted project mapping.
    Attempting to ingest a scan targeting another tenant's project returns 404.
    """
    data = setup_ingestion_project
    transport = ASGITransport(app=app)
    foreign_headers = {
        "X-Tenant-ID": "completely-different-org-id",
        "X-Test-User-ID": "foreign-bot",
        "X-Test-Role": "SERVICE_INTEGRATION",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/scans/ingest",
            json={
                "project_id": data["project_id"],
                "scanner_type": "semgrep",
                "payload": {"runs": []},
            },
            headers=foreign_headers,
        )
        assert res.status_code == 404
