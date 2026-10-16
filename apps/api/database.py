import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from apps.api.config import get_settings

settings = get_settings()

# Ensure local data directory exists if using sqlite
if "sqlite" in settings.DATABASE_URL:
    os.makedirs("./local_data", exist_ok=True)

# Async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development" and settings.LOG_LEVEL == "DEBUG"),
    future=True,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy entities in AegisFlow."""

    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing tenant-scoped or transactional DB sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
