import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import get_settings
from apps.api.database import get_db_session
from apps.api.models import AuditEvent, utc_now
from packages.connectors.webhooks import verify_github_signature, verify_gitlab_signature

logger = logging.getLogger("aegisflow.webhooks")
router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


class WebhookResponse(BaseModel):
    status: str
    provider: str
    event: str
    details: Dict[str, Any]


@router.post(
    "/github",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="GitHub App / Webhook Receiver with HMAC SHA-256 verification",
)
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str = Header("unknown", alias="X-GitHub-Event"),
    x_github_delivery: str = Header("unknown", alias="X-GitHub-Delivery"),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Receives GitHub webhooks (e.g. pull_request, check_run, push)
    and verifies the authenticity using constant-time HMAC SHA-256.
    """
    settings = get_settings()
    body_bytes = await request.body()

    # 1. Cryptographic HMAC verification
    is_valid = verify_github_signature(
        payload_bytes=body_bytes,
        secret=settings.GITHUB_WEBHOOK_SECRET,
        signature_header=x_hub_signature_256,
    )
    if not is_valid:
        logger.warning(
            "Rejected GitHub webhook: invalid or missing HMAC signature (delivery: %s).",
            x_github_delivery,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitHub webhook HMAC SHA-256 signature.",
        )

    # 2. Parse payload safely
    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Malformed JSON payload: {exc}",
        ) from exc

    repo_name = payload.get("repository", {}).get("full_name", "unknown")

    # Look up organization or fallback
    from sqlalchemy import select

    from apps.api.models import Organization

    res_org = await session.execute(select(Organization).limit(1))
    first_org = res_org.scalars().first()
    org_id = first_org.id if first_org else "system"

    # 3. Record Audit Event
    audit = AuditEvent(
        organization_id=org_id,
        actor_user_id="github-webhook",
        action="GITHUB_WEBHOOK_VERIFIED",
        resource_type="repository",
        resource_id=repo_name,
        details={
            "event": x_github_event,
            "delivery_id": x_github_delivery,
            "action": payload.get("action"),
        },
        timestamp=utc_now(),
    )
    session.add(audit)
    await session.commit()

    return WebhookResponse(
        status="processed",
        provider="github",
        event=x_github_event,
        details={
            "delivery_id": x_github_delivery,
            "repository": repo_name,
            "action": payload.get("action"),
        },
    )


@router.post(
    "/gitlab",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="GitLab Webhook Receiver with Secret Token verification",
)
async def gitlab_webhook(
    request: Request,
    x_gitlab_token: str = Header(None, alias="X-Gitlab-Token"),
    x_gitlab_event: str = Header("unknown", alias="X-Gitlab-Event"),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Receives GitLab webhooks and verifies token authenticity.
    """
    settings = get_settings()
    body_bytes = await request.body()

    is_valid = verify_gitlab_signature(
        secret_token=settings.GITLAB_WEBHOOK_SECRET,
        token_header=x_gitlab_token,
    )
    if not is_valid:
        logger.warning("Rejected GitLab webhook: invalid or missing token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitLab webhook secret token.",
        )

    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Malformed JSON payload: {exc}",
        ) from exc

    project_name = payload.get("project", {}).get("path_with_namespace", "unknown")

    from sqlalchemy import select

    from apps.api.models import Organization

    res_org = await session.execute(select(Organization).limit(1))
    first_org = res_org.scalars().first()
    org_id = first_org.id if first_org else "system"

    audit = AuditEvent(
        organization_id=org_id,
        actor_user_id="gitlab-webhook",
        action="GITLAB_WEBHOOK_VERIFIED",
        resource_type="project",
        resource_id=project_name,
        details={"event": x_gitlab_event},
        timestamp=utc_now(),
    )
    session.add(audit)
    await session.commit()

    return WebhookResponse(
        status="processed",
        provider="gitlab",
        event=x_gitlab_event,
        details={"project": project_name},
    )
