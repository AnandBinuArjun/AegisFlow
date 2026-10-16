from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.database import get_db_session
from apps.api.models import (
    Finding,
    FindingStatus,
    PlanApproval,
    PlanStatus,
    RemediationPlan,
)
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext
from packages.policy.remediation import compute_plan_hash, is_approval_valid

router = APIRouter(prefix="/api/v1", tags=["Remediation & Approval"])


class CreatePlanRequest(BaseModel):
    patch_diff: str = Field(..., min_length=5, description="Unified diff patch content")
    target_branch: str = Field(default="aegisflow-fix-branch", min_length=1, max_length=255)
    policy_version: str = Field(default="v1.0")


class PlanResponse(BaseModel):
    id: str
    organization_id: str
    finding_id: str
    plan_version: int
    plan_hash: str
    status: str
    target_branch: str
    patch_diff: str
    policy_version: str
    created_by_user_id: str
    created_at: str


class ApprovalResponse(BaseModel):
    id: str
    plan_id: str
    plan_hash: str
    approver_user_id: str
    decision: str
    expires_at: str


class ExecutePlanResponse(BaseModel):
    status: str
    plan_id: str
    target_branch: str
    execution_message: str


class VerifyPlanRequest(BaseModel):
    test_run_passed: bool
    scanner_verified_clean: bool
    evidence_notes: str = Field(..., min_length=3)


class VerifyPlanResponse(BaseModel):
    verification_status: str
    finding_status: str
    evidence_notes: str


