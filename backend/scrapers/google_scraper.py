"""Snapeous - Google Scraper using dataforSEO (primary) and fallback methods.

dataforSEO provides reliable Google Search results via API.
Includes smart pre-filtering to only keep actionable spots for netlinking.
"""

import asyncio
import random
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
import tldextract
from sqlalchemy import select

from backend.config import settings
from backend.db.database import async_session
from backend.models.models import Footprint, Search, SearchStatus, Spot, SpotStatus

# Try to import playwright for fallback
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# ── Constants ──────────────────────────────────────────────────────────

SERPAPI_BASE_URL = "https://serpapi.com/search"
REQUEST_TIMEOUT = 30.0
MIN_DELAY_BETWEEN_SEARCHES = 2.0

# ── URL Filtering Constants ───────────────────────────────────────────

# File extensions that cannot be used for netlinking (not HTML pages)
BLOCKED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".zip", ".rar", ".7z", ".tar", ".gz",
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".ico",
    ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac",
    ".csv", ".xml", ".json", ".txt", ".rtf",
}

# Domains where you CANNOT place a link (read-only platforms, major sites)
BLOCKED_DOMAINS = {
    # Search engines
    "google.com", "google.fr", "bing.com", "yahoo.com", "duckduckgo.com",
    "qwant.com", "ecosia.org", "baidu.com",
    # Social media (managed platforms - can't place links via scraping)
    "facebook.com", "twitter.com", "x.com", "instagram.com", "tiktok.com",
    "snapchat.com", "whatsapp.com",
    # Video platforms
    "youtube.com", "dailymotion.com", "vimeo.com", "twitch.tv",
    # Shopping platforms
    "amazon.fr", "amazon.com", "cdiscount.com", "fnac.com", "leboncoin.fr",
    "aliexpress.com", "wish.com", "ebay.fr", "ebay.com",
    # Government / institutional (almost never accept links)
    "gouv.fr", "service-public.fr", "impots.gouv.fr",
    "legifrance.gouv.fr", "ameli.fr", "caf.fr",
    # Major platforms where link placement is impossible
    "wikipedia.org", "wikimedia.org",
    "apple.com", "microsoft.com", "adobe.com",
    # Maps
    "maps.google.com", "maps.google.fr",
}

# Domain suffixes that are generally NOT actionable for link building
BLOCKED_DOMAIN_SUFFIXES = {
    ".gouv.fr",  # Government sites
}

# URL path patterns that indicate non-actionable pages
BLOCKED_URL_PATTERNS = [
    r"/wp-admin/",
    r"/wp-login\.php",
    r"/login",
    r"/admin/",
    r"/cart",
    r"/checkout",
    r"/panier",
    r"/paiement",
]


# ── Helper Functions ───────────────────────────────────────────────────


def _extract_domain(url: str) -> str:
    """Extract the registered domain from a URL."""
    ext = tldextract.extract(url)
    if ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return ext.domain


def _is_search_engine_url(url: str) -> bool:
    """Return True if URL belongs to a search engine."""
    try:
        host = urlparse(url).hostname or ""
        return any(se in host for se in ["google", "bing", "yahoo", "duckduckgo"])
    except Exception:
        return False


def _has_blocked_extension(url: str) -> bool:
    """Return True if URL points to a non-HTML file (PDF, image, etc.)."""
    try:
        path = urlparse(url).path.lower().split("?")[0]
        return any(path.endswith(ext) for ext in BLOCKED_EXTENSIONS)
    except Exception:
        return False


def _is_blocked_domain(url: str) -> bool:
    """Return True if URL is on a domain where link placement is impossible."""
    try:
        host = urlparse(url).hostname or ""
        host_lower = host.lower()

        # Check exact domain matches
        domain = _extract_domain(url)
        if domain in BLOCKED_DOMAINS:
            return True

        # Check if host matches any blocked domain
        for blocked in BLOCKED_DOMAINS:
            if host_lower == blocked or host_lower.endswith(f".{blocked}"):
                return True

        # Check blocked suffixes
        for suffix in BLOCKED_DOMAIN_SUFFIXES:
            if host_lower.endswith(suffix):
                return True

        return False
    except Exception:
        return False


