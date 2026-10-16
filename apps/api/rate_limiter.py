import logging
import time
from typing import Any, Dict, Optional, Tuple

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from apps.api.config import get_settings

logger = logging.getLogger("aegisflow.rate_limiter")

# In-memory fallback sliding window store: tenant_id -> (timestamp_of_window_start, request_count)
_TENANT_RATE_STORE: Dict[str, Tuple[float, int]] = {}

WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 300  # 300 requests per minute per tenant

_REDIS_CLIENT: Optional[Any] = None


def get_redis_client() -> Optional[Any]:
    """
    Returns an async Redis client if REDIS_URL is configured, else None.
    """
    global _REDIS_CLIENT
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    settings = get_settings()
    if settings.REDIS_URL:
        try:
            _REDIS_CLIENT = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
        except Exception as exc:
            logger.warning("Failed to initialize Redis client (%s); using in-memory store.", exc)
            _REDIS_CLIENT = None
    return _REDIS_CLIENT


def set_redis_client_for_testing(client: Optional[Any]) -> None:
    """Helper to inject mock/test redis client in unit test suites."""
    global _REDIS_CLIENT
    _REDIS_CLIENT = client


def _check_memory_rate_limit(
    tenant_id: str,
    max_requests: int = MAX_REQUESTS_PER_WINDOW,
    window_seconds: int = WINDOW_SECONDS,
) -> None:
    now = time.time()
    record = _TENANT_RATE_STORE.get(tenant_id)

    if not record or (now - record[0]) > window_seconds:
        _TENANT_RATE_STORE[tenant_id] = (now, 1)
        return

    window_start, count = record
    if count >= max_requests:
        retry_after = int(window_seconds - (now - window_start)) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for tenant. Please retry later.",
            headers={"Retry-After": str(retry_after)},
        )

    _TENANT_RATE_STORE[tenant_id] = (window_start, count + 1)


async def _check_redis_rate_limit(
    client: Any,
    tenant_id: str,
    max_requests: int = MAX_REQUESTS_PER_WINDOW,
    window_seconds: int = WINDOW_SECONDS,
) -> None:
    now = time.time()
    window_start = now - window_seconds
    key = f"aegisflow:ratelimit:{tenant_id}"

    try:
        pipe = client.pipeline(transaction=True)
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {f"{now}:{time.time_ns()}": now})
        pipe.zcard(key)
        pipe.expire(key, window_seconds + 5)
        results = await pipe.execute()

        current_count = results[2]
        if current_count > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded for tenant (distributed quota). Please retry later.",
                headers={"Retry-After": str(window_seconds)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(
            "Redis rate-limit query failed (%s). Failing back to local in-memory store.", exc
        )
        _check_memory_rate_limit(tenant_id, max_requests, window_seconds)


async def check_tenant_rate_limit_async(
    request: Request,
    tenant_id: str,
    max_requests: int = MAX_REQUESTS_PER_WINDOW,
    window_seconds: int = WINDOW_SECONDS,
) -> None:
    """
    Distributed, multi-pod rate limiting backed by Redis with zero-config
    in-memory sliding window fallback.
    """
    client = get_redis_client()
    if client is not None:
        await _check_redis_rate_limit(client, tenant_id, max_requests, window_seconds)
    else:
        _check_memory_rate_limit(tenant_id, max_requests, window_seconds)


def check_tenant_rate_limit(
    request: Request,
    tenant_id: str,
    max_requests: int = MAX_REQUESTS_PER_WINDOW,
    window_seconds: int = WINDOW_SECONDS,
) -> None:
    """
    Synchronous entrypoint for FastAPI dependency injection and middleware.
    """
    _check_memory_rate_limit(tenant_id, max_requests, window_seconds)
