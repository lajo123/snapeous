"""SpeedyIndex API service for Google indexation checks."""

import asyncio
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import settings
from backend.db.database import async_session
from backend.models.models import Backlink


SPEEDYINDEX_BASE_URL = "https://api.speedyindex.com"


async def check_indexation_status(url: str) -> bool:
    """Check if a URL is indexed by Google using SpeedyIndex API."""
    if not settings.has_speedyindex:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SPEEDYINDEX_BASE_URL}/v1/check",
                headers={
                    "Authorization": f"Bearer {settings.speedyindex_api_key}",
                    "Content-Type": "application/json"
                },
                json={"url": url}
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("indexed", False)

    except Exception as e:
        print(f"Error checking indexation for {url}: {e}")

    return None


async def check_indexation_batch(backlink_ids: list[str], batch_size: int = 10):
    """Check indexation for multiple backlinks."""
    if not settings.has_speedyindex:
        return

    async with async_session() as db:
        for i in range(0, len(backlink_ids), batch_size):
            batch = backlink_ids[i:i + batch_size]

            for backlink_id in batch:
                result = await db.execute(select(Backlink).where(Backlink.id == backlink_id))
                backlink = result.scalar_one_or_none()

                if backlink and backlink.source_url:
                    is_indexed = await check_indexation_status(backlink.source_url)

                    if is_indexed is not None:
                        backlink.is_indexed = is_indexed
                        backlink.index_checked_at = datetime.now(timezone.utc)

            await db.commit()
            await asyncio.sleep(1)  # Rate limiting


async def submit_for_indexation(url: str) -> bool:
    """Submit a URL for Google indexation via SpeedyIndex."""
    if not settings.has_speedyindex:
        return False

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SPEEDYINDEX_BASE_URL}/v1/submit",
                headers={
                    "Authorization": f"Bearer {settings.speedyindex_api_key}",
                    "Content-Type": "application/json"
                },
                json={"url": url}
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("success", False)

    except Exception as e:
        print(f"Error submitting {url} for indexation: {e}")

    return False
