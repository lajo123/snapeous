"""Service for recording backlink state changes."""

from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.models import Backlink, BacklinkHistory


async def record_history(
    db: AsyncSession,
    backlink: Backlink,
    event_type: str,
    old_status: str = None,
    new_status: str = None,
    old_http_code: int = None,
    new_http_code: int = None,
    details: str = None,
):
    """Record a history entry for a backlink state change."""
    entry = BacklinkHistory(
        backlink_id=backlink.id,
        event_type=event_type,
        old_status=old_status,
        new_status=new_status,
        old_http_code=old_http_code,
        new_http_code=new_http_code,
        domain_rank_snapshot=backlink.domain_rank,
        is_indexed_snapshot=backlink.is_indexed,
        details=details,
    )
    db.add(entry)
