"""Identity, tenancy, and data model

Revision ID: 0002_identity_and_tenancy
Revises: 0001_initial
Create Date: 2026-10-16 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_identity_and_tenancy'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_system_admin', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 3. Memberships
    op.create_table(
        'memberships',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_memberships_org_user', 'memberships', ['organization_id', 'user_id'], unique=True)
    op.create_index('ix_memberships_org_id', 'memberships', ['organization_id'])

    # 4. Projects
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('criticality', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_projects_org_slug', 'projects', ['organization_id', 'slug'], unique=True)
    op.create_index('ix_projects_org_id', 'projects', ['organization_id'])

    # 5. Repositories
    op.create_table(
        'repositories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('remote_url', sa.String(length=500), nullable=False),
        sa.Column('default_branch', sa.String(length=100), default='main', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_repositories_org_id', 'repositories', ['organization_id'])

    # 6. Scans
    op.create_table(
        'scans',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('repository_id', sa.String(length=36), sa.ForeignKey('repositories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scanner_name', sa.String(length=100), nullable=False),
        sa.Column('scanner_version', sa.String(length=100), nullable=True),
        sa.Column('commit_sha', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('raw_payload_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_scans_org_id', 'scans', ['organization_id'])

    # 7. Findings
    op.create_table(
        'findings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('repository_id', sa.String(length=36), sa.ForeignKey('repositories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('fingerprint', sa.String(length=64), nullable=False),
        sa.Column('rule_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('line_start', sa.Integer(), nullable=True),
        sa.Column('line_end', sa.Integer(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_findings_fingerprint', 'findings', ['organization_id', 'project_id', 'fingerprint'], unique=True)
    op.create_index('ix_findings_org_id', 'findings', ['organization_id'])

    # 8. Finding Occurrences
    op.create_table(
        'finding_occurrences',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('finding_id', sa.String(length=36), sa.ForeignKey('findings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scan_id', sa.String(length=36), sa.ForeignKey('scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('commit_sha', sa.String(length=64), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_finding_occurrences_org_id', 'finding_occurrences', ['organization_id'])

    # 9. Remediation Plans
    op.create_table(
        'remediation_plans',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('finding_id', sa.String(length=36), sa.ForeignKey('findings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_version', sa.Integer(), default=1, nullable=False),
        sa.Column('plan_hash', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('target_branch', sa.String(length=255), nullable=False),
        sa.Column('patch_diff', sa.Text(), nullable=False),
        sa.Column('policy_version', sa.String(length=50), default='v1.0', nullable=False),
        sa.Column('created_by_user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_remediation_plans_org_id', 'remediation_plans', ['organization_id'])

    # 10. Plan Approvals
    op.create_table(
        'plan_approvals',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_id', sa.String(length=36), sa.ForeignKey('remediation_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_hash', sa.String(length=64), nullable=False),
        sa.Column('approver_user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('policy_version', sa.String(length=50), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_plan_approvals_org_id', 'plan_approvals', ['organization_id'])

    # 11. Audit Events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_user_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=False),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_events_org_id', 'audit_events', ['organization_id'])
    op.create_index('ix_audit_events_action', 'audit_events', ['action'])


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('plan_approvals')
    op.drop_table('remediation_plans')
    op.drop_table('finding_occurrences')
    op.drop_table('findings')
    op.drop_table('scans')
    op.drop_table('repositories')
    op.drop_table('projects')
    op.drop_table('memberships')
    op.drop_table('users')
    op.drop_table('organizations')
