import pytest
from pydantic import ValidationError

from apps.api.config import Settings


def test_settings_default_secure():
    """Verify default settings provide secure defaults."""
    settings = Settings()
    assert settings.ENVIRONMENT == "development"
    assert settings.LLM_PROVIDER == "mock"
    assert settings.DEVELOPMENT_AUTH_MODE is False
    assert len(settings.CORS_ALLOWED_ORIGINS) > 0


def test_production_fails_closed_on_dev_auth_mode():
    """
    CRITICAL SECURITY INVARIANT:
    Development auth mode must NEVER be enabled implicitly or explicitly in production.
    """
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEVELOPMENT_AUTH_MODE=True,
        )
    assert "CRITICAL SECURITY VIOLATION" in str(exc_info.value)


def test_cors_origin_parsing():
    """Verify comma-separated origins are parsed securely into a list."""
    settings = Settings(
        CORS_ALLOWED_ORIGINS="https://app.aegisflow.internal, https://security.aegisflow.internal"
    )
    assert settings.CORS_ALLOWED_ORIGINS == [
        "https://app.aegisflow.internal",
        "https://security.aegisflow.internal",
    ]
