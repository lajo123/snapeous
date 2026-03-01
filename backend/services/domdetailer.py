"""DomDetailer API service for domain metrics."""

import httpx
from typing import Optional, Dict, Any

from backend.config import settings


DOMDETAILER_BASE_URL = "https://domdetailer.com/api"


async def fetch_domain_metrics(domain: str) -> Optional[Dict[str, Any]]:
    """Fetch domain metrics from DomDetailer API.
    
    Returns 12 metrics:
    - Domain Rank (DR)
    - URL Rank (UR)
    - Backlinks count
    - Referring domains
    - Dofollow backlinks
    - Nofollow backlinks
    - Gov backlinks
    - Edu backlinks
    - Dofollow referring
    - Nofollow referring
    - Gov referring
    - Edu referring
    """
    if not settings.has_domdetailer or not domain:
        return None

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{DOMDETAILER_BASE_URL}/check",
                params={
                    "api_key": settings.domdetailer_api_key,
                    "domain": domain,
                    "format": "json"
                }
            )

            if response.status_code == 200:
                data = response.json()

                # Map DomDetailer response to our model
                return {
                    "domain_rank": data.get("dr") or data.get("domain_rating"),
                    "url_rank": data.get("ur") or data.get("url_rating"),
                    "backlinks_count": data.get("backlinks") or data.get("total_backlinks"),
                    "referring_domains": data.get("ref_domains") or data.get("referring_domains"),
                    "dofollow_backlinks": data.get("dofollow_backlinks"),
                    "nofollow_backlinks": data.get("nofollow_backlinks"),
                    "gov_backlinks": data.get("gov_backlinks"),
                    "edu_backlinks": data.get("edu_backlinks"),
                    "dofollow_referring": data.get("dofollow_ref_domains"),
                    "nofollow_referring": data.get("nofollow_ref_domains"),
                    "gov_referring": data.get("gov_ref_domains"),
                    "edu_referring": data.get("edu_ref_domains"),
                }

    except Exception as e:
        print(f"Error fetching metrics for {domain}: {e}")

    return None


async def check_domain_authority(domain: str) -> Optional[int]:
    """Get only Domain Rank (DR) for a domain."""
    metrics = await fetch_domain_metrics(domain)
    if metrics:
        return metrics.get("domain_rank")
    return None


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
                    "app": "SpotSEO",
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