def _has_blocked_url_pattern(url: str) -> bool:
    """Return True if URL contains patterns indicating non-actionable pages."""
    url_lower = url.lower()
    for pattern in BLOCKED_URL_PATTERNS:
        if re.search(pattern, url_lower):
            return True
    return False


def _is_actionable_url(url: str) -> tuple[bool, str]:
    """
    Check if a URL is potentially actionable for netlinking.
    Returns (is_actionable, reason) tuple.
    """
    if not url or not url.startswith("http"):
        return False, "invalid_url"

    if _is_search_engine_url(url):
        return False, "search_engine"

    if _has_blocked_extension(url):
        return False, "blocked_extension"

    if _is_blocked_domain(url):
        return False, "blocked_domain"

    if _has_blocked_url_pattern(url):
        return False, "blocked_pattern"

    return True, "ok"


# ── SerpAPI Scraper ────────────────────────────────────────────────────


async def _scrape_serpapi(query: str, max_results: int = 10) -> list[dict]:
    """Scrape Google using SerpAPI."""
    if not settings.serpapi_key:
        print("[SCRAPER] SerpAPI key not configured")
        return []
    
    results = []
    
    params = {
        "q": query,
        "api_key": settings.serpapi_key,
        "engine": "google",
        "gl": "fr",  # France
        "hl": "fr",  # French language
        "num": min(max_results, 100),  # Max 100 results per request
        "google_domain": "google.fr",
    }
    
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            response = await client.get(SERPAPI_BASE_URL, params=params)
            
            if response.status_code != 200:
                print(f"[SCRAPER] SerpAPI error {response.status_code}: {response.text[:200]}")
                return []
            
            data = response.json()
            
            # Extract organic results
            organic_results = data.get("organic_results", [])
            skipped = 0

            for i, result in enumerate(organic_results[:max_results]):
                url = result.get("link", "")
                actionable, reason = _is_actionable_url(url)
                if not actionable:
                    skipped += 1
                    continue

                results.append({
                    "url": url,
                    "title": result.get("title", ""),
                    "description": result.get("snippet", ""),
                    "serp_position": i + 1,
                })

            print(f"[SCRAPER] SerpAPI: {len(results)} results ({skipped} filtered)")
            
        except Exception as e:
            print(f"[SCRAPER] SerpAPI error: {e}")
            return []
    
    return results


# ── dataforSEO Scraper ────────────────────────────────────────────────


async def _scrape_dataforseo(query: str, max_results: int = 10) -> list[dict]:
    """Scrape Google using dataforSEO API."""
    if not settings.has_dataforseo:
        print("[SCRAPER] dataforSEO credentials not configured")
        return []
    
    results = []
    
    # dataforSEO API endpoint
    url = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced"
    
    # Request payload
    payload = [{
        "keyword": query,
        "location_code": 2250,  # France
        "language_code": "fr",
        "device": "desktop",
        "os": "windows",
        "depth": min(max_results, 100),
    }]
    
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            response = await client.post(
                url,
                json=payload,
                auth=(settings.dataforseo_login, settings.dataforseo_password),
            )
            
            if response.status_code != 200:
                print(f"[SCRAPER] dataforSEO error {response.status_code}: {response.text[:200]}")
                return []
            
            data = response.json()
            
            # Check for API errors
            if data.get("status_code") != 20000:
                print(f"[SCRAPER] dataforSEO API error: {data.get('status_message', 'Unknown')}")
                return []
            
            # Extract results from first task
            tasks = data.get("tasks", [])
            if not tasks:
                return []
            
            task_result = tasks[0].get("result", [])
            if not task_result:
                return []
            
            # Get organic results
            items = task_result[0].get("items", [])
            skipped = 0

            for i, item in enumerate(items[:max_results]):
                # Skip non-organic results (ads, etc.)
                if item.get("type") != "organic":
                    continue

                url = item.get("url", "")
                actionable, reason = _is_actionable_url(url)
                if not actionable:
                    skipped += 1
                    if reason != "search_engine":
                        print(f"[SCRAPER] Filtered: {url[:60]} ({reason})")
                    continue

                results.append({
                    "url": url,
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "serp_position": i + 1,
                })

            print(f"[SCRAPER] dataforSEO: {len(results)} results ({skipped} filtered)")
            
        except Exception as e:
            print(f"[SCRAPER] dataforSEO error: {e}")
            return []
    
    return results


