import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app


@pytest.mark.asyncio
async def test_cors_rejects_unauthorized_origin():
    """
    Non-negotiable Rule #7:
    Do not add permissive CORS (no wildcard * with credentials).
    Ensure origins not on allowlist are denied.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request with malicious / unauthorized origin
        headers = {
            "Origin": "https://malicious-attacker-site.com",
            "Access-Control-Request-Method": "GET",
        }
        response = await client.options("/healthz", headers=headers)

        # Unauthorized origin should NOT receive allow-origin header
        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin != "https://malicious-attacker-site.com"
        assert allow_origin != "*"


@pytest.mark.asyncio
async def test_cors_allows_configured_origin():
    """Verify configured allowlist origin is granted access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
        response = await client.options("/healthz", headers=headers)
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
