"""DataForSEO API service – backlinks, WHOIS, technologies, anchors, referring domains, history, competitors."""

import base64
import httpx
from typing import Optional, Dict, Any, List

from backend.config import settings


DATAFORSEO_BASE_URL = "https://api.dataforseo.com/v3"
_HEADERS_CACHE: Dict[str, str] | None = None


def _headers() -> Dict[str, str]:
    creds = f"{settings.dataforseo_login}:{settings.dataforseo_password}"
    encoded = base64.b64encode(creds.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _get_auth_header() -> str:
    return _headers()["Authorization"]


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return round(float(val), 2)
    except (ValueError, TypeError):
        return None


def _top_entries(obj: dict | None, limit: int = 10) -> dict:
    if not obj or not isinstance(obj, dict):
        return {}
    sorted_items = sorted(obj.items(), key=lambda x: x[1] or 0, reverse=True)
    return dict(sorted_items[:limit])


async def _post(path: str, payload: list) -> Optional[dict]:
    """Generic POST helper – returns first result or None."""
    if not settings.has_dataforseo:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{DATAFORSEO_BASE_URL}{path}", headers=_headers(), json=payload)
            if resp.status_code != 200:
                print(f"[DataForSEO] {path} HTTP {resp.status_code}: {resp.text[:300]}")
                return None
            data = resp.json()
            tasks = data.get("tasks", [])
            if not tasks:
                return None
            task = tasks[0]
            if task.get("status_code") != 20000:
                print(f"[DataForSEO] {path} task error: {task.get('status_message')}")
                return None
            results = task.get("result", [])
            return results[0] if results else None
    except Exception as e:
        print(f"[DataForSEO] {path} exception: {e}")
        return None


async def _post_items(path: str, payload: list) -> Optional[List[dict]]:
    """POST helper – returns items list from first result."""
    if not settings.has_dataforseo:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{DATAFORSEO_BASE_URL}{path}", headers=_headers(), json=payload)
            if resp.status_code != 200:
                print(f"[DataForSEO] {path} HTTP {resp.status_code}")
                return None
            data = resp.json()
            tasks = data.get("tasks", [])
            if not tasks:
                return None
            task = tasks[0]
            if task.get("status_code") != 20000:
                print(f"[DataForSEO] {path} task error {task.get('status_code')}: {task.get('status_message')}")
                return None
            results = task.get("result", [])
            if not results:
                return None
            return results[0].get("items", [])
    except Exception as e:
        print(f"[DataForSEO] {path} exception: {e}")
        return None


async def fetch_backlinks_summary(domain: str) -> Optional[Dict[str, Any]]:
    """Backlinks summary – core backlink profile metrics."""
    if not domain:
        return None
    r = await _post("/backlinks/summary/live", [{
        "target": domain,
        "include_subdomains": True,
        "include_indirect_links": True,
        "internal_list_limit": 20,
        "backlinks_status_type": "live",
    }])
    if not r:
        return None
    print(f"[DataForSEO] backlinks/summary OK for {domain}")
    info = r.get("info") or {}
    return {
        "rank": _safe_int(r.get("rank")),
        "backlinks": _safe_int(r.get("backlinks")),
        "backlinks_spam_score": _safe_float(r.get("backlinks_spam_score")),
        "crawled_pages": _safe_int(r.get("crawled_pages")),
        "broken_backlinks": _safe_int(r.get("broken_backlinks")),
        "broken_pages": _safe_int(r.get("broken_pages")),
        "internal_links_count": _safe_int(r.get("internal_links_count")),
        "external_links_count": _safe_int(r.get("external_links_count")),
        "referring_domains": _safe_int(r.get("referring_domains")),
        "referring_domains_nofollow": _safe_int(r.get("referring_domains_nofollow")),
        "referring_main_domains": _safe_int(r.get("referring_main_domains")),
        "referring_main_domains_nofollow": _safe_int(r.get("referring_main_domains_nofollow")),
        "referring_ips": _safe_int(r.get("referring_ips")),
        "referring_subnets": _safe_int(r.get("referring_subnets")),
        "referring_pages": _safe_int(r.get("referring_pages")),
        "referring_pages_nofollow": _safe_int(r.get("referring_pages_nofollow")),
        "referring_links_tld": _top_entries(r.get("referring_links_tld"), 10),
        "referring_links_types": _top_entries(r.get("referring_links_types")),
        "referring_links_attributes": _top_entries(r.get("referring_links_attributes")),
        "referring_links_platform_types": _top_entries(r.get("referring_links_platform_types")),
        "referring_links_semantic_locations": _top_entries(r.get("referring_links_semantic_locations")),
        "referring_links_countries": _top_entries(r.get("referring_links_countries"), 15),
        "server_info": {
            "cms": info.get("cms"),
            "platform_type": info.get("platform_type", []),
            "server": info.get("server"),
            "ip_address": info.get("ip_address"),
            "country": info.get("country"),
            "is_ip": info.get("is_ip"),
            "target_spam_score": _safe_int(info.get("target_spam_score")),
        },
        "first_seen": r.get("first_seen"),
    }


# ── WHOIS ────────────────────────────────────────────────────────────────
async def fetch_whois(domain: str) -> Optional[Dict[str, Any]]:
    """WHOIS overview – domain age, expiry, registrar, organic traffic metrics."""
    if not domain:
        return None
    r = await _post("/domain_analytics/whois/overview/live", [{
        "target": domain,
        "limit": 1,
    }])
    if not r:
        return None
    items = r.get("items", [])
    if not items:
        return None
    w = items[0]
    print(f"[DataForSEO] whois OK for {domain}")
    metrics_organic = (w.get("metrics") or {}).get("organic") or {}
    metrics_paid = (w.get("metrics") or {}).get("paid") or {}
    return {
        "created_datetime": w.get("created_datetime"),
        "expiration_datetime": w.get("expiration_datetime"),
        "updated_datetime": w.get("updated_datetime"),
        "registrar": w.get("registrar"),
        "registered": w.get("registered"),
        "epp_status_codes": w.get("epp_status_codes"),
        "organic_etv": _safe_float(metrics_organic.get("etv")),
        "organic_count": _safe_int(metrics_organic.get("count")),
        "organic_estimated_paid_traffic_cost": _safe_float(metrics_organic.get("estimated_paid_traffic_cost")),
        "organic_pos_1": _safe_int(metrics_organic.get("pos_1")),
        "organic_pos_2_3": _safe_int(metrics_organic.get("pos_2_3")),
        "organic_pos_4_10": _safe_int(metrics_organic.get("pos_4_10")),
        "organic_pos_11_20": _safe_int(metrics_organic.get("pos_11_20")),
        "organic_pos_21_30": _safe_int(metrics_organic.get("pos_21_30")),
        "paid_etv": _safe_float(metrics_paid.get("etv")),
        "paid_count": _safe_int(metrics_paid.get("count")),
    }


# ── TECHNOLOGIES ─────────────────────────────────────────────────────────
async def fetch_technologies(domain: str) -> Optional[Dict[str, Any]]:
    """Domain technologies – CMS, frameworks, CDN, contact info, social profiles."""
    if not domain:
        return None
    r = await _post("/domain_analytics/technologies/domain_technologies/live", [{
        "target": domain,
        "limit": 1,
    }])
    if not r:
        return None
    items = r.get("items", [])
    if not items:
        return None
    t = items[0]
    print(f"[DataForSEO] technologies OK for {domain}")

    # Flatten technologies into simple category: [names]
    raw_techs = t.get("technologies") or {}
    tech_flat: Dict[str, list] = {}
    for category, subcats in raw_techs.items():
        if isinstance(subcats, dict):
            for subcat, techs in subcats.items():
                if isinstance(techs, list):
                    names = [tech.get("name") for tech in techs if isinstance(tech, dict) and tech.get("name")]
                    if names:
                        tech_flat[subcat] = names

    return {
        "title": t.get("title"),
        "description": t.get("description"),
        "meta_keywords": t.get("meta_keywords"),
        "domain_rank": _safe_int(t.get("domain_rank")),
        "last_visited": t.get("last_visited"),
        "country_iso_code": t.get("country_iso_code"),
        "language_code": t.get("language_code"),
        "content_language_code": t.get("content_language_code"),
        "phone_numbers": t.get("phone_numbers", []),
        "emails": t.get("emails", []),
        "social_graph_urls": t.get("social_graph_urls", []),
        "technologies": tech_flat,
    }


# ── TOP ANCHORS ──────────────────────────────────────────────────────────
async def fetch_top_anchors(domain: str, limit: int = 20) -> Optional[List[Dict[str, Any]]]:
    """Top anchor texts with backlink count."""
    if not domain:
        return None
    items = await _post_items("/backlinks/anchors/live", [{
        "target": domain,
        "include_subdomains": True,
        "limit": limit,
        "order_by": ["backlinks,desc"],
        "backlinks_status_type": "live",
    }])
    if not items:
        return None
    print(f"[DataForSEO] anchors OK for {domain} ({len(items)} anchors)")
    return [
        {
            "anchor": item.get("anchor", ""),
            "backlinks": _safe_int(item.get("backlinks")),
            "referring_domains": _safe_int(item.get("referring_domains")),
            "first_seen": item.get("first_seen"),
            "dofollow": _safe_int(item.get("referring_pages")) if item.get("referring_pages") else None,
        }
        for item in items if item.get("anchor")
    ]


# ── TOP REFERRING DOMAINS ────────────────────────────────────────────────
async def fetch_top_referring_domains(domain: str, limit: int = 20) -> Optional[List[Dict[str, Any]]]:
    """Top referring domains sorted by rank."""
    if not domain:
        return None
    items = await _post_items("/backlinks/referring_domains/live", [{
        "target": domain,
        "include_subdomains": True,
        "limit": limit,
        "order_by": ["rank,desc"],
        "backlinks_status_type": "live",
    }])
    if not items:
        return None
    print(f"[DataForSEO] referring_domains OK for {domain} ({len(items)} domains)")
    return [
        {
            "domain": item.get("domain", ""),
            "rank": _safe_int(item.get("rank")),
            "backlinks": _safe_int(item.get("backlinks")),
            "first_seen": item.get("first_seen"),
            "broken_backlinks": _safe_int(item.get("broken_backlinks")),
            "referring_pages": _safe_int(item.get("referring_pages")),
        }
        for item in items if item.get("domain")
    ]


# ── BACKLINK HISTORY ─────────────────────────────────────────────────────
async def fetch_backlinks_history(domain: str) -> Optional[List[Dict[str, Any]]]:
    """Monthly backlink history (last 12 months)."""
    if not domain:
        return None
    items = await _post_items("/backlinks/history/live", [{
        "target": domain,
        "include_subdomains": True,
        "date_from": None,  # API returns all available history
    }])
    if not items:
        return None
    # Keep last 12 entries
    items = items[-12:] if len(items) > 12 else items
    print(f"[DataForSEO] history OK for {domain} ({len(items)} points)")
    return [
        {
            "date": item.get("date"),
            "rank": _safe_int(item.get("rank")),
            "backlinks": _safe_int(item.get("backlinks")),
            "new_backlinks": _safe_int(item.get("new_backlinks")),
            "lost_backlinks": _safe_int(item.get("lost_backlinks")),
            "referring_domains": _safe_int(item.get("referring_domains")),
            "new_referring_domains": _safe_int(item.get("new_referring_domains")),
            "lost_referring_domains": _safe_int(item.get("lost_referring_domains")),
        }
        for item in items
    ]


# ── COMPETITORS ──────────────────────────────────────────────────────────
async def fetch_competitors(domain: str, limit: int = 10) -> Optional[List[Dict[str, Any]]]:
    """Domains competing for similar backlinks."""
    if not domain:
        return None
    items = await _post_items("/backlinks/competitors/live", [{
        "target": domain,
        "include_subdomains": True,
        "limit": limit,
    }])
    if not items:
        return None
    print(f"[DataForSEO] competitors OK for {domain} ({len(items)} competitors)")
    return [
        {
            "domain": item.get("target", ""),
            "rank": _safe_int(item.get("rank")),
            "intersections": _safe_int(item.get("intersections")),
        }
        for item in items if item.get("target") and item.get("target") != domain
    ]


# ── RANKED KEYWORDS ─────────────────────────────────────────────────────
async def _fetch_ranked_keywords_labs(domain: str, limit: int) -> Optional[List[dict]]:
    """Try DataForSEO Labs endpoint (requires Labs subscription)."""
    items = await _post_items("/dataforseo_labs/google/ranked_keywords/live", [{
        "target": domain,
        "language_name": "French",
        "location_code": 2250,  # France
        "include_serp_info": True,
        "limit": limit,
        "order_by": ["keyword_data.keyword_info.search_volume,desc"],
        "filters": [
            "ranked_serp_element.serp_item.rank_group", "<=", 100
        ],
    }])
    if not items:
        return None
    out = []
    for item in items:
        kw_data = item.get("keyword_data") or {}
        kw_info = kw_data.get("keyword_info") or {}
        serp_el = item.get("ranked_serp_element") or {}
        serp_item = serp_el.get("serp_item") or {}
        keyword = kw_data.get("keyword")
        if not keyword:
            continue
        out.append({
            "keyword": keyword,
            "position": _safe_int(serp_item.get("rank_group")),
            "search_volume": _safe_int(kw_info.get("search_volume")),
            "cpc": _safe_float(kw_info.get("cpc")),
            "competition": _safe_float(kw_info.get("competition")),
            "traffic": _safe_float(item.get("estimated_paid_traffic_cost"))
                       or _safe_float(serp_item.get("etv")),
            "url": serp_item.get("url"),
        })
    return out


async def _fetch_ranked_keywords_serp(domain: str, limit: int) -> Optional[List[dict]]:
    """Fallback: use SERP API to get organic results for the domain."""
    items = await _post_items("/serp/google/organic/live/advanced", [{
        "target": domain,
        "location_code": 2250,
        "language_code": "fr",
        "device": "desktop",
        "os": "windows",
        "depth": limit,
    }])
    if not items:
        return None
    out = []
    for item in items:
        if item.get("type") != "organic":
            continue
        keyword = item.get("keyword") or item.get("title")
        if not keyword:
            continue
        out.append({
            "keyword": keyword,
            "position": _safe_int(item.get("rank_group")),
            "search_volume": _safe_int(item.get("search_volume")),
            "cpc": _safe_float(item.get("cpc")),
            "competition": None,
            "traffic": _safe_float(item.get("etv")),
            "url": item.get("url"),
        })
    return out


async def fetch_ranked_keywords(domain: str, limit: int = 100) -> Optional[List[Dict[str, Any]]]:
    """Top organic keywords – tries Labs first, falls back to SERP API."""
    if not domain:
        return None

    # Try Labs endpoint first (richer data)
    out = await _fetch_ranked_keywords_labs(domain, limit)

    # If Labs unavailable, no fallback – just return None gracefully
    if not out:
        print(f"[DataForSEO] ranked_keywords: no data for {domain}")
        return None

    # Sort by traffic desc, then by search_volume desc
    out.sort(key=lambda x: (x.get("traffic") or 0, x.get("search_volume") or 0), reverse=True)
    print(f"[DataForSEO] ranked_keywords OK for {domain} ({len(out)} keywords)")
    return out


# ── RELEVANT PAGES (Top Pages by Traffic) ──────────────────────────────
async def fetch_relevant_pages(domain: str, limit: int = 20) -> Optional[List[Dict[str, Any]]]:
    """Top pages ranked by organic traffic via DataForSEO Labs."""
    if not domain:
        return None
    items = await _post_items("/dataforseo_labs/google/relevant_pages/live", [{
        "target": domain,
        "language_name": "French",
        "location_code": 2250,
        "limit": limit,
        "order_by": ["metrics.organic.etv,desc"],
    }])
    if not items:
        return None
    print(f"[DataForSEO] relevant_pages OK for {domain} ({len(items)} pages)")
    out = []
    for item in items:
        page_url = item.get("page_address")
        if not page_url:
            continue
        metrics = (item.get("metrics") or {}).get("organic") or {}
        out.append({
            "url": page_url,
            "etv": _safe_float(metrics.get("etv")),
            "keywords_count": _safe_int(metrics.get("count")),
            "pos_1": _safe_int(metrics.get("pos_1")),
            "pos_2_3": _safe_int(metrics.get("pos_2_3")),
            "pos_4_10": _safe_int(metrics.get("pos_4_10")),
            "is_lost": item.get("is_lost", False),
        })
    # Sort by traffic desc
    out.sort(key=lambda x: (x.get("etv") or 0), reverse=True)
    return out


# ── ALL-IN-ONE FETCH ─────────────────────────────────────────────────────
async def fetch_backlinks_list(
    domain: str,
    limit: int = 1000,
    offset: int = 0,
) -> Optional[List[Dict[str, Any]]]:
    """Fetch individual backlinks pointing to a domain.

    Uses /v3/backlinks/backlinks/live endpoint.
    Returns normalised list of backlink dicts ready for DB insertion.
    """
    if not domain:
        return None
    items = await _post_items("/backlinks/backlinks/live", [{
        "target": domain,
        "include_subdomains": True,
        "limit": limit,
        "offset": offset,
        "order_by": ["rank,desc"],
        "backlinks_status_type": "live",
        "mode": "as_is",
    }])
    if not items:
        return None
    print(f"[DataForSEO] backlinks/live OK for {domain} ({len(items)} backlinks)")

    def _safe_int(v):
        try:
            return int(v) if v is not None else None
        except (ValueError, TypeError):
            return None

    return [
        {
            "source_url": item.get("url_from", ""),
            "target_url": item.get("url_to", ""),
            "anchor_text": item.get("anchor", ""),
            "source_domain": item.get("domain_from", ""),
            "target_domain": item.get("domain_to", ""),
            "link_type": "nofollow" if item.get("dofollow") is False else "dofollow",
            "http_code": _safe_int(item.get("page_from_status_code")),
            "links_on_page": _safe_int(item.get("links_on_page")),
            "domain_rank": _safe_int(item.get("rank")),
        }
        for item in items if item.get("url_from")
    ]


async def fetch_all_dataforseo(domain: str) -> Dict[str, Any]:
    """Fetch all DataForSEO data in parallel. Returns dict with all sections."""
    import asyncio

    if not settings.has_dataforseo or not domain:
        return {}

    results = await asyncio.gather(
        fetch_backlinks_summary(domain),
        fetch_whois(domain),
        fetch_technologies(domain),
        fetch_top_anchors(domain),
        fetch_top_referring_domains(domain),
        fetch_backlinks_history(domain),
        fetch_competitors(domain),
        fetch_ranked_keywords(domain),
        fetch_relevant_pages(domain),
        return_exceptions=True,
    )

    out: Dict[str, Any] = {}
    keys = ["summary", "whois", "technologies", "top_anchors", "top_referring_domains", "history", "competitors", "ranked_keywords", "relevant_pages"]
    for key, result in zip(keys, results):
        if isinstance(result, Exception):
            print(f"[DataForSEO] {key} failed: {result}")
        elif result is not None:
            out[key] = result

    return out