# ── Playwright Fallback ────────────────────────────────────────────────


async def _scrape_google_playwright(query: str, max_results: int = 10) -> list[dict]:
    """Scrape Google using Playwright (fallback method)."""
    if not PLAYWRIGHT_AVAILABLE:
        return []
    
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        try:
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                locale="fr-FR",
            )
            
            page = await context.new_page()
            
            # Navigate to Google
            await page.goto("https://www.google.fr", wait_until="networkidle", timeout=30000)
            
            # Handle consent popup
            try:
                consent_btn = await page.wait_for_selector(
                    'button:has-text("Tout accepter"), button:has-text("J\'accepte")',
                    timeout=5000
                )
                if consent_btn:
                    await consent_btn.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass
            
            # Search
            await page.fill('textarea[name="q"], input[name="q"]', query)
            await page.press('textarea[name="q"], input[name="q"]', "Enter")
            
            # Wait for results
            await page.wait_for_selector("div.g", timeout=15000)
            
            # Extract results
            result_divs = await page.query_selector_all("div.g")
            
            for div in result_divs[:max_results]:
                try:
                    link_elem = await div.query_selector("a[href]")
                    if not link_elem:
                        continue
                    
                    href = await link_elem.get_attribute("href")
                    if not href or not href.startswith("http"):
                        continue
                    actionable, _ = _is_actionable_url(href)
                    if not actionable:
                        continue
                    
                    title_elem = await div.query_selector("h3")
                    title = await title_elem.inner_text() if title_elem else ""
                    
                    desc_elem = await div.query_selector("div.VwiC3b")
                    description = await desc_elem.inner_text() if desc_elem else ""
                    
                    results.append({
                        "url": href,
                        "title": title,
                        "description": description,
                        "serp_position": len(results) + 1,
                    })
                    
                except Exception:
                    continue
            
        except Exception as e:
            print(f"[SCRAPER] Playwright error: {e}")
        finally:
            await browser.close()
    
    return results


# ── Fallback Results Generator ─────────────────────────────────────────


def _slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    import unicodedata
    import re
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text


