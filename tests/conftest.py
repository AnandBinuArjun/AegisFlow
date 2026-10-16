import asyncio

import pytest

from apps.api.database import Base, engine


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """
    Autouse session fixture ensuring all database tables (organizations, projects,
    users, findings, etc.) are created before any test suite runs.
    """

    async def _init():
        async with engine.begin() as conn:
            import apps.api.models  # noqa: F401

            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_init())
    yield
