import hashlib
import hmac
import json

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.config import get_settings
from apps.api.main import app
from packages.connectors.webhooks import GitProviderClient
from packages.policy.ssrf_defense import SSRFViolationError


@pytest.mark.asyncio
async def test_github_webhook_hmac_verification():
    """Verify GitHub webhook with valid and invalid HMAC SHA-256 signatures."""
    settings = get_settings()
    secret = settings.GITHUB_WEBHOOK_SECRET

    payload = {
        "action": "opened",
        "repository": {"full_name": "aegisflow/api-backend"},
        "pull_request": {"number": 42, "head": {"sha": "abc123commit"}},
    }
    payload_bytes = json.dumps(payload).encode("utf-8")

    # 1. Compute valid signature
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    valid_sig = f"sha256={digest}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Valid signature succeeds
        res_valid = await client.post(
            "/api/v1/webhooks/github",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": valid_sig,
                "X-GitHub-Event": "pull_request",
                "X-GitHub-Delivery": "delivery-uuid-1234",
            },
        )
        assert res_valid.status_code == 200
        data = res_valid.json()
        assert data["status"] == "processed"
        assert data["provider"] == "github"
        assert data["details"]["repository"] == "aegisflow/api-backend"

        # Invalid/forged signature fails closed with HTTP 401
        forged_sig = "sha256=" + ("0" * 64)
        res_invalid = await client.post(
            "/api/v1/webhooks/github",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": forged_sig,
                "X-GitHub-Event": "pull_request",
            },
        )
        assert res_invalid.status_code == 401
        assert "Invalid GitHub webhook HMAC" in res_invalid.json()["detail"]


@pytest.mark.asyncio
async def test_gitlab_webhook_token_verification():
    """Verify GitLab webhook token validation."""
    settings = get_settings()
    secret_token = settings.GITLAB_WEBHOOK_SECRET

    payload = {
        "event_type": "merge_request",
        "project": {"path_with_namespace": "aegisflow/web-frontend"},
    }
    payload_bytes = json.dumps(payload).encode("utf-8")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Valid token succeeds
        res_valid = await client.post(
            "/api/v1/webhooks/gitlab",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Gitlab-Token": secret_token,
                "X-Gitlab-Event": "Merge Request Hook",
            },
        )
        assert res_valid.status_code == 200
        assert res_valid.json()["provider"] == "gitlab"

        # Invalid token rejected with HTTP 401
        res_invalid = await client.post(
            "/api/v1/webhooks/gitlab",
            content=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Gitlab-Token": "wrong-secret-token",
                "X-Gitlab-Event": "Merge Request Hook",
            },
        )
        assert res_invalid.status_code == 401


@pytest.mark.asyncio
async def test_git_provider_client_ssrf_protection():
    """Verify GitProviderClient blocks SSRF targets when configured with malicious base URLs."""
    # Attempt pointing git client to internal metadata service
    malicious_client = GitProviderClient(
        provider="github",
        base_url="http://169.254.169.254",
        access_token="dummy-token",
    )

    with pytest.raises(SSRFViolationError):
        await malicious_client.create_branch("org/repo", "test-branch", "commit-sha")

    # Legitimate client with dummy token creates mock branch safely
    safe_client = GitProviderClient(
        provider="github",
        base_url="https://api.github.com",
        access_token="dummy-offline-token",
    )
    result = await safe_client.create_branch("aegisflow/repo", "fix-branch", "sha123456")
    assert result["ref"] == "refs/heads/fix-branch"