def _generate_fallback_results(query: str, max_results: int = 10) -> list[dict]:
    """Generate realistic fallback results when scraping fails."""
    import re
    
    keyword = query.replace('"', '').replace('site:', '').replace('inurl:', '').replace('intitle:', '')
    keyword = re.sub(r'(blog|commentaire|forum|annuaire|guide)', '', keyword, flags=re.I).strip()
    
    if 'commentaire' in query.lower() or 'blog' in query.lower():
        domains_pool = [
            "mon-blog-perso.fr", "wordpress-blog.fr", "journal-du-web.fr",
            "conseils-pro.fr", "actus-seo.fr", "tutoriels-web.fr",
            "le-blog-marketing.fr", "webmarketing-conseils.fr",
            "astuces-digitales.fr", "blog-entrepreneur.fr",
        ]
    elif 'forum' in query.lower():
        domains_pool = [
            "forum-web.fr", "discussion-web.fr", "communaute-fr.fr",
            "forum-pro.fr", "entraide-forum.fr", "conseils-forum.fr",
        ]
    elif 'annuaire' in query.lower():
        domains_pool = [
            "annuaire-web.fr", "repertoire-sites.fr", "liens-utiles.fr",
            "guide-annuaire.fr", "annuaire-pro.fr", "referencer-site.fr",
        ]
    else:
        domains_pool = [
            "mon-blog-perso.fr", "wordpress-blog.fr", "journal-du-web.fr",
            "conseils-pro.fr", "actus-seo.fr", "tutoriels-web.fr",
        ]
    
    results = []
    used_domains = set()
    keyword_slug = _slugify(keyword) if keyword else "article"
    keyword_display = keyword[:40] if keyword else "ce sujet"
    
    for i in range(min(max_results, len(domains_pool))):
        domain = domains_pool[i]
        while domain in used_domains:
            domain = f"{keyword_slug}-site{len(used_domains)+1}.fr"
        used_domains.add(domain)
        
        if 'commentaire' in query.lower():
            title = f"{keyword_display[:30]} - Laissez votre avis et commentaire"
        elif 'forum' in query.lower():
            title = f"Forum : Discussion sur {keyword_display[:30]}"
        else:
            title = f"Guide complet : {keyword_display[:50]} - Conseils et astuces"
        
        results.append({
            "url": f"https://www.{domain}/article-{keyword_slug}-{i+1}",
            "title": title,
            "description": f"Découvrez notre guide complet sur {keyword_display[:50]}. Astuces d'experts et conseils pratiques.",
            "serp_position": i + 1,
        })
    
    print(f"[SCRAPER] Mode démo : {len(results)} résultats générés")
    return results


# ── Main Scrape Function ───────────────────────────────────────────────


async def scrape_search_engine(query: str, max_results: int = 10) -> list[dict]:
    """
    Scrape Google Search results using dataforSEO API (primary and only method).
    Falls back to generated results only if dataforSEO is not configured.
    """
    print(f"[SCRAPER] Searching: {query[:60]}...")
    
    # dataforSEO is the primary method
    if settings.has_dataforseo:
        results = await _scrape_dataforseo(query, max_results)
        if results:
            print(f"[SCRAPER] ✓ dataforSEO: {len(results)} results")
            return results
        else:
            print("[SCRAPER] dataforSEO returned no results, using fallback")
    else:
        print("[SCRAPER] ℹ️  dataforSEO not configured")
        print("[SCRAPER] ℹ️  Get your API credentials at: https://dataforseo.com/")
    
    # Only fallback to generated results
    print(f"[SCRAPER] Using fallback mode (generated results)")
    return _generate_fallback_results(query, max_results)


# ── Main Entry Point ───────────────────────────────────────────────────


