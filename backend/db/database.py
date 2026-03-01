"""SpotSEO - Database engine and session management (async SQLite)"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
import os

from backend.config import settings

# Ensure data directory exists
os.makedirs("data", exist_ok=True)


def _set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable WAL mode and set busy timeout for concurrent access."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=10000")  # 10 seconds retry
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

# Register the pragma listener on the sync engine
event.listen(engine.sync_engine, "connect", _set_sqlite_pragma)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables if they don't exist."""
    from backend.models.models import (  # noqa: F401
        Project, Footprint, Search, Spot, Backlink, BacklinkHistory
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
