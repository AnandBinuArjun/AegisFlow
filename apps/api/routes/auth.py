from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from apps.api.auth import create_access_token
from apps.api.config import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
settings = get_settings()


class DevTokenRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    org_id: str = Field(..., min_length=1)
    role: str = Field(default="DEVELOPER")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int


@router.post(
    "/dev-token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Development Token",
)
async def generate_dev_token(payload: DevTokenRequest):
    """
    SEC-IAM-01 Compliance:
    Development-only endpoint strictly disabled and blocked in non-development environments.
    """
    if not settings.DEVELOPMENT_AUTH_MODE or settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development token generation is prohibited.",
        )

    token = create_access_token(
        data={
            "sub": payload.user_id,
            "org_id": payload.org_id,
            "role": payload.role,
        }
    )
    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
