"""DomDetailer API service for domain metrics."""

import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import select

from backend.config import settings
from backend.db.database import async_session


DOMDETAILER_BASE_URL = "https://domdetailer.com/api"


def _safe_int(val) -> Optional[int]:
    """Safely convert a value to int (API may return strings like '45')."""
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


async def fetch_domain_metrics(domain: str) -> Optional[Dict[str, Any]]:
    """Fetch domain metrics from DomDetailer API (checkDomain v2).

    Returns 12 metrics mapped from Moz / Majestic / Pretty stats:
    - Domain Rank (mozDA)
    - URL Rank (mozPA)
    - Backlinks count (majesticLinks)
    - Referring domains (majesticRefDomains)
    - Dofollow backlinks (prettyLinksDofollow)
    - Nofollow backlinks (computed)
    - Gov backlinks (prettyLinksGov)
    - Edu backlinks (prettyLinksEdu)
    - Dofollow referring (N/A)
    - Nofollow referring (N/A)
    - Gov referring (majesticRefGov)
    - Edu referring (majesticRefEdu)
    """
    if not settings.has_domdetailer or not domain:
        return None

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{DOMDETAILER_BASE_URL}/checkDomain.php",
                params={
                    "apikey": settings.domdetailer_api_key,
                    "domain": domain,
                    "app": "Snapeous",
                }
            )

            print(f"[DomDetailer] checkDomain for {domain}: status={response.status_code}")

            if response.status_code == 200:
                data = response.json()

                # Compute nofollow = total - dofollow
                total_backlinks = _safe_int(data.get("majesticLinks"))
                dofollow = _safe_int(data.get("prettyLinksDofollow"))
                nofollow = None
                if total_backlinks is not None and dofollow is not None:
                    nofollow = max(0, total_backlinks - dofollow)

                # Map DomDetailer Moz/Majestic/Pretty response to our model
                return {
                    "domain_rank": _safe_int(data.get("mozDA")),
                    "url_rank": _safe_int(data.get("mozPA")),
                    "backlinks_count": total_backlinks,
                    "referring_domains": _safe_int(data.get("majesticRefDomains")),
                    "dofollow_backlinks": dofollow,
                    "nofollow_backlinks": nofollow,
                    "gov_backlinks": _safe_int(data.get("prettyLinksGov")),
                    "edu_backlinks": _safe_int(data.get("prettyLinksEdu")),
                    "dofollow_referring": None,  # Not available from API
                    "nofollow_referring": None,  # Not available from API
                    "gov_referring": _safe_int(data.get("majesticRefGov")),
                    "edu_referring": _safe_int(data.get("majesticRefEdu")),
                }
            else:
                print(f"[DomDetailer] Error response: {response.text[:200]}")

    except Exception as e:
        print(f"[DomDetailer] Error fetching metrics for {domain}: {e}")

    return None


async def check_domain_authority(domain: str) -> Optional[int]:
    """Get only Domain Rank (DA) for a domain."""
    metrics = await fetch_domain_metrics(domain)
    if metrics:
        return metrics.get("domain_rank")
    return None


async def fetch_metrics_batch(backlink_ids: list[str], batch_size: int = 5):
    """Fetch domain metrics for multiple backlinks in batches."""
    if not settings.has_domdetailer:
        return

    from backend.models.models import Backlink

    async with async_session() as db:
        for i in range(0, len(backlink_ids), batch_size):
            batch = backlink_ids[i:i + batch_size]

            for backlink_id in batch:
                try:
                    result = await db.execute(
                        select(Backlink).where(Backlink.id == backlink_id)
                    )
                    backlink = result.scalar_one_or_none()

                    if backlink and backlink.source_domain:
                        metrics = await fetch_domain_metrics(backlink.source_domain)

                        if metrics:
                            backlink.domain_rank = metrics.get("domain_rank")
                            backlink.url_rank = metrics.get("url_rank")
                            backlink.backlinks_count = metrics.get("backlinks_count")
                            backlink.referring_domains = metrics.get("referring_domains")
                            backlink.dofollow_backlinks = metrics.get("dofollow_backlinks")
                            backlink.nofollow_backlinks = metrics.get("nofollow_backlinks")
                            backlink.gov_backlinks = metrics.get("gov_backlinks")
                            backlink.edu_backlinks = metrics.get("edu_backlinks")
                            backlink.dofollow_referring = metrics.get("dofollow_referring")
                            backlink.nofollow_referring = metrics.get("nofollow_referring")
                            backlink.gov_referring = metrics.get("gov_referring")
                            backlink.edu_referring = metrics.get("edu_referring")
                            backlink.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                            print(f"[DomDetailer] Updated metrics for backlink {backlink_id} (DR={metrics.get('domain_rank')})")
                except Exception as e:
                    print(f"[DomDetailer] Error in batch for backlink {backlink_id}: {e}")

            await db.commit()
            await asyncio.sleep(1)  # Rate limiting between batches


async def fetch_backlinks(domain: str) -> Optional[Dict[str, Any]]:
    """Fetch backlinks from DomDetailer getBacklinks API.

    Returns dict with:
    - 'backlinks': list of {anchor, title, nf, source, target}
    - 'metrics': {page_count, links_in, links_out, backlinks_follow,
                  backlinks_nofollow, nofollow_ratio, ref_domains,
                  links_from_gov, links_from_edu}

    Costs 3 credits per call. Returns up to 5,000 backlinks.
    Uses onePerDomain=1 to deduplicate by referring domain.
    """
    if not settings.has_domdetailer or not domain:
        return None

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(
                "https://domdetailer.com/api2/getBacklinks.php",
                params={
                    "apikey": settings.domdetailer_api_key,
                    "app": "Snapeous",
                    "domain": domain,
                    "onePerDomain": "1",
                },
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "backlinks": data.get("backlinks", []),
                    "metrics": data.get("metrics", {}),
                }
            else:
                print(f"[DomDetailer] getBacklinks returned HTTP {response.status_code} for {domain}")

    except Exception as e:
        print(f"[DomDetailer] Error fetching backlinks for {domain}: {e}")

    return None
