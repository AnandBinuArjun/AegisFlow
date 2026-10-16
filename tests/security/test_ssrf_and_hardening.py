import pytest
from fastapi import HTTPException, Request

from apps.api.rate_limiter import _TENANT_RATE_STORE, check_tenant_rate_limit
from packages.policy.ssrf_defense import SSRFViolationError, validate_outbound_url


def test_ssrf_rejects_forbidden_schemes():
    """Non-negotiable Rule #8: Prohibit file://, ftp:// schemes."""
    with pytest.raises(SSRFViolationError) as exc:
        validate_outbound_url("file:///etc/passwd")
    assert "Only HTTP and HTTPS are permitted" in str(exc.value)

    with pytest.raises(SSRFViolationError):
        validate_outbound_url("ftp://internal-server.local")


def test_ssrf_rejects_cloud_metadata():
    """Non-negotiable Rule #8: Prohibit AWS/GCP/Azure instance metadata access."""
    with pytest.raises(SSRFViolationError) as exc:
        validate_outbound_url("http://169.254.169.254/latest/meta-data/")
    assert "protected cloud metadata" in str(exc.value) or "metadata service" in str(exc.value)


def test_ssrf_rejects_loopback_and_internal_ips():
    """Non-negotiable Rule #8: Prohibit loopback and private internal network addresses."""
    with pytest.raises(SSRFViolationError) as exc1:
        validate_outbound_url("http://127.0.0.1:8080/admin")
    assert "restricted/internal network boundary" in str(exc1.value)

    with pytest.raises(SSRFViolationError) as exc2:
        validate_outbound_url("http://localhost:5432")
    assert "restricted/internal network boundary" in str(exc2.value)


def test_ssrf_allows_public_https_destination():
    """Valid public destinations pass verification."""
    url = "https://api.github.com/repos/aegisflow/repo"
    assert validate_outbound_url(url) == url


def test_tenant_rate_limiting():
    """Phase 6: Per-tenant quota enforcement."""
    tenant_id = "test-rate-tenant"
    _TENANT_RATE_STORE.clear()

    mock_request = Request(
        {"type": "http", "method": "POST", "path": "/api/v1/scans/ingest", "headers": []}
    )

    # Within rate limit
    for _ in range(5):
        check_tenant_rate_limit(mock_request, tenant_id)

    # Exceed quota directly
    _TENANT_RATE_STORE[tenant_id] = (_TENANT_RATE_STORE[tenant_id][0], 301)
    with pytest.raises(HTTPException) as exc:
        check_tenant_rate_limit(mock_request, tenant_id)
    assert exc.value.status_code == 429
    assert "Rate limit exceeded" in exc.value.detail


@pytest.mark.asyncio
async def test_redis_distributed_rate_limiting():
    """Verify distributed Redis sliding window and graceful fallback."""
    from unittest.mock import AsyncMock, MagicMock

    from apps.api.rate_limiter import (
        check_tenant_rate_limit_async,
        set_redis_client_for_testing,
    )

    tenant_id = "tenant-redis-test"
    mock_request = Request(
        {"type": "http", "method": "POST", "path": "/api/v1/scans/ingest", "headers": []}
    )

    # 1. Mock Redis within limit (count = 10)
    mock_pipe = MagicMock()
    mock_pipe.zremrangebyscore = MagicMock()
    mock_pipe.zadd = MagicMock()
    mock_pipe.zcard = MagicMock()
    mock_pipe.expire = MagicMock()
    mock_pipe.execute = AsyncMock(return_value=[0, 1, 10, True])

    mock_redis = MagicMock()
    mock_redis.pipeline = MagicMock(return_value=mock_pipe)

    set_redis_client_for_testing(mock_redis)
    await check_tenant_rate_limit_async(mock_request, tenant_id, max_requests=100)

    # 2. Mock Redis exceeding limit (count = 101)
    mock_pipe.execute = AsyncMock(return_value=[0, 1, 101, True])
    with pytest.raises(HTTPException) as exc:
        await check_tenant_rate_limit_async(mock_request, tenant_id, max_requests=100)
    assert exc.value.status_code == 429
    assert "distributed quota" in exc.value.detail

    # 3. Redis connection failure falls back to memory without crash
    mock_pipe.execute = AsyncMock(side_effect=ConnectionError("Redis down"))
    _TENANT_RATE_STORE.clear()
    await check_tenant_rate_limit_async(mock_request, tenant_id, max_requests=100)

    # Cleanup
    set_redis_client_for_testing(None)
