import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enforces Layer 1 & SEC-APP-03 security headers on all HTTP responses:
    - Content-Security-Policy
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Strict-Transport-Security
    - Referrer-Policy
    - Permissions-Policy
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # In non-dev/production environments or standard TLS contexts
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Baseline strict CSP
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self';"
            )

        return response


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Ensures every request has a traceable correlation ID for end-to-end auditability.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        corr_id = request.headers.get("X-Correlation-ID")
        if not corr_id:
            corr_id = str(uuid.uuid4())

        # Attach to request state
        request.state.correlation_id = corr_id

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = corr_id
        return response
