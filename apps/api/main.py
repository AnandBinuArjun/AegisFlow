import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from apps.api.config import get_settings
from apps.api.database import engine
from apps.api.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware
from apps.api.routes.audit import router as audit_router
from apps.api.routes.auth import router as auth_router
from apps.api.routes.findings import router as findings_router
from apps.api.routes.projects import router as projects_router
from apps.api.routes.remediation import router as remediation_router
from apps.api.routes.scans import router as scans_router
from apps.api.routes.triage import router as triage_router
from apps.api.routes.webhooks import router as webhooks_router
from packages.connectors.llm_gateway import get_llm_gateway
from packages.contracts.models import (
    ErrorDetail,
    HealthCheckResponse,
    HealthStatus,
    ReadinessCheckResponse,
    StandardErrorEnvelope,
    SystemInfoResponse,
)

logger = logging.getLogger("aegisflow.api")
settings = get_settings()

app = FastAPI(
    title="AegisFlow API",
    description="Evidence-driven Application Security Platform API",
    version="0.1.0",
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT == "development" else None,
    openapi_url="/api/openapi.json" if settings.ENVIRONMENT == "development" else None,
)

# 1. Edge & Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# 2. Strict CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID"],
)

# 3. Mount API Routers
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(audit_router)
app.include_router(scans_router)
app.include_router(findings_router)
app.include_router(triage_router)
app.include_router(remediation_router)
app.include_router(webhooks_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Sanitizes unhandled exceptions to prevent stack trace leaks or internal topology disclosure.
    """
    corr_id = getattr(request.state, "correlation_id", "unknown")
    logger.error("Unhandled server exception [corr_id=%s]: %s", corr_id, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=StandardErrorEnvelope(
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred. Please contact the administrator.",
                details={"correlation_id": corr_id},
            )
        ).model_dump(),
    )


@app.get(
    "/healthz",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Liveness Probe",
    tags=["Health & Status"],
)
async def healthz():
    """
    SEC-IAM-01 compliant health endpoint:
    Returns minimal status without disclosing infrastructure topology, internal IPs, or credentials.
    """
    return HealthCheckResponse(
        status=HealthStatus.HEALTHY,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get(
    "/readyz",
    response_model=ReadinessCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness Probe",
    tags=["Health & Status"],
)
async def readyz():
    """
    Readiness probe validating DB connection and subsystem readiness.
    """
    db_connected = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_connected = True
    except Exception as exc:
        logger.warning("Database connection check failed during readiness probe: %s", exc)

    llm_gateway = get_llm_gateway(settings.LLM_PROVIDER, settings.LLM_MODEL)
    overall_status = HealthStatus.HEALTHY if db_connected else HealthStatus.DEGRADED

    return ReadinessCheckResponse(
        status=overall_status,
        database_connected=db_connected,
        llm_gateway_status=f"active ({llm_gateway.__class__.__name__})",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get(
    "/api/v1/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System Information",
    tags=["Health & Status"],
)
async def system_info():
    """
    Provides safe system metadata for the frontend dashboard.
    """
    return SystemInfoResponse(
        name="AegisFlow",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        auth_mode="development_mock" if settings.DEVELOPMENT_AUTH_MODE else "oidc_enforced",
        llm_provider=settings.LLM_PROVIDER,
    )
