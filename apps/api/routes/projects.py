from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.auth import require_permission
from apps.api.database import get_db_session
from apps.api.models import Project
from apps.api.repositories import TenantScopedRepository
from apps.api.tenancy import TenantContext

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    criticality: str = Field(default="MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")


class ProjectResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    criticality: str
    created_at: str

    model_config = {"from_attributes": True}


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Tenant Project",
)
async def create_project(
    payload: CreateProjectRequest,
    tenant_context: TenantContext = Depends(require_permission("projects:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    project = await repo.create_project(
        name=payload.name,
        slug=payload.slug,
        criticality=payload.criticality,
    )
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        name=project.name,
        slug=project.slug,
        criticality=project.criticality.value,
        created_at=project.created_at.isoformat(),
    )


@router.get(
    "",
    response_model=List[ProjectResponse],
    status_code=status.HTTP_200_OK,
    summary="List Tenant Projects",
)
async def list_projects(
    tenant_context: TenantContext = Depends(require_permission("projects:read")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    projects = await repo.list_projects()
    return [
        ProjectResponse(
            id=p.id,
            organization_id=p.organization_id,
            name=p.name,
            slug=p.slug,
            criticality=p.criticality.value,
            created_at=p.created_at.isoformat(),
        )
        for p in projects
    ]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Project by ID",
)
async def get_project(
    project_id: str,
    tenant_context: TenantContext = Depends(require_permission("projects:read")),
    session: AsyncSession = Depends(get_db_session),
):
    repo = TenantScopedRepository(session, tenant_context)
    project = await repo.get_by_id(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        name=project.name,
        slug=project.slug,
        criticality=project.criticality.value,
        created_at=project.created_at.isoformat(),
    )
