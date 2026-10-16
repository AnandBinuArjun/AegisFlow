from typing import List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    AegisFlow System Settings with strict security validations.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core Environment
    ENVIRONMENT: str = Field(
        default="development", description="development, staging, or production"
    )
    LOG_LEVEL: str = Field(default="INFO")

    # API Server
    API_HOST: str = Field(default="0.0.0.0")  # noqa: S104
    API_PORT: int = Field(default=8000)

    # CORS Allowlist (Explicit origins only - wildcards rejected if credentials enabled)
    CORS_ALLOWED_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    )

    # Database
    # Default uses SQLite for zero-friction local developer experience; PostgreSQL in staging/prod
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./local_data/aegisflow.db")
    DATABASE_SYNC_URL: str = Field(default="sqlite:///./local_data/aegisflow.db")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Authentication & Security
    DEVELOPMENT_AUTH_MODE: bool = Field(
        default=False,
        description="Explicit development-only auth mode. Must NEVER be active in production.",
    )
    JWT_SECRET_KEY: str = Field(
        default="dev-insecure-secret-key-change-in-production-placeholder32bytes!",
        description="Key used for token validation",
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)

    # Webhook Integration Secrets (HMAC Signed)
    GITHUB_WEBHOOK_SECRET: str = Field(
        default="dev-github-webhook-secret-token",
        description="Shared secret for verifying GitHub X-Hub-Signature-256",
    )
    GITLAB_WEBHOOK_SECRET: str = Field(
        default="dev-gitlab-webhook-secret-token",
        description="Shared secret for verifying GitLab X-Gitlab-Token",
    )

    # LLM Gateway
    LLM_PROVIDER: str = Field(default="mock", description="mock, openai, or anthropic")
    LLM_MODEL: str = Field(default="mock-model-v1")
    LLM_API_KEY: str = Field(default="")
    LLM_TIMEOUT_SECONDS: int = Field(default=30)
    LLM_MAX_RETRIES: int = Field(default=2)
    OPENAI_API_BASE: str = Field(default="https://api.openai.com/v1")
    ANTHROPIC_API_BASE: str = Field(default="https://api.anthropic.com/v1")

    # Payload constraints
    MAX_INGESTION_PAYLOAD_BYTES: int = Field(default=10 * 1024 * 1024)  # 10MB default

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("DEVELOPMENT_AUTH_MODE")
    @classmethod
    def validate_dev_auth_mode(cls, v, info):
        env = info.data.get("ENVIRONMENT", "development")
        if v and env.lower() == "production":
            raise ValueError(
                "CRITICAL SECURITY VIOLATION: "
                "DEVELOPMENT_AUTH_MODE cannot be enabled in production environment!"
            )
        return v


def get_settings() -> Settings:
    return Settings()
