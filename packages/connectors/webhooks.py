import hashlib
import hmac
import logging
from typing import Any, Dict, Optional

import httpx

from packages.policy.ssrf_defense import validate_outbound_url

logger = logging.getLogger("aegisflow.webhooks")


def verify_github_signature(
    payload_bytes: bytes,
    secret: str,
    signature_header: Optional[str],
) -> bool:
    """
    Validates GitHub webhook HMAC SHA-256 signature (X-Hub-Signature-256)
    using constant-time comparison to prevent timing attacks.
    """
    if not signature_header or not secret:
        return False

    prefix = "sha256="
    if not signature_header.startswith(prefix):
        return False

    expected_sig = signature_header[len(prefix) :].strip()
    computed_sig = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_sig, computed_sig)


def verify_gitlab_signature(
    secret_token: str,
    token_header: Optional[str],
) -> bool:
    """
    Validates GitLab webhook secret token (X-Gitlab-Token)
    using constant-time comparison.
    """
    if not token_header or not secret_token:
        return False

    return hmac.compare_digest(secret_token.strip(), token_header.strip())


class GitProviderClient:
    """
    Live Git provider integration client (GitHub / GitLab) for branch creation,
    pull request dispatch, and verification webhook tracking.
    All outbound calls are strictly SSRF-validated.
    """

    def __init__(
        self,
        provider: str = "github",
        base_url: str = "https://api.github.com",
        access_token: Optional[str] = None,
        timeout_seconds: float = 10.0,
    ):
        self.provider = provider.lower()
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.timeout_seconds = timeout_seconds

    async def create_branch(
        self,
        repository: str,
        new_branch_name: str,
        source_sha: str,
    ) -> Dict[str, Any]:
        """
        Creates a new git branch in the target repository.
        Guarded by SSRF validation.
        """
        endpoint = f"{self.base_url}/repos/{repository}/git/refs"
        validate_outbound_url(endpoint)

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AegisFlow-SecOps/1.0",
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        payload = {
            "ref": f"refs/heads/{new_branch_name}",
            "sha": source_sha,
        }

        # If running offline or without credentials, simulate successful branch creation
        if not self.access_token or "dummy" in self.access_token.lower():
            logger.info(
                "Offline/mock token detected. Simulating branch '%s' creation in %s.",
                new_branch_name,
                repository,
            )
            return {
                "ref": f"refs/heads/{new_branch_name}",
                "node_id": f"ref-mock-{new_branch_name}",
                "object": {"sha": source_sha, "type": "commit"},
            }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