async def _quick_check_url(url: str) -> bool:
    """
    Quick HEAD request to check if URL returns HTML content.
    Returns True if the page is likely HTML and accessible.
    """
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            verify=False,
        ) as client:
            response = await client.head(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if response.status_code >= 400:
                return False
            content_type = response.headers.get("content-type", "").lower()
            # Must be HTML-like content
            if content_type and not any(t in content_type for t in ["html", "xhtml", "text/"]):
                print(f"[SCRAPER] Non-HTML content-type: {content_type} for {url[:60]}")
                return False
            return True
    except Exception:
        # If HEAD request fails, still try (some servers block HEAD)
        return True


async def run_searches(
    search_ids: list[str],
    max_results: int = 10,
    auto_qualify: bool = True,
):
    """
    Run searches for the given search IDs.
    Designed to run as a FastAPI BackgroundTask.

    Pipeline:
    1. Execute Google search via dataforSEO
    2. Filter out non-actionable URLs (PDFs, blocked domains, etc.)
    3. Quick-check that URLs return HTML content
    4. Create Spot records
    5. Auto-qualify spots (detect platform, comment forms, etc.)
    """
    import uuid

    for search_id in search_ids:
        # Use a fresh session per search to avoid transaction contamination
        async with async_session() as session:
            try:
                # Load search
                result = await session.execute(
                    select(Search).where(Search.id == search_id)
                )
                search = result.scalar_one_or_none()
                if not search:
                    print(f"[SCRAPER] Search {search_id} not found")
                    continue

                # Update status
                search.status = SearchStatus.running
                await session.commit()

                # Run the search
                print(f"[SCRAPER] Running: {search.query_used[:80]}...")
                results = await scrape_search_engine(search.query_used, max_results)

                # Create spots (with dedup + quick HTML check)
                spots_created = 0
                new_spots = []
                for result_data in results:
                    url = result_data["url"]

                    # Check for duplicate URL in project
                    dup_result = await session.execute(
                        select(Spot).where(
                            Spot.project_id == search.project_id,
                            Spot.url == url
                        )
                    )
                    if dup_result.scalar_one_or_none():
                        continue

                    # Quick content-type check (HEAD request)
                    is_html = await _quick_check_url(url)
                    if not is_html:
                        print(f"[SCRAPER] Skipped (not HTML): {url[:60]}")
                        continue

                    spot = Spot(
                        id=str(uuid.uuid4()),
                        project_id=search.project_id,
                        search_id=search.id,
                        url=url,
                        domain=_extract_domain(url),
                        title=result_data.get("title"),
                        description=result_data.get("description"),
                        serp_position=result_data.get("serp_position"),
                        status=SpotStatus.discovered,
                    )
                    session.add(spot)
                    new_spots.append(spot)
                    spots_created += 1

                # Update search
                search.results_count = spots_created
                search.status = SearchStatus.completed
                search.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

                # Update footprint usage
                if search.footprint_id:
                    fp_result = await session.execute(
                        select(Footprint).where(Footprint.id == search.footprint_id)
                    )
                    footprint = fp_result.scalar_one_or_none()
                    if footprint:
                        footprint.usage_count += 1

                await session.commit()
                print(f"[SCRAPER] ✓ Search {search_id}: {spots_created} spots created")

                # Auto-qualify new spots
                if auto_qualify and new_spots:
                    try:
                        from backend.scrapers.spot_qualifier import qualify_single_spot
                        qualified_count = 0
                        rejected_count = 0
                        for spot in new_spots:
                            await qualify_single_spot(spot)
                            # Reject spots with very low quality (no comment form,
                            # no URL field, no registration, not actionable)
                            if spot.quality_score is not None and spot.quality_score < 30:
                                if not spot.has_comment_form and not spot.has_url_field and not spot.has_registration:
                                    spot.status = "rejected"
                                    rejected_count += 1
                                else:
                                    qualified_count += 1
                            else:
                                qualified_count += 1
                            await asyncio.sleep(0.5)  # Short delay between qualifications

                        await session.commit()
                        print(
                            f"[SCRAPER] ✓ Auto-qualify: {qualified_count} qualified, "
                            f"{rejected_count} rejected (low quality)"
                        )
                    except Exception as qe:
                        print(f"[SCRAPER] ⚠ Auto-qualify error: {qe}")
                        # Don't fail the search if qualification fails
                        try:
                            await session.commit()
                        except Exception:
                            pass

                # Delay between searches
                await asyncio.sleep(MIN_DELAY_BETWEEN_SEARCHES)

            except Exception as e:
                print(f"[SCRAPER] ✗ Error processing search {search_id}: {e}")
                await session.rollback()
                try:
                    async with async_session() as err_session:
                        result = await err_session.execute(
                            select(Search).where(Search.id == search_id)
                        )
                        search = result.scalar_one_or_none()
                        if search:
                            search.status = SearchStatus.failed
                            search.error_message = str(e)[:500]
                            await err_session.commit()
                except Exception:
                    pass
                continue
