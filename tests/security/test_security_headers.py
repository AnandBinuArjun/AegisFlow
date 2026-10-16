import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app


@pytest.mark.asyncio
async def test_security_headers_enforcement():
    """
    SEC-APP-03 / Layer 1 Edge Enforcement:
    Verify that security headers are strictly attached to all HTTP responses.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/healthz")

        headers = response.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "max-age=31536000" in headers.get("Strict-Transport-Security", "")
        assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
        assert "X-Correlation-ID" in headers
