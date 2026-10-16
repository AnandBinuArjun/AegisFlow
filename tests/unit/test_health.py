import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from packages.contracts.models import HealthStatus


@pytest.mark.asyncio
async def test_healthz_endpoint_sec_iam_01_compliant():
    """
    SEC-IAM-01 Compliance:
    Liveness probe must return healthy status without disclosing infrastructure topology,
    credentials, internal file paths, or private IPs.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/healthz")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == HealthStatus.HEALTHY
        assert "timestamp" in data

        # Security assertion: ensure no internal topology or sensitive keys are leaked
        forbidden_keys = [
            "database",
            "redis",
            "postgres",
            "password",
            "secret",
            "host",
            "ip",
            "topology",
        ]
        for key in forbidden_keys:
            assert key not in data, f"Sensitive key '{key}' leaked in /healthz"


@pytest.mark.asyncio
async def test_readyz_endpoint():
    """
    Readiness probe must report database connection and LLM gateway status.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/readyz")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]
        assert "database_connected" in data
        assert "llm_gateway_status" in data
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_system_info_endpoint():
    """
    System info endpoint returns platform metadata safely.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/info")
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "AegisFlow"
        assert data["version"] == "0.1.0"
        assert "environment" in data
        assert "auth_mode" in data
        assert "llm_provider" in data
