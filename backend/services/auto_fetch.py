"""Snapeous - Auto-fetch backlinks service.

Orchestrates: DataForSEO (backlink discovery) -> DB insert -> DomDetailer (metrics enrichment).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from sqlalchemy import select, func

from backend.config import settings
from backend.db.database import async_session
from backend.models.models import (
    Backlink, BacklinkStatus, BacklinkLinkType,
    Project, Subscription,
)
from backend.plans import get_plan_limits

logger = logging.getLogger(__name__)


def _extract_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def run_auto_fetch_for_project(project_id: str) -> dict:
    """Auto-fetch backlinks for a single project.

    1. Load project, verify auto_fetch_enabled
    2. Check plan capacity (max_backlinks - current count)
    3. Call DataForSEO /backlinks/backlinks/live
    4. Deduplicate against existing source_urls
    5. Insert new backlinks (capped by plan limit)
    6. Enrich with DomDetailer metrics
    7. Update project.auto_fetch_last_run / auto_fetch_status
    """
    async with async_session() as db:
        # 1. Load project
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project or not project.auto_fetch_enabled:
            return {"skipped": True, "reason": "not_enabled"}

        # Mark as running
        project.auto_fetch_status = "running"
        await db.commit()

        try:
            # 2. Plan limits
            sub_result = await db.execute(
                select(Subscription).where(Subscription.user_id == project.user_id)
            )
            sub = sub_result.scalar_one_or_none()
            plan_name = "free"
            if sub:
                plan_name = sub.plan if isinstance(sub.plan, str) else sub.plan.value
            limits = get_plan_limits(plan_name)
            max_backlinks = limits["max_backlinks"]

            count_result = await db.execute(
                select(func.count(Backlink.id)).where(Backlink.project_id == project_id)
            )
            current_count = count_result.scalar() or 0
            remaining = max(0, max_backlinks - current_count)

            if remaining == 0:
                project.auto_fetch_status = "completed"
                project.auto_fetch_last_run = _utcnow()
                await db.commit()
                return {"skipped": True, "reason": "plan_limit_reached", "current": current_count, "max": max_backlinks}

            # 3. Fetch from DataForSEO
            from backend.services.dataforseo_domain import fetch_backlinks_list

            fetch_limit = min(remaining, 1000)
            raw_backlinks = await fetch_backlinks_list(project.client_domain, limit=fetch_limit)

            if not raw_backlinks:
                project.auto_fetch_status = "completed"
                project.auto_fetch_last_run = _utcnow()
                await db.commit()
                logger.info(f"[AUTO-FETCH] Project {project_id}: DataForSEO returned no backlinks")
                return {"fetched": 0, "created": 0}

            # 4. Deduplicate
            existing_result = await db.execute(
                select(Backlink.source_url).where(Backlink.project_id == project_id)
            )
            existing_urls = {row[0] for row in existing_result.all()}

            new_backlinks = []
            seen = set()
            for bl_data in raw_backlinks:
                url = bl_data["source_url"].strip()
                if not url or url in existing_urls or url in seen:
                    continue
                seen.add(url)
                new_backlinks.append(bl_data)
                if len(new_backlinks) >= remaining:
                    break

            # 5. Insert new backlinks
            created_ids = []
            now = _utcnow()
            for bl_data in new_backlinks:
                link_type = bl_data.get("link_type", "dofollow")
                status = BacklinkStatus.active
                if bl_data.get("http_code") and bl_data["http_code"] >= 400:
                    status = BacklinkStatus.lost

                backlink = Backlink(
                    project_id=project_id,
                    source_url=bl_data["source_url"],
                    target_url=bl_data.get("target_url"),
                    anchor_text=bl_data.get("anchor_text"),
                    source_domain=bl_data.get("source_domain") or _extract_domain(bl_data["source_url"]),
                    target_domain=bl_data.get("target_domain") or project.client_domain,
                    http_code=bl_data.get("http_code"),
                    links_on_page=bl_data.get("links_on_page"),
                    link_type=link_type,
                    status=status,
                    domain_rank=bl_data.get("domain_rank"),
                    first_check_at=now,
                    last_check_at=now,
                )
                db.add(backlink)
                await db.flush()
                created_ids.append(backlink.id)

            await db.commit()

            # 6. DomDetailer metrics enrichment (if available)
            if created_ids and settings.has_domdetailer:
                try:
                    from backend.services.domdetailer import fetch_metrics_batch
                    await fetch_metrics_batch(created_ids, batch_size=5)
                except Exception as e:
                    logger.error(f"[AUTO-FETCH] DomDetailer error for project {project_id}: {e}")

            # 7. Update project
            project.auto_fetch_status = "completed"
            project.auto_fetch_last_run = _utcnow()
            await db.commit()

            logger.info(
                f"[AUTO-FETCH] Project {project_id}: fetched={len(raw_backlinks)}, "
                f"created={len(created_ids)}, skipped={len(raw_backlinks) - len(new_backlinks)}"
            )
            return {
                "fetched": len(raw_backlinks),
                "created": len(created_ids),
                "duplicates_skipped": len(raw_backlinks) - len(new_backlinks),
            }

        except Exception as e:
            logger.error(f"[AUTO-FETCH] Error for project {project_id}: {e}")
            project.auto_fetch_status = "failed"
            await db.commit()
            return {"error": str(e)}


async def run_auto_fetch_all() -> dict:
    """Run auto-fetch for all eligible projects.

    Eligible: auto_fetch_enabled=True AND
    (auto_fetch_last_run IS NULL OR auto_fetch_last_run < 30 days ago)
    """
    async with async_session() as db:
        cutoff = _utcnow() - timedelta(days=30)

        result = await db.execute(
            select(Project.id).where(
                Project.auto_fetch_enabled == True,
                Project.auto_fetch_status != "running",
                (
                    (Project.auto_fetch_last_run == None) |
                    (Project.auto_fetch_last_run < cutoff)
                ),
            )
        )
        project_ids = [row[0] for row in result.all()]

    logger.info(f"[AUTO-FETCH] Found {len(project_ids)} projects due for auto-fetch")

    results = {}
    for pid in project_ids:
        results[pid] = await run_auto_fetch_for_project(pid)
        await asyncio.sleep(2)  # Rate limiting between projects

    return results
