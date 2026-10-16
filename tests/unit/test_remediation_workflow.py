import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.database import AsyncSessionLocal
from apps.api.main import app
from apps.api.models import AssetCriticality, Finding, Organization, Project, Severity
from packages.policy.remediation import compute_plan_hash, is_approval_valid


@pytest.fixture
async def setup_remediation_finding():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Remediation Org {uid}", slug=f"rem-org-{uid}")
        session.add(org)
        await session.flush()

        proj = Project(
            organization_id=org.id,
            name=f"Remediation Project {uid}",
            slug=f"rem-proj-{uid}",
            criticality=AssetCriticality.CRITICAL,
        )
        session.add(proj)
        await session.flush()

        finding = Finding(
            organization_id=org.id,
            project_id=proj.id,
            fingerprint=f"rem-fp-{uid}",
            rule_id="crypto.weak-hash.md5",
            title="Use of Insecure MD5 Hash",
            description="MD5 is cryptographically broken and vulnerable to collision attacks.",
            severity=Severity.HIGH,
            file_path="src/utils/crypto.py",
        )
        session.add(finding)
        await session.commit()

        yield {
            "org_id": org.id,
            "project_id": proj.id,
            "finding_id": finding.id,
        }


def test_hash_invalidation_on_plan_mutation():
    """
    Non-negotiable Rule #11 & Rule #12:
    Any plan change invalidates prior approval.
    """
    original_patch = "--- a/crypto.py\n+++ b/crypto.py\n- hashlib.md5()\n+ hashlib.sha256()"
    mutated_patch = "--- a/crypto.py\n+++ b/crypto.py\n- hashlib.md5()\n+ hashlib.sha1()"

    hash_original = compute_plan_hash("f-1", "main", original_patch)
    hash_mutated = compute_plan_hash("f-1", "main", mutated_patch)

    assert hash_original != hash_mutated

    future_exp = datetime.now(timezone.utc) + timedelta(hours=1)
    # Valid approval with matching hash
    assert is_approval_valid(hash_original, hash_original, future_exp) is True
    # Mutated plan with prior approval hash fails validation
    assert is_approval_valid(hash_mutated, hash_original, future_exp) is False

    # Expired approval fails validation
    past_exp = datetime.now(timezone.utc) - timedelta(hours=1)
    assert is_approval_valid(hash_original, hash_original, past_exp) is False


@pytest.mark.asyncio
async def test_remediation_lifecycle_and_separation_of_duties(setup_remediation_finding):
    """
    Phase 5 Acceptance Criteria:
    - Separation of requester and approver.
    - Changing the plan invalidates approval.
    - Independent verification transitions finding to RESOLVED.
    """
    data = setup_remediation_finding
    transport = ASGITransport(app=app)

    developer_headers = {
        "X-Tenant-ID": data["org_id"],
        "X-Test-User-ID": "dev-requester",
        "X-Test-Role": "DEVELOPER",
    }

    approver_headers = {
        "X-Tenant-ID": data["org_id"],
        "X-Test-User-ID": "security-admin-approver",
        "X-Test-Role": "SECURITY_ADMIN",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Developer creates remediation plan
        patch = "--- a/crypto.py\n+++ b/crypto.py\n- hashlib.md5()\n+ hashlib.sha256()"
        res_plan = await client.post(
            f"/api/v1/findings/{data['finding_id']}/remediation-plans",
            json={
                "patch_diff": patch,
                "target_branch": "fix-md5-deprecation",
            },
            headers=developer_headers,
        )
        assert res_plan.status_code == 201
        plan = res_plan.json()
        plan_id = plan["id"]
        assert plan["status"] == "AWAITING_APPROVAL"

        # 2. Requester attempts to approve their own plan -> MUST BE REJECTED (Separation of Duties)
        res_self_approve = await client.post(
            f"/api/v1/remediation-plans/{plan_id}/approve",
            headers=developer_headers,
        )
        assert res_self_approve.status_code == 403

        # 3. Security Admin approves the plan
        res_approve = await client.post(
            f"/api/v1/remediation-plans/{plan_id}/approve",
            headers=approver_headers,
        )
        assert res_approve.status_code == 200
        assert res_approve.json()["decision"] == "APPROVED"

        # 4. Execute the approved plan
        res_exec = await client.post(
            f"/api/v1/remediation-plans/{plan_id}/execute",
            headers=developer_headers,
        )
        assert res_exec.status_code == 200
        assert res_exec.json()["status"] == "verification_pending"

        # 5. Independent verification (Test failure scenario)
        res_fail_ver = await client.post(
            f"/api/v1/remediation-plans/{plan_id}/verify",
            json={
                "test_run_passed": False,
                "scanner_verified_clean": False,
                "evidence_notes": "Unit tests failed: TypeError in SHA256 instantiation.",
            },
            headers=developer_headers,
        )
        assert res_fail_ver.status_code == 200
        assert res_fail_ver.json()["verification_status"] == "FAILED"
        assert res_fail_ver.json()["finding_status"] == "IN_REMEDIATION"

        # 6. Independent verification (Successful fix scenario)
        res_pass_ver = await client.post(
            f"/api/v1/remediation-plans/{plan_id}/verify",
            json={
                "test_run_passed": True,
                "scanner_verified_clean": True,
                "evidence_notes": (
                    "Independent Semgrep re-scan passed with zero findings. "
                    "Pytest test suite passed."
                ),
            },
            headers=developer_headers,
        )
        assert res_pass_ver.status_code == 200
        assert res_pass_ver.json()["verification_status"] == "VERIFIED"
        assert res_pass_ver.json()["finding_status"] == "RESOLVED"
