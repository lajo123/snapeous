"""Backlink checker service - validates backlinks HTTP status."""

import asyncio
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import async_session
from backend.models.models import Backlink, BacklinkStatus
from backend.services.backlink_history import record_history


async def check_single_backlink(backlink_id: str):
    """Check HTTP status of a single backlink."""
    async with async_session() as db:
        result = await db.execute(select(Backlink).where(Backlink.id == backlink_id))
        backlink = result.scalar_one_or_none()

        if not backlink:
            return

        old_status = backlink.status
        old_http_code = backlink.http_code

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.head(backlink.source_url)

                # If HEAD fails, try GET
                if response.status_code >= 400:
                    response = await client.get(backlink.source_url)

                backlink.http_code = response.status_code

                # Determine status based on HTTP code
                if response.status_code == 200:
                    backlink.status = BacklinkStatus.active
                elif response.status_code in [301, 302, 307, 308]:
                    backlink.status = BacklinkStatus.active  # Redirect but exists
                elif response.status_code == 404:
                    backlink.status = BacklinkStatus.lost
                else:
                    backlink.status = BacklinkStatus.pending

                backlink.last_check_at = datetime.now(timezone.utc)

                # Record history if status or http_code changed
                if str(backlink.status) != str(old_status):
                    await record_history(
                        db, backlink, "status_changed",
                        old_status=str(old_status) if old_status else None,
                        new_status=str(backlink.status),
                        old_http_code=old_http_code,
                        new_http_code=backlink.http_code,
                    )
                elif backlink.http_code != old_http_code:
                    await record_history(
                        db, backlink, "http_changed",
                        old_http_code=old_http_code,
                        new_http_code=backlink.http_code,
                    )

                await db.commit()

        except Exception as e:
            backlink.http_code = None
            new_status = BacklinkStatus.lost
            if str(new_status) != str(old_status):
                await record_history(
                    db, backlink, "status_changed",
                    old_status=str(old_status) if old_status else None,
                    new_status=str(new_status),
                    old_http_code=old_http_code,
                    details=str(e),
                )
            backlink.status = new_status
            backlink.last_check_at = datetime.now(timezone.utc)
            await db.commit()


async def check_backlinks_batch(backlink_ids: list[str], batch_size: int = 10):
    """Check HTTP status of multiple backlinks in batches."""
    for i in range(0, len(backlink_ids), batch_size):
        batch = backlink_ids[i:i + batch_size]
        tasks = [check_single_backlink(bid) for bid in batch]
        await asyncio.gather(*tasks, return_exceptions=True)
        await asyncio.sleep(1)  # Rate limiting


async def count_links_on_page(url: str) -> int:
    """Count total links on a page."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('a', href=True)
                return len(links)
    except Exception:
        pass
    return 0
