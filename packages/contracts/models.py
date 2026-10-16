from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthCheckResponse(BaseModel):
    """
    SEC-IAM-01 Compliant:
    Discloses NO secrets, internal IPs, or sensitive infrastructure topology.
    """

    status: HealthStatus
    timestamp: str


class ReadinessCheckResponse(BaseModel):
    status: HealthStatus
    database_connected: bool
    llm_gateway_status: str
    timestamp: str


class SystemInfoResponse(BaseModel):
    name: str = "AegisFlow"
    version: str = "0.1.0"
    environment: str
    auth_mode: str
    llm_provider: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class StandardErrorEnvelope(BaseModel):
    """Standardized secure error envelope preventing stack trace / internal leak."""

    error: ErrorDetail
