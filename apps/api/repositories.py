from typing import Any, Dict, List, Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.database import Base
from apps.api.models import (
    AuditEvent,
    Finding,
    Project,
)
from apps.api.tenancy import TenantContext

T = TypeVar("T", bound=Base)


class TenantScopedRepository:
    """
    SEC-IAM-02 & Non-negotiable Rule #4 Enforcement:
    Centralized data-access abstraction where EVERY query is strictly tenant-scoped.
    """

    def __init__(self, session: AsyncSession, tenant_context: TenantContext):
        self.session = session
        self.tenant_context = tenant_context

    async def get_by_id(self, model_cls: Type[T], record_id: str) -> Optional[T]:
        """
        Retrieves a record strictly within the caller's tenant boundary.
        Returns None if ID does not exist OR belongs to another tenant.
        """
        stmt = select(model_cls).where(
            model_cls.id == record_id,  # type: ignore[attr-defined]
            model_cls.organization_id == self.tenant_context.organization_id,  # type: ignore[attr-defined]
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_projects(self) -> List[Project]:
        stmt = (
            select(Project)
            .where(Project.organization_id == self.tenant_context.organization_id)
            .order_by(Project.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_project(self, name: str, slug: str, criticality: str = "MEDIUM") -> Project:
        from apps.api.models import AssetCriticality

        project = Project(
            organization_id=self.tenant_context.organization_id,
            name=name,
            slug=slug,
            criticality=AssetCriticality(criticality),
        )
        self.session.add(project)
        await self.session.flush()

        await self.record_audit(
            action="project:create",
            resource_type="project",
            resource_id=project.id,
            details={"name": name, "slug": slug, "criticality": criticality},
        )
        return project

    async def list_findings(self, project_id: Optional[str] = None) -> List[Finding]:
        stmt = select(Finding).where(Finding.organization_id == self.tenant_context.organization_id)
        if project_id:
            stmt = stmt.where(Finding.project_id == project_id)
        stmt = stmt.order_by(Finding.last_seen_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_audit_events(self, limit: int = 100) -> List[AuditEvent]:
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.organization_id == self.tenant_context.organization_id)
            .order_by(AuditEvent.timestamp.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def record_audit(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        event = AuditEvent(
            organization_id=self.tenant_context.organization_id,
            actor_user_id=self.tenant_context.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
        )
        self.session.add(event)
        await self.session.flush()
        return event
