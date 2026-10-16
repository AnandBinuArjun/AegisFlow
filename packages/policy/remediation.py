import hashlib
from datetime import datetime, timezone


def compute_plan_hash(
    finding_id: str,
    target_branch: str,
    patch_diff: str,
    policy_version: str = "v1.0",
) -> str:
    """
    Non-negotiable Rule #11:
    Computes immutable canonical SHA-256 hash of the remediation plan.
    Any alteration to the patch, target, or policy will invalidate prior approval.
    """
    canonical_str = (
        f"{finding_id.strip()}|"
        f"{target_branch.strip()}|"
        f"{policy_version.strip()}|"
        f"{patch_diff.strip()}"
    )
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def is_approval_valid(
    plan_hash: str,
    approved_hash: str,
    expires_at: datetime,
) -> bool:
    """
    Non-negotiable Rule #11 & Rule #12:
    - Any plan change invalidates prior approval.
    - Expired approvals cannot be used.
    """
    # 1. Exact cryptographic hash match
    if plan_hash != approved_hash:
        return False

    # 2. Expiry check
    now = datetime.now(timezone.utc)
    # Ensure timezone aware comparison
    exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    if now > exp:
        return False

    return True
