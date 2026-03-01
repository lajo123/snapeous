"""SpeedyIndex API v2 service for Google indexation checks."""

import asyncio
import httpx
from datetime import datetime, timezone
from typing import Dict
from sqlalchemy import select

from backend.config import settings
from backend.db.database import async_session
from backend.models.models import Backlink


SPEEDYINDEX_BASE_URL = "https://api.speedyindex.com"


async def check_indexation_urls(urls: list[str]) -> Dict[str, bool]:
    """Check indexation for multiple URLs via SpeedyIndex v2 API.

    Uses the task-based flow:
    1. Create checker task -> get task_id
    2. Poll status until completed
    3. Download full report -> indexed/unindexed lists

    Returns dict mapping url -> is_indexed (True/False).
    """
    if not settings.has_speedyindex or not urls:
        return {}

    headers = {
        "Authorization": settings.speedyindex_api_key,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Step 1: Create checker task
            print(f"[SpeedyIndex] Creating checker task for {len(urls)} URLs")
            create_resp = await client.post(
                f"{SPEEDYINDEX_BASE_URL}/v2/task/google/checker/create",
                headers=headers,
                json={"urls": urls},
            )

            if create_resp.status_code != 200:
                print(f"[SpeedyIndex] Create task failed: HTTP {create_resp.status_code} - {create_resp.text[:200]}")
                return {}

            create_data = create_resp.json()
            task_id = create_data.get("task_id")
            if not task_id:
                print(f"[SpeedyIndex] No task_id in response: {create_data}")
                return {}

            print(f"[SpeedyIndex] Task created: {task_id}")

            # Step 2: Poll status (max ~60s: 20 polls x 3s)
            completed = False
            for attempt in range(20):
                await asyncio.sleep(3)

                try:
                    status_resp = await client.post(
                        f"{SPEEDYINDEX_BASE_URL}/v2/task/google/checker/status",
                        headers=headers,
                        json={"task_ids": [task_id]},
                    )

                    if status_resp.status_code == 200:
                        status_data = status_resp.json()
                        tasks = status_data.get("tasks", [])
                        if tasks and tasks[0].get("is_completed"):
                            completed = True
                            print(f"[SpeedyIndex] Task {task_id} completed after {(attempt + 1) * 3}s")
                            break
                except Exception as poll_err:
                    print(f"[SpeedyIndex] Poll error (attempt {attempt + 1}): {poll_err}")

            if not completed:
                print(f"[SpeedyIndex] Task {task_id} not completed after 60s, fetching partial results")

            # Step 3: Download full report
            report_resp = await client.post(
                f"{SPEEDYINDEX_BASE_URL}/v2/task/google/checker/fullreport",
                headers=headers,
                json={"task_id": task_id},
            )

            if report_resp.status_code != 200:
                print(f"[SpeedyIndex] Report failed: HTTP {report_resp.status_code} - {report_resp.text[:200]}")
                return {}

            report = report_resp.json()
            indexed_urls = set(report.get("indexed", []))
            unindexed_urls = set(report.get("unindexed", []))

            print(f"[SpeedyIndex] Report: {len(indexed_urls)} indexed, {len(unindexed_urls)} not indexed")

            # Build result dict
            result = {}
            for url in urls:
                if url in indexed_urls:
                    result[url] = True
                elif url in unindexed_urls:
                    result[url] = False
                # else: URL not in report (still processing), skip

            return result

    except Exception as e:
        print(f"[SpeedyIndex] Error checking indexation: {e}")
        return {}


async def check_indexation_batch(backlink_ids: list[str]):
    """Check indexation for multiple backlinks using SpeedyIndex v2.

    Submits all URLs in a single task for efficiency.
    """
    if not settings.has_speedyindex:
        return

    async with async_session() as db:
        # 1. Load all backlinks and collect source_urls
        url_to_ids: Dict[str, list[str]] = {}  # source_url -> [backlink_id, ...]

        for backlink_id in backlink_ids:
            try:
                result = await db.execute(
                    select(Backlink).where(Backlink.id == backlink_id)
                )
                backlink = result.scalar_one_or_none()
                if backlink and backlink.source_url:
                    url_to_ids.setdefault(backlink.source_url, []).append(backlink_id)
            except Exception as e:
                print(f"[SpeedyIndex] Error loading backlink {backlink_id}: {e}")

        if not url_to_ids:
            print("[SpeedyIndex] No URLs to check")
            return

        # 2. Check all URLs in one API call
        indexation_results = await check_indexation_urls(list(url_to_ids.keys()))

        if not indexation_results:
            print("[SpeedyIndex] No indexation results returned")
            return

        # 3. Update backlinks with results
        updated_count = 0
        for url, is_indexed in indexation_results.items():
            for bid in url_to_ids.get(url, []):
                try:
                    result = await db.execute(
                        select(Backlink).where(Backlink.id == bid)
                    )
                    backlink = result.scalar_one_or_none()
                    if backlink:
                        backlink.is_indexed = is_indexed
                        backlink.index_checked_at = datetime.now(timezone.utc).replace(tzinfo=None)
                        backlink.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                        updated_count += 1
                except Exception as e:
                    print(f"[SpeedyIndex] Error updating backlink {bid}: {e}")

        await db.commit()
        print(f"[SpeedyIndex] Updated indexation for {updated_count} backlinks")


async def submit_for_indexation(url: str) -> bool:
    """Submit a URL for Google indexation via SpeedyIndex v2."""
    if not settings.has_speedyindex:
        return False

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SPEEDYINDEX_BASE_URL}/v2/task/google/indexer/create",
                headers={
                    "Authorization": settings.speedyindex_api_key,
                    "Content-Type": "application/json",
                },
                json={"urls": [url]},
            )

            if response.status_code == 200:
                data = response.json()
                success = data.get("code") == 0
                if success:
                    print(f"[SpeedyIndex] Submitted {url} for indexation, task_id={data.get('task_id')}")
                else:
                    print(f"[SpeedyIndex] Submit failed for {url}: {data}")
                return success
            else:
                print(f"[SpeedyIndex] Submit HTTP {response.status_code} for {url}")

    except Exception as e:
        print(f"[SpeedyIndex] Error submitting {url} for indexation: {e}")

    return False