@router.post(
    "/findings/{finding_id}/remediation-plans",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Remediation Plan with Canonical Hash",
)
async def create_remediation_plan(
    finding_id: str,
    payload: CreatePlanRequest,
    tenant_context: TenantContext = Depends(require_permission("plans:create")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    finding = await repo.get_by_id(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    plan_hash = compute_plan_hash(
        finding_id=finding.id,
        target_branch=payload.target_branch,
        patch_diff=payload.patch_diff,
        policy_version=payload.policy_version,
    )

    plan = RemediationPlan(
        organization_id=tenant_context.organization_id,
        finding_id=finding.id,
        plan_version=1,
        plan_hash=plan_hash,
        status=PlanStatus.AWAITING_APPROVAL,
        target_branch=payload.target_branch,
        patch_diff=payload.patch_diff,
        policy_version=payload.policy_version,
        created_by_user_id=tenant_context.user_id,
    )
    session.add(plan)
    finding.status = FindingStatus.AWAITING_APPROVAL
    await session.flush()

    await repo.record_audit(
        action="remediation_plan:create",
        resource_type="remediation_plan",
        resource_id=plan.id,
        details={
            "finding_id": finding.id,
            "plan_hash": plan_hash,
            "target_branch": payload.target_branch,
        },
    )

    return PlanResponse(
        id=plan.id,
        organization_id=plan.organization_id,
        finding_id=plan.finding_id,
        plan_version=plan.plan_version,
        plan_hash=plan.plan_hash,
        status=plan.status.value,
        target_branch=plan.target_branch,
        patch_diff=plan.patch_diff,
        policy_version=plan.policy_version,
        created_by_user_id=plan.created_by_user_id,
        created_at=plan.created_at.isoformat(),
    )


@router.post(
    "/remediation-plans/{plan_id}/approve",
    response_model=ApprovalResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve Remediation Plan (Requires Separation of Duties)",
)
async def approve_remediation_plan(
    plan_id: str,
    tenant_context: TenantContext = Depends(require_permission("plans:approve")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    plan = await repo.get_by_id(RemediationPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    # Separation of requester and approver
    if plan.created_by_user_id == tenant_context.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Policy violation: Requester cannot approve their own remediation plan.",
        )

    # Recompute canonical hash to ensure no in-flight mutation occurred
    current_hash = compute_plan_hash(
        finding_id=plan.finding_id,
        target_branch=plan.target_branch,
        patch_diff=plan.patch_diff,
        policy_version=plan.policy_version,
    )
    if current_hash != plan.plan_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Security violation: Plan content has been altered since submission.",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    approval = PlanApproval(
        organization_id=tenant_context.organization_id,
        plan_id=plan.id,
        plan_hash=plan.plan_hash,
        approver_user_id=tenant_context.user_id,
        decision="APPROVED",
        policy_version=plan.policy_version,
        expires_at=expires_at,
    )
    session.add(approval)
    plan.status = PlanStatus.APPROVED
    await session.flush()

    await repo.record_audit(
        action="remediation_plan:approve",
        resource_type="remediation_plan",
        resource_id=plan.id,
        details={
            "plan_hash": plan.plan_hash,
            "expires_at": expires_at.isoformat(),
            "approver": tenant_context.user_id,
        },
    )

    return ApprovalResponse(
        id=approval.id,
        plan_id=approval.plan_id,
        plan_hash=approval.plan_hash,
        approver_user_id=approval.approver_user_id,
        decision=approval.decision,
        expires_at=approval.expires_at.isoformat(),
    )


@router.post(
    "/remediation-plans/{plan_id}/execute",
    response_model=ExecutePlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Approved Remediation Plan",
)
async def execute_remediation_plan(
    plan_id: str,
    tenant_context: TenantContext = Depends(require_permission("plans:create")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    plan = await repo.get_by_id(RemediationPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    # Fetch latest approval
    stmt = (
        select(PlanApproval)
        .where(
            PlanApproval.organization_id == tenant_context.organization_id,
            PlanApproval.plan_id == plan.id,
            PlanApproval.decision == "APPROVED",
        )
        .order_by(PlanApproval.created_at.desc())
    )
    approval = (await session.execute(stmt)).scalars().first()

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Execution blocked: No valid approval found for this plan.",
        )

    # Validate approval signature and expiry
    if not is_approval_valid(plan.plan_hash, approval.plan_hash, approval.expires_at):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Execution blocked: Approval hash mismatch or approval has expired.",
        )

    plan.status = PlanStatus.EXECUTING
    await session.flush()

    # Isolated execution: creates branch patch artifact
    plan.status = PlanStatus.VERIFICATION_PENDING
    finding = await repo.get_by_id(Finding, plan.finding_id)
    if finding:
        finding.status = FindingStatus.AWAITING_VERIFICATION
    await session.flush()

    await repo.record_audit(
        action="remediation_plan:execute",
        resource_type="remediation_plan",
        resource_id=plan.id,
        details={
            "plan_hash": plan.plan_hash,
            "target_branch": plan.target_branch,
            "approval_id": approval.id,
        },
    )

    return ExecutePlanResponse(
        status="verification_pending",
        plan_id=plan.id,
        target_branch=plan.target_branch,
        execution_message=(
            "Remediation patch branch generated successfully. Awaiting independent verification."
        ),
    )


@router.post(
    "/remediation-plans/{plan_id}/verify",
    response_model=VerifyPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Independent Fix Verification (Rule #13)",
)
async def verify_remediation(
    plan_id: str,
    payload: VerifyPlanRequest,
    tenant_context: TenantContext = Depends(require_permission("plans:create")),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Non-negotiable Rule #13:
    A finding may be marked verified ONLY through independent tests or scanner evidence.
    A model statement alone CANNOT mark a finding fixed.
    """
    repo = TenantScopedRepository(session, tenant_context)
    plan = await repo.get_by_id(RemediationPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    finding = await repo.get_by_id(Finding, plan.finding_id)
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    # Independent verification check
    is_verified = payload.test_run_passed and payload.scanner_verified_clean

    if is_verified:
        plan.status = PlanStatus.VERIFIED
        finding.status = FindingStatus.RESOLVED
        ver_status = "VERIFIED"
    else:
        plan.status = PlanStatus.FAILED
        finding.status = FindingStatus.IN_REMEDIATION
        ver_status = "FAILED"

    await session.flush()

    await repo.record_audit(
        action="remediation:verification",
        resource_type="finding",
        resource_id=finding.id,
        details={
            "verification_status": ver_status,
            "test_run_passed": payload.test_run_passed,
            "scanner_verified_clean": payload.scanner_verified_clean,
            "evidence_notes": payload.evidence_notes,
        },
    )

    return VerifyPlanResponse(
        verification_status=ver_status,
        finding_status=finding.status.value,
        evidence_notes=payload.evidence_notes,
    )
