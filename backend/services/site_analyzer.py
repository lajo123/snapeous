"""SpotSEO - Site Analyzer Service

Crawls a client website and analyzes it with AI (or fallback heuristics)
to extract niche, keywords, target pages, anchor suggestions, etc.
Designed to run as a FastAPI BackgroundTask.
"""

import asyncio
import json
import re
from collections import Counter
from urllib.parse import urljoin, urlparse

import httpx
import tldextract
from bs4 import BeautifulSoup

from backend.config import settings
from backend.db.database import async_session
from backend.models.models import Project


# ── Constants ──────────────────────────────────────────────────────────

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
}

MAX_DEPTH = 2
MAX_PAGES = 30
BATCH_SIZE = 5
BATCH_DELAY = 0.3
MAX_TEXT_LENGTH = 2000
MAX_H2_COUNT = 10
REQUEST_TIMEOUT = 15.0

IGNORED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
    ".css", ".js", ".xml", ".json", ".zip", ".gz", ".tar", ".mp3",
    ".mp4", ".avi", ".mov", ".wmv", ".flv", ".woff", ".woff2",
    ".ttf", ".eot", ".otf", ".map", ".webmanifest",
}

FRENCH_STOP_WORDS = {
    "le", "la", "les", "de", "des", "du", "un", "une", "et", "en",
    "est", "au", "aux", "que", "qui", "dans", "pour", "par", "sur",
    "avec", "ce", "se", "son", "sa", "ses", "il", "elle", "nous",
    "vous", "ils", "elles", "ne", "pas", "plus", "ou", "mais", "donc",
    "car", "ni", "si", "je", "tu", "on", "me", "te", "lui", "leur",
    "mon", "ma", "mes", "ton", "ta", "tes", "notre", "votre", "nos",
    "vos", "leurs", "tout", "tous", "toute", "toutes", "cette", "ces",
    "cet", "ici", "entre", "comme", "bien", "aussi", "être", "avoir",
    "fait", "faire", "peut", "sans", "très", "même", "autre", "après",
    "avant", "quand", "comment", "alors", "encore", "déjà", "non",
    "oui", "où", "dont", "chez", "vers", "sous", "depuis", "lors",
    "peu", "beaucoup", "trop", "assez", "chaque", "quelque",
    "plusieurs", "certains", "aucun", "tel", "the", "and", "for",
    "are", "was", "were", "been", "has", "have", "had", "with",
    "this", "that", "from", "not", "but", "all", "can", "will",
    "just", "about", "into", "than", "its", "you", "your",
}


# ── Page Data Structure ───────────────────────────────────────────────


def _make_page_data(
    url: str,
    title: str = "",
    meta_description: str = "",
    h1: str = "",
    h2s: list[str] | None = None,
    text_content: str = "",
    internal_links_count: int = 0,
    language: str = "unknown",
) -> dict:
    return {
        "url": url,
        "title": title,
        "meta_description": meta_description,
        "h1": h1,
        "h2s": h2s or [],
        "text_content": text_content,
        "internal_links_count": internal_links_count,
        "language": language,
    }


# ── Language Detection from URL ────────────────────────────────────────


def _detect_language_from_url(url: str) -> str:
    """Detect language from URL path patterns like /fr/, /en/, /es/."""
    path = urlparse(url).path.lower()
    lang_patterns = {
        "fr": ["/fr/", "/fr-fr/", "/french/"],
        "en": ["/en/", "/en-us/", "/en-gb/", "/english/"],
        "es": ["/es/", "/es-es/", "/spanish/"],
        "de": ["/de/", "/de-de/", "/german/"],
        "it": ["/it/", "/it-it/", "/italian/"],
        "pt": ["/pt/", "/pt-br/", "/portuguese/"],
        "nl": ["/nl/", "/nl-nl/", "/dutch/"],
    }
    for lang, patterns in lang_patterns.items():
        if any(pattern in path for pattern in patterns):
            return lang
    # Check if lang code is the first path segment (e.g., /fr or /en)
    segments = [s for s in path.split("/") if s]
    if segments and len(segments[0]) == 2 and segments[0] in lang_patterns:
        return segments[0]
    return "unknown"


# ── URL Helpers ────────────────────────────────────────────────────────


def _get_registered_domain(domain: str) -> str:
    """Extract the registered domain (e.g. 'example.com' from 'www.example.com')."""
    extracted = tldextract.extract(domain)
    return f"{extracted.domain}.{extracted.suffix}".lower()


def _is_same_domain(url: str, base_registered_domain: str) -> bool:
    """Check if a URL belongs to the same registered domain."""
    try:
        extracted = tldextract.extract(url)
        url_domain = f"{extracted.domain}.{extracted.suffix}".lower()
        return url_domain == base_registered_domain
    except Exception:
        return False


def _should_skip_url(url: str) -> bool:
    """Return True if the URL points to a non-HTML resource."""
    parsed = urlparse(url)
    path_lower = parsed.path.lower()
    return any(path_lower.endswith(ext) for ext in IGNORED_EXTENSIONS)


def _normalize_url(url: str) -> str:
    """Strip fragment and trailing slash for deduplication."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    normalized = parsed._replace(fragment="", path=path)
    return normalized.geturl()


# ── HTML Parsing ───────────────────────────────────────────────────────


def _parse_page(html: str, page_url: str, base_registered_domain: str) -> tuple[dict, list[str]]:
    """
    Parse an HTML page and return (page_data, discovered_internal_links).
    """
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Title
    title = ""
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()[:300]

    # Meta description
    meta_description = ""
    meta_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if meta_tag and meta_tag.get("content"):
        meta_description = meta_tag["content"].strip()[:500]

    # H1
    h1 = ""
    h1_tag = soup.find("h1")
    if h1_tag:
        h1 = h1_tag.get_text(strip=True)[:300]

    # H2s
    h2s = []
    for h2_tag in soup.find_all("h2", limit=MAX_H2_COUNT):
        text = h2_tag.get_text(strip=True)[:200]
        if text:
            h2s.append(text)

    # Main text content
    text_content = ""
    # Try to find main content areas first
    main_el = (
        soup.find("main")
        or soup.find("article")
        or soup.find("div", {"role": "main"})
        or soup.find("div", class_=re.compile(r"content|main|entry|post", re.I))
    )
    target = main_el if main_el else soup.body if soup.body else soup
    # Remove script/style/nav/footer/header to get cleaner text
    for tag in target.find_all(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()
    text_content = target.get_text(separator=" ", strip=True)
    # Collapse whitespace
    text_content = re.sub(r"\s+", " ", text_content).strip()[:MAX_TEXT_LENGTH]

    # Internal links
    internal_links: list[str] = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"].strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        absolute_url = urljoin(page_url, href)
        if _is_same_domain(absolute_url, base_registered_domain) and not _should_skip_url(absolute_url):
            normalized = _normalize_url(absolute_url)
            internal_links.append(normalized)

    page_data = _make_page_data(
        url=page_url,
        title=title,
        meta_description=meta_description,
        h1=h1,
        h2s=h2s,
        text_content=text_content,
        internal_links_count=len(internal_links),
    )
    return page_data, internal_links


# ── Sitemap Fetching ──────────────────────────────────────────────────


def _extract_urls_from_sitemap(soup: BeautifulSoup) -> list[dict]:
    """Extract URLs and language info from a parsed sitemap."""
    pages = []
    for url_tag in soup.find_all("url"):
        loc = url_tag.find("loc")
        if not loc:
            continue

        page_url = loc.text.strip()

        # Detect language from hreflang alternates
        hreflang_alternates = {}
        for xhtml_link in url_tag.find_all(attrs={"rel": "alternate"}):
            hreflang = xhtml_link.get("hreflang", "")
            href = xhtml_link.get("href", "")
            if hreflang and href:
                hreflang_alternates[hreflang] = href

        detected_lang = _detect_language_from_url(page_url)

        pages.append({
            "url": page_url,
            "language": detected_lang,
            "hreflang_alternates": hreflang_alternates if hreflang_alternates else None,
            "lastmod": url_tag.find("lastmod").text.strip() if url_tag.find("lastmod") else None,
        })

    return pages


async def _parse_single_sitemap(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Fetch and parse a single sitemap file."""
    try:
        response = await client.get(url, timeout=15.0)
        if response.status_code != 200:
            return []
        soup = BeautifulSoup(response.text, "xml")
        return _extract_urls_from_sitemap(soup)
    except Exception as e:
        print(f"[SiteAnalyzer] Error parsing child sitemap {url}: {e}")
        return []


async def _fetch_sitemap(domain: str) -> list[dict]:
    """Fetch and parse sitemap.xml to discover all pages with language info."""
    sitemap_urls_to_try = [
        f"https://{domain}/sitemap.xml",
        f"https://{domain}/sitemap_index.xml",
        f"https://www.{domain}/sitemap.xml",
    ]

    discovered_pages: list[dict] = []

    async with httpx.AsyncClient(
        timeout=15.0, headers=HEADERS, follow_redirects=True
    ) as client:
        for sitemap_url in sitemap_urls_to_try:
            try:
                response = await client.get(sitemap_url)
                if response.status_code != 200:
                    continue

                content_type = response.headers.get("content-type", "")
                if "xml" not in content_type and "text" not in content_type:
                    continue

                soup = BeautifulSoup(response.text, "xml")

                # Check if it's a sitemap index
                sitemap_tags = soup.find_all("sitemap")
                if sitemap_tags:
                    for sm in sitemap_tags[:5]:
                        loc = sm.find("loc")
                        if loc:
                            child_pages = await _parse_single_sitemap(
                                client, loc.text.strip()
                            )
                            discovered_pages.extend(child_pages)
                else:
                    discovered_pages = _extract_urls_from_sitemap(soup)

                if discovered_pages:
                    print(f"[SiteAnalyzer] Sitemap found at {sitemap_url}: {len(discovered_pages)} URLs")
                    break

            except Exception as e:
                print(f"[SiteAnalyzer] Sitemap fetch error for {sitemap_url}: {e}")
                continue

    return discovered_pages


# ── Backlink Profile Analysis ─────────────────────────────────────────


def _is_url_anchor(text: str) -> bool:
    """Check if anchor text looks like a URL."""
    text = text.strip().lower()
    return bool(re.match(r"^https?://", text)) or (
        "." in text and "/" in text and " " not in text
    )


def _is_generic_anchor(text: str) -> bool:
    """Check if anchor text is a generic/non-descriptive phrase."""
    generic_phrases = {
        "cliquez ici", "click here", "en savoir plus", "read more",
        "voir le site", "visit site", "lire la suite", "learn more",
        "ici", "here", "ce site", "this site", "site officiel",
        "official site", "plus d'infos", "more info", "voir plus",
        "see more", "lien", "link", "source", "article",
    }
    return text.strip().lower() in generic_phrases


async def _analyze_backlink_profile(project_id: str, domain: str) -> dict:
    """Analyze existing backlinks to compute current anchor type distribution."""
    from sqlalchemy import select
    from backend.models.models import Backlink

    anchor_stats = {
        "total_backlinks": 0,
        "anchor_distribution": {},
        "existing_anchors": [],
    }

    try:
        async with async_session() as session:
            result = await session.execute(
                select(Backlink.anchor_text, Backlink.link_type)
                .where(Backlink.project_id == project_id)
                .where(Backlink.status == "active")
            )
            backlinks = result.all()

            if not backlinks:
                return anchor_stats

            anchor_stats["total_backlinks"] = len(backlinks)

            brand_name = domain.split(".")[0].lower()
            anchor_types: Counter = Counter()
            for anchor_text, link_type in backlinks:
                text = (anchor_text or "").strip()
                if not text:
                    anchor_types["generic"] += 1
                elif _is_url_anchor(text):
                    anchor_types["naked_url"] += 1
                elif _is_generic_anchor(text):
                    anchor_types["generic"] += 1
                elif brand_name in text.lower():
                    anchor_types["brand"] += 1
                else:
                    anchor_types["keyword_based"] += 1

                if text:
                    anchor_stats["existing_anchors"].append(text)

            total = sum(anchor_types.values())
            if total > 0:
                anchor_stats["anchor_distribution"] = {
                    k: round(v / total * 100, 1) for k, v in anchor_types.items()
                }

    except Exception as e:
        print(f"[SiteAnalyzer] Backlink profile analysis error: {e}")

    return anchor_stats


async def _import_domdetailer_backlinks(project_id: str, domain: str) -> dict | None:
    """Fetch backlinks from DomDetailer and import them into the DB.

    Skips duplicates (existing source_url for this project).
    Returns the DomDetailer metrics dict, or None.
    """
    from backend.services.domdetailer import fetch_backlinks
    from sqlalchemy import select
    from backend.models.models import Backlink, BacklinkStatus

    result = await fetch_backlinks(domain)
    if not result:
        return None

    backlinks_data = result.get("backlinks", [])
    metrics = result.get("metrics", {})

    if not backlinks_data:
        print(f"[SiteAnalyzer] DomDetailer returned 0 backlinks for {domain}")
        return metrics

    imported = 0
    skipped = 0

    try:
        async with async_session() as session:
            # Get existing source_urls for this project to avoid duplicates
            existing_result = await session.execute(
                select(Backlink.source_url)
                .where(Backlink.project_id == project_id)
            )
            existing_urls = {row[0] for row in existing_result.all()}

            for bl in backlinks_data:
                source_url = (bl.get("source") or "").strip()
                if not source_url or source_url in existing_urls:
                    skipped += 1
                    continue

                target_url = (bl.get("target") or "").strip()
                anchor_text = (bl.get("anchor") or "").strip()
                is_nofollow = bl.get("nf") == 1 or bl.get("nf") == "1"
                link_type_val = "nofollow" if is_nofollow else "dofollow"

                source_domain = urlparse(source_url).netloc.lower() if source_url else None
                target_domain = urlparse(target_url).netloc.lower() if target_url else None

                backlink = Backlink(
                    project_id=project_id,
                    source_url=source_url,
                    target_url=target_url or None,
                    anchor_text=anchor_text or None,
                    source_domain=source_domain,
                    target_domain=target_domain,
                    link_type=link_type_val,
                    status=BacklinkStatus.active,
                )
                session.add(backlink)
                existing_urls.add(source_url)  # prevent duplicates within batch
                imported += 1

            await session.commit()
            print(f"[SiteAnalyzer] DomDetailer backlinks: {imported} imported, {skipped} skipped (duplicates)")

    except Exception as e:
        print(f"[SiteAnalyzer] Error importing DomDetailer backlinks: {e}")
        import traceback
        traceback.print_exc()

    return metrics


# ── Crawler ────────────────────────────────────────────────────────────


async def _fetch_page(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch a single page. Returns HTML string or None on failure."""
    try:
        response = await client.get(
            url,
            follow_redirects=True,
            timeout=REQUEST_TIMEOUT,
        )
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type.lower():
            return None
        if response.status_code != 200:
            return None
        return response.text
    except Exception as e:
        print(f"[SiteAnalyzer] Failed to fetch {url}: {e}")
        return None


def _detect_page_language(soup: BeautifulSoup) -> str:
    """Detect the language of a page from HTML attributes and meta tags."""
    # Check HTML lang attribute
    html_tag = soup.find('html')
    if html_tag and html_tag.get('lang'):
        lang = html_tag.get('lang').lower()
        if lang.startswith('fr'):
            return 'fr'
        elif lang.startswith('en'):
            return 'en'
        elif lang.startswith('es'):
            return 'es'
        elif lang.startswith('de'):
            return 'de'
    
    # Check meta content-language
    meta_lang = soup.find('meta', attrs={'http-equiv': lambda x: x and 'content-language' in x.lower()})
    if meta_lang:
        content = meta_lang.get('content', '').lower()
        if 'fr' in content:
            return 'fr'
        elif 'en' in content:
            return 'en'
    
    # Check meta charset/locale
    meta_locale = soup.find('meta', attrs={'property': 'og:locale'})
    if meta_locale:
        content = meta_locale.get('content', '').lower()
        if content.startswith('fr'):
            return 'fr'
        elif content.startswith('en'):
            return 'en'
    
    return 'unknown'


def _extract_favicon(soup: BeautifulSoup, page_url: str) -> str | None:
    """Extract favicon URL from HTML link tags, fallback to /favicon.ico."""
    for rel_value in ["icon", "shortcut icon", "apple-touch-icon"]:
        for link_tag in soup.find_all("link", rel=True):
            rels = link_tag.get("rel", [])
            if isinstance(rels, list):
                rels_str = " ".join(rels).lower()
            else:
                rels_str = str(rels).lower()
            if rel_value in rels_str and link_tag.get("href"):
                href = link_tag["href"].strip()
                if href:
                    return urljoin(page_url, href)
    # Fallback to /favicon.ico
    parsed = urlparse(page_url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"


async def crawl_site(domain: str, target_language: str = 'fr') -> tuple[list[dict], str | None]:
    """
    Crawl a website starting from its homepage.
    Discovers internal links and prioritizes pages in the target language.
    Returns a list of page data dictionaries with extracted content.
    """
    base_registered_domain = _get_registered_domain(domain)
    visited_urls: set[str] = set()
    # Seed URLs: homepage + language-specific path
    urls_to_visit: list[str] = [
        _normalize_url(f"https://{domain}"),
        _normalize_url(f"https://{domain}/{target_language}"),
    ]
    # Deduplicate seeds
    urls_to_visit = list(dict.fromkeys(urls_to_visit))

    pages_by_language: dict[str, list[dict]] = {'fr': [], 'en': [], 'other': []}
    total_fetched = 0
    favicon_url: str | None = None

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
        headers=HEADERS,
    ) as client:
        while urls_to_visit and total_fetched < MAX_PAGES:
            # Take a batch
            batch = []
            while urls_to_visit and len(batch) < BATCH_SIZE:
                url = urls_to_visit.pop(0)
                if url not in visited_urls and not _should_skip_url(url):
                    visited_urls.add(url)
                    batch.append(url)

            if not batch:
                break

            # Fetch batch in parallel
            tasks = [_fetch_page(client, url) for url in batch]
            results = await asyncio.gather(*tasks)

            for url, html in zip(batch, results):
                if html is None:
                    continue

                total_fetched += 1

                # Parse with the existing _parse_page function
                page_data, internal_links = _parse_page(html, url, base_registered_domain)

                # Detect language + extract favicon from first page
                try:
                    soup = BeautifulSoup(html, 'lxml')
                except Exception:
                    soup = BeautifulSoup(html, 'html.parser')
                lang = _detect_page_language(soup)
                page_data["language"] = lang

                # Extract favicon from first (homepage) page only
                if favicon_url is None:
                    favicon_url = _extract_favicon(soup, url)

                # Categorize by language
                if lang == target_language:
                    pages_by_language[target_language].append(page_data)
                elif lang == 'en':
                    pages_by_language['en'].append(page_data)
                else:
                    pages_by_language['other'].append(page_data)

                # Add discovered internal links to the queue
                for link in internal_links:
                    normalized = _normalize_url(link)
                    if normalized not in visited_urls:
                        urls_to_visit.append(normalized)

            # Small delay between batches to be polite
            if urls_to_visit and total_fetched < MAX_PAGES:
                await asyncio.sleep(BATCH_DELAY)

    # Prioritize pages in target language, then fallback to others
    pages_data = pages_by_language.get(target_language, [])[:MAX_PAGES]

    if len(pages_data) < MAX_PAGES:
        pages_data.extend(pages_by_language.get('en', [])[:MAX_PAGES - len(pages_data)])

    if len(pages_data) < MAX_PAGES:
        pages_data.extend(pages_by_language.get('other', [])[:MAX_PAGES - len(pages_data)])

    fr_count = len(pages_by_language.get(target_language, []))
    print(f"[Crawler] Crawled {len(pages_data)} pages total ({fr_count} in {target_language}), visited {len(visited_urls)} URLs")
    return pages_data, favicon_url


# ── AI Analysis via OpenRouter ─────────────────────────────────────────


def _build_analysis_prompt(domain: str, pages_data: list[dict], target_language: str = "fr", backlink_profile: dict | None = None, domdetailer_metrics: dict | None = None) -> str:
    """Build a structured prompt for AI analysis with multi-niche support."""
    pages_summary = []
    for i, page in enumerate(pages_data[:10], 1):
        parts = [f"P{i}: {page['url']}"]
        if page["title"]:
            parts.append(f"T: {page['title'][:100]}")
        if page["h1"]:
            parts.append(f"H1: {page['h1'][:100]}")
        if page["meta_description"]:
            parts.append(f"Meta: {page['meta_description'][:150]}")
        if page["h2s"]:
            parts.append(f"H2: {', '.join(page['h2s'][:3])}")
        pages_summary.append(" | ".join(parts))

    pages_text = "\n".join(pages_summary)

    # Build backlink context section
    backlink_context = ""
    if backlink_profile and backlink_profile.get("total", 0) > 0:
        dist = backlink_profile.get("distribution", {})
        backlink_context += f"\nProfil de backlinks existant ({backlink_profile['total']} backlinks):"
        backlink_context += f"\n  Distribution des ancres: {json.dumps(dist)}"
        existing = backlink_profile.get("existing_anchors", [])[:15]
        if existing:
            backlink_context += f"\n  Exemples d'ancres existantes: {', '.join(existing[:10])}"
    if domdetailer_metrics:
        backlink_context += "\nMetriques DomDetailer:"
        for k, v in domdetailer_metrics.items():
            backlink_context += f"\n  {k}: {v}"

    lang_instruction = {
        "fr": "en FRANCAIS uniquement",
        "en": "in ENGLISH only",
        "es": "en ESPANOL solamente",
        "de": "auf DEUTSCH nur",
        "it": "in ITALIANO solo",
        "pt": "em PORTUGUES apenas",
        "nl": "in het NEDERLANDS alleen",
    }.get(target_language, f"in {target_language}")

    return f"""Site: {domain}
Langue d'analyse: {target_language}
Donnees crawlees:
{pages_text}
{backlink_context}
Retourne un JSON avec ces cles exactes:
- "niches": liste de 2-5 niches thematiques {lang_instruction}, chaque niche en 2-5 mots (ex: ["Createur de CV en ligne", "CV Builder IA", "Generateur de CV"])
- "niche": la niche principale (premiere de la liste)
- "keywords": liste de 15-20 objets {{"keyword","intent"(informational/transactional/commercial/navigational),"priority"(high/medium/low),"estimated_volume"(high/medium/low)}} TOUS {lang_instruction}, pertinents pour la niche
- "target_pages": 5-8 objets {{"url","reason","language"}} avec la langue detectee de chaque page
- "suggested_anchors": 12 objets {{"text","type"(brand/semi_optimized/optimized/generic/naked_url),"weight"}} (total weight=100), avec une repartition: ~30% brand, ~25% semi_optimized, ~25% optimized, ~20% generic+naked_url
- "competitor_domains": 3-5 domaines concurrents
- "content_gaps": 5-8 objets {{"type"(content|link_type|anchor_strategy|page_priority),"suggestion":"...","priority"(high/medium/low)}} - recommandations concretes basees sur l'analyse du site ET des backlinks. Inclure au moins 1 recommandation de chaque type.

IMPORTANT pour les ancres:
- "brand": nom de marque, URL, variantes du nom
- "semi_optimized": phrase naturelle contenant un mot-cle (ex: "decouvrez nos services de creation de CV")
- "optimized": mot-cle exact ou quasi-exact (ex: "createur de CV gratuit")
- "generic": "cliquez ici", "en savoir plus", "voir le site"
- "naked_url": URL brute du site
Si un profil de backlinks est fourni, COMPLEMENTER la distribution existante (ne pas dupliquer les types deja sur-representes).

Types de recommandations (content_gaps):
- "content": lacune de contenu a combler (articles, pages, guides)
- "link_type": strategie de types de liens (dofollow, nofollow, .edu, .gov, guest posts)
- "anchor_strategy": ameliorations du profil d'ancres (diversification, marque, etc.)
- "page_priority": pages specifiques a prioriser pour le netlinking

JSON brut uniquement, sans markdown:"""


async def _analyze_with_ai(domain: str, pages_data: list[dict], target_language: str = "fr", backlink_profile: dict | None = None, domdetailer_metrics: dict | None = None) -> dict | None:
    """Send crawled data to OpenRouter API and get structured analysis."""
    if not settings.openrouter_api_key:
        return None

    prompt = _build_analysis_prompt(domain, pages_data, target_language, backlink_profile, domdetailer_metrics)

    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Tu es un expert SEO français. Tu réponds uniquement en JSON valide, "
                    "sans markdown ni texte supplémentaire. Pas de ```json, pas de commentaires, "
                    "juste le JSON brut."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 16000,
    }

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost:5173",
        "X-OpenRouter-Title": "SpotSEO",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=300.0,
            )

            if response.status_code != 200:
                print(f"[SiteAnalyzer] OpenRouter API error {response.status_code}: {response.text[:500]}")
                return None

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            if not content:
                print("[SiteAnalyzer] OpenRouter returned empty content")
                return None

            # Clean potential markdown wrapping
            content = content.strip()
            if content.startswith("```"):
                # Remove ```json ... ``` wrapping
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)
                content = content.strip()

            result = json.loads(content)

            # Validate required keys
            required_keys = {"niche", "keywords", "target_pages", "suggested_anchors"}
            if not required_keys.issubset(result.keys()):
                missing = required_keys - result.keys()
                print(f"[SiteAnalyzer] AI response missing keys: {missing}")
                return None

            # Ensure all expected keys exist
            result.setdefault("competitor_domains", [])
            result.setdefault("content_gaps", [])
            # Ensure niches list exists
            if "niches" not in result:
                result["niches"] = [result.get("niche", "Site web")]
            if "niche" not in result and result.get("niches"):
                result["niche"] = result["niches"][0]

            return result

    except json.JSONDecodeError as e:
        print(f"[SiteAnalyzer] Failed to parse AI JSON response: {e}")
        return None
    except Exception as e:
        print(f"[SiteAnalyzer] AI analysis error: {e}")
        return None


# ── Fallback Analysis (No AI) ─────────────────────────────────────────


def _extract_keywords_by_frequency(pages_data: list[dict]) -> list[dict]:
    """Extract keywords from page titles, H1s, and H2s by word frequency."""
    word_counter: Counter = Counter()

    for page in pages_data:
        text_sources = [page.get("title", ""), page.get("h1", "")]
        text_sources.extend(page.get("h2s", []))
        text_sources.append(page.get("meta_description", ""))

        for text in text_sources:
            if not text:
                continue
            # Tokenize: keep letters, accented chars, hyphens
            words = re.findall(r"[a-zà-ÿœæ\-]{3,}", text.lower())
            for word in words:
                if word not in FRENCH_STOP_WORDS and len(word) >= 3:
                    word_counter[word] += 1

    # Also extract bigrams from titles and H1s for better keyword quality
    bigram_counter: Counter = Counter()
    for page in pages_data:
        for text in [page.get("title", ""), page.get("h1", "")]:
            if not text:
                continue
            words = re.findall(r"[a-zà-ÿœæ\-]{3,}", text.lower())
            clean_words = [w for w in words if w not in FRENCH_STOP_WORDS]
            for i in range(len(clean_words) - 1):
                bigram = f"{clean_words[i]} {clean_words[i + 1]}"
                bigram_counter[bigram] += 1

    keywords = []
    # Add top bigrams first (more meaningful)
    for phrase, count in bigram_counter.most_common(10):
        if count >= 2:
            priority = "high" if count >= 4 else "medium" if count >= 2 else "low"
            keywords.append({
                "keyword": phrase,
                "intent": "informational",
                "priority": priority,
                "estimated_volume": "medium",
            })

    # Fill with top single words
    for word, count in word_counter.most_common(30):
        if len(keywords) >= 20:
            break
        # Skip words already in bigrams
        if any(word in kw["keyword"] for kw in keywords):
            continue
        priority = "high" if count >= 5 else "medium" if count >= 3 else "low"
        keywords.append({
            "keyword": word,
            "intent": "informational",
            "priority": priority,
            "estimated_volume": "medium",
        })

    return keywords[:20]


def _fallback_analysis(domain: str, pages_data: list[dict], backlink_profile: dict | None = None, domdetailer_metrics: dict | None = None) -> dict:
    """Generate a basic analysis without AI, using improved heuristics."""
    # Niche: use the full homepage title (split on separators), not just 3 words
    niches = []
    if pages_data:
        homepage = pages_data[0]
        title = homepage.get("title", "") or homepage.get("h1", "")
        if title:
            # Split on common separators and take the first meaningful part
            main_title = re.split(r"\s*[|\-–—:]\s*", title)[0].strip()
            if main_title and len(main_title) > 3:
                niches.append(main_title[:60])

            # Try to get more niches from meta descriptions of first pages
            for page in pages_data[:5]:
                meta = page.get("meta_description", "")
                if meta and len(meta) > 20:
                    first_sentence = meta.split(".")[0].strip()[:60]
                    if first_sentence and first_sentence not in niches:
                        niches.append(first_sentence)
                        if len(niches) >= 3:
                            break

    if not niches:
        niches = ["Site web"]
    niche = niches[0]

    # Keywords
    keywords = _extract_keywords_by_frequency(pages_data)

    # Target pages with language detection (use language stored during crawl)
    target_pages = []
    if pages_data:
        target_pages.append({
            "url": pages_data[0]["url"],
            "reason": "Page d'accueil - page principale du site",
            "language": pages_data[0].get("language") or "fr",
        })
        for page in pages_data[1:8]:
            if page.get("title"):
                lang = page.get("language", "unknown")
                target_pages.append({
                    "url": page["url"],
                    "reason": f"Page importante: {page['title'][:80]}",
                    "language": lang if lang != "unknown" else "fr",
                })

    # Anchors with 3-category system
    brand_name = domain.split(".")[0].capitalize()
    suggested_anchors = [
        # Brand anchors (~30%)
        {"text": brand_name, "type": "brand", "weight": 15},
        {"text": f"https://{domain}", "type": "naked_url", "weight": 10},
        {"text": f"{brand_name}.{domain.split('.')[-1]}", "type": "brand", "weight": 5},
        # Generic anchors (~20%)
        {"text": "cliquez ici", "type": "generic", "weight": 10},
        {"text": "en savoir plus", "type": "generic", "weight": 5},
        {"text": "voir le site", "type": "generic", "weight": 5},
    ]

    # Semi-optimized anchors (~25%) - natural phrases with keywords
    if keywords:
        semi_texts = [
            f"decouvrez {keywords[0]['keyword']}",
            f"en savoir plus sur {keywords[1]['keyword']}" if len(keywords) > 1 else f"tout sur {keywords[0]['keyword']}",
        ]
        semi_weight_per = 25 // len(semi_texts)
        for text in semi_texts:
            suggested_anchors.append({"text": text, "type": "semi_optimized", "weight": semi_weight_per})

    # Optimized anchors (~25%) - exact keywords
    remaining_weight = 100 - sum(a["weight"] for a in suggested_anchors)
    kw_count = min(3, len(keywords))
    per_kw = remaining_weight // max(kw_count, 1)
    for kw in keywords[:kw_count]:
        suggested_anchors.append({"text": kw["keyword"], "type": "optimized", "weight": per_kw})

    # Fix weight sum to 100
    current_sum = sum(a["weight"] for a in suggested_anchors)
    if current_sum != 100 and suggested_anchors:
        suggested_anchors[-1]["weight"] += 100 - current_sum

    # ── Adjust anchors based on existing backlink profile ──────────
    if backlink_profile and backlink_profile.get("total", 0) > 0:
        dist = backlink_profile.get("distribution", {})
        keyword_pct = dist.get("keyword_based", 0)
        brand_pct = dist.get("brand", 0)

        if keyword_pct > 35:
            # Over-optimized: reduce optimized anchors, boost brand/generic
            for a in suggested_anchors:
                if a["type"] == "optimized":
                    a["weight"] = max(2, a["weight"] - 5)
                elif a["type"] in ("brand", "generic"):
                    a["weight"] += 3
        if brand_pct < 15:
            # Under-branded: boost brand anchors
            for a in suggested_anchors:
                if a["type"] == "brand":
                    a["weight"] += 4

        # Re-normalize to 100
        total_w = sum(a["weight"] for a in suggested_anchors)
        if total_w > 0 and total_w != 100:
            factor = 100 / total_w
            for a in suggested_anchors:
                a["weight"] = round(a["weight"] * factor, 1)
            # Fix rounding
            diff = round(100 - sum(a["weight"] for a in suggested_anchors), 1)
            if diff != 0 and suggested_anchors:
                suggested_anchors[0]["weight"] = round(suggested_anchors[0]["weight"] + diff, 1)

    # ── Generate heuristic recommendations ─────────────────────────
    recommendations = []

    # Default content recommendations
    recommendations.append({
        "type": "content",
        "suggestion": "Créer du contenu informatif de qualité (guides, articles de blog) pour attirer des backlinks naturels",
        "priority": "high",
    })

    if keywords:
        top_kw = keywords[0]["keyword"]
        recommendations.append({
            "type": "content",
            "suggestion": f"Rédiger un guide complet sur « {top_kw} » pour se positionner comme référence",
            "priority": "medium",
        })

    if backlink_profile and backlink_profile.get("total", 0) > 0:
        dist = backlink_profile.get("distribution", {})
        keyword_pct = dist.get("keyword_based", 0)
        brand_pct = dist.get("brand", 0)

        if keyword_pct > 40:
            recommendations.append({
                "type": "anchor_strategy",
                "suggestion": f"Profil d'ancres sur-optimisé ({keyword_pct:.0f}% mot-clé). Diversifier avec plus d'ancres de marque et génériques",
                "priority": "high",
            })
        elif keyword_pct < 15:
            recommendations.append({
                "type": "anchor_strategy",
                "suggestion": f"Peu d'ancres optimisées ({keyword_pct:.0f}%). Ajouter des backlinks avec ancres contenant vos mots-clés cibles",
                "priority": "medium",
            })

        if brand_pct < 20:
            recommendations.append({
                "type": "anchor_strategy",
                "suggestion": f"Ancres de marque sous-représentées ({brand_pct:.0f}%). Augmenter les mentions de marque dans les backlinks",
                "priority": "medium",
            })
    else:
        recommendations.append({
            "type": "link_type",
            "suggestion": "Aucun backlink détecté. Commencer par des inscriptions dans des annuaires de qualité et des articles invités",
            "priority": "high",
        })

    if domdetailer_metrics:
        nofollow_ratio = domdetailer_metrics.get("nofollow_ratio")
        if nofollow_ratio and float(nofollow_ratio) > 60:
            recommendations.append({
                "type": "link_type",
                "suggestion": f"Ratio nofollow élevé ({nofollow_ratio}%). Prioriser les guest posts et partenariats pour des liens dofollow",
                "priority": "high",
            })

        gov_links = domdetailer_metrics.get("links_from_gov", 0)
        edu_links = domdetailer_metrics.get("links_from_edu", 0)
        if int(gov_links or 0) == 0 and int(edu_links or 0) == 0:
            recommendations.append({
                "type": "link_type",
                "suggestion": "Aucun lien .gov ou .edu. Rechercher des opportunités dans les annuaires institutionnels et universitaires",
                "priority": "low",
            })
    else:
        recommendations.append({
            "type": "link_type",
            "suggestion": "Développer une stratégie de guest blogging sur des sites à forte autorité dans votre niche",
            "priority": "medium",
        })

    # Page priority recommendation
    if target_pages:
        recommendations.append({
            "type": "page_priority",
            "suggestion": f"Concentrer les efforts de netlinking sur la page d'accueil et les {min(3, len(target_pages))} pages cibles principales",
            "priority": "medium",
        })

    return {
        "niche": niche,
        "niches": niches,
        "keywords": keywords,
        "target_pages": target_pages[:8],
        "suggested_anchors": suggested_anchors,
        "competitor_domains": [],
        "content_gaps": recommendations,
        "analysis_method": "fallback_frequency",
    }


# ── Database Persistence ──────────────────────────────────────────────


async def _save_analysis(project_id: str, analysis: dict) -> bool:
    """Save analysis results to the project in the database."""
    from sqlalchemy import select
    from backend.db.database import async_session
    from backend.models.models import Project
    
    try:
        # Use the existing async session factory
        async with async_session() as session:
            # Get project with a fresh query
            result = await session.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one_or_none()
            
            if not project:
                print(f"[SiteAnalyzer] ERROR: Project {project_id} not found in DB")
                return False

            # Update project fields
            project.niche = analysis.get("niche", "")
            project.keywords = analysis.get("keywords", [])
            project.target_urls = analysis.get("target_pages", [])
            project.anchors = analysis.get("suggested_anchors", [])
            
            # Mark analysis as completed so the frontend stops showing the spinner
            analysis["status"] = "completed"
            project.site_analysis = analysis
            
            await session.commit()
            niche_preview = (project.niche[:30] + "...") if project.niche and len(project.niche) > 30 else (project.niche or "N/A")
            print(f"[SiteAnalyzer] ✓ SAVED: {project_id} | niche={niche_preview} | {len(project.keywords)} keywords")
            return True
            
    except Exception as e:
        print(f"[SiteAnalyzer] ERROR saving {project_id}: {e}")
        import traceback
        traceback.print_exc()
        return False
# ── Main Entry Point ──────────────────────────────────────────────────


async def analyze_site(project_id: str, domain: str, target_language: str | None = None):
    """
    Main entry point. Crawls the site, fetches sitemap, analyzes backlink profile,
    then runs AI analysis (or fallback) and saves results.

    Designed to run as a FastAPI BackgroundTask:
        background_tasks.add_task(analyze_site, project_id, domain)
    """
    print(f"[SiteAnalyzer] Starting analysis for {domain} (project: {project_id}, lang: {target_language or 'auto'})")

    # ── Step 1: Fetch Sitemap ─────────────────────────────────────────
    sitemap_pages: list[dict] = []
    try:
        sitemap_pages = await _fetch_sitemap(domain)
        print(f"[SiteAnalyzer] Sitemap: {len(sitemap_pages)} URLs found")
    except Exception as e:
        print(f"[SiteAnalyzer] Sitemap fetch failed: {e}")

    # ── Step 2: Crawl ─────────────────────────────────────────────────
    crawl_language = target_language or "fr"
    favicon_url = None
    try:
        pages_data, favicon_url = await crawl_site(domain, target_language=crawl_language)
        if favicon_url:
            print(f"[SiteAnalyzer] Favicon detected: {favicon_url}")
    except Exception as e:
        print(f"[SiteAnalyzer] Crawl failed for {domain}: {e}")
        pages_data = []

    # Auto-detect language if not specified
    detected_language = crawl_language
    if not target_language and sitemap_pages:
        # Use sitemap language distribution to detect dominant language
        lang_counts: Counter = Counter()
        for sp in sitemap_pages:
            lang = sp.get("language", "unknown")
            if lang != "unknown":
                lang_counts[lang] += 1
        if lang_counts:
            detected_language = lang_counts.most_common(1)[0][0]
            print(f"[SiteAnalyzer] Auto-detected language: {detected_language}")

    if not pages_data:
        print(f"[SiteAnalyzer] No pages crawled from {domain}, saving minimal analysis")
        analysis = {
            "niche": "",
            "niches": [],
            "keywords": [],
            "target_pages": [{"url": f"https://{domain}", "reason": "Page d'accueil", "language": detected_language}],
            "suggested_anchors": [
                {"text": domain.split(".")[0].capitalize(), "type": "brand", "weight": 50},
                {"text": f"https://{domain}", "type": "naked_url", "weight": 30},
                {"text": "cliquez ici", "type": "generic", "weight": 20},
            ],
            "competitor_domains": [],
            "content_gaps": [],
            "pages_crawled": 0,
            "analysis_method": "none",
            "detected_language": detected_language,
        }
        await _save_analysis(project_id, analysis)
        return analysis

    # ── Step 2b: Import DomDetailer Backlinks ─────────────────────────
    domdetailer_metrics = None
    try:
        domdetailer_metrics = await _import_domdetailer_backlinks(project_id, domain)
        if domdetailer_metrics:
            print(f"[SiteAnalyzer] DomDetailer metrics imported for {domain}")
    except Exception as e:
        print(f"[SiteAnalyzer] DomDetailer import failed: {e}")

    # ── Step 2c: Fetch domain metrics ─────────────────────────────────
    domain_metrics = None
    try:
        from backend.services.domdetailer import fetch_domain_metrics
        domain_metrics = await fetch_domain_metrics(domain)
        if domain_metrics:
            print(f"[SiteAnalyzer] Domain metrics fetched for {domain}")
    except Exception as e:
        print(f"[SiteAnalyzer] Domain metrics fetch failed: {e}")

    # ── Step 3: Analyze Backlink Profile ──────────────────────────────
    backlink_profile = await _analyze_backlink_profile(project_id, domain)

    # Normalize keys for frontend compatibility
    backlink_profile["distribution"] = backlink_profile.pop("anchor_distribution", {})
    backlink_profile["total"] = backlink_profile.pop("total_backlinks", 0)

    # ── Step 4: AI or Fallback Analysis ───────────────────────────────
    analysis = None
    if settings.openrouter_api_key:
        print(f"[SiteAnalyzer] Using AI analysis for {domain}")
        analysis = await _analyze_with_ai(domain, pages_data, target_language=detected_language, backlink_profile=backlink_profile, domdetailer_metrics=domdetailer_metrics)
        if analysis:
            analysis["analysis_method"] = "ai"

    if not analysis:
        print(f"[SiteAnalyzer] Using fallback analysis for {domain}")
        analysis = _fallback_analysis(domain, pages_data, backlink_profile=backlink_profile, domdetailer_metrics=domdetailer_metrics)
        analysis["analysis_method"] = "fast_fallback"

    # ── Step 5: Merge sitemap data ────────────────────────────────────
    if sitemap_pages:
        analysis["sitemap_pages"] = sitemap_pages[:200]
        pages_by_lang: dict[str, int] = {}
        for sp in sitemap_pages:
            lang = sp.get("language", "unknown")
            pages_by_lang[lang] = pages_by_lang.get(lang, 0) + 1
        analysis["sitemap_languages"] = pages_by_lang

    # ── Step 6: Add backlink profile ──────────────────────────────────
    analysis["backlink_profile"] = backlink_profile

    # ── Step 7: Ensure niches list ────────────────────────────────────
    if "niches" not in analysis:
        analysis["niches"] = [analysis.get("niche", "Site web")]

    # ── Step 8: Add metadata and save ─────────────────────────────────
    analysis["pages_crawled"] = len(pages_data)
    analysis["domain"] = domain
    analysis["detected_language"] = detected_language
    analysis["language"] = detected_language
    if favicon_url:
        analysis["favicon_url"] = favicon_url
    if domain_metrics:
        analysis["domain_metrics"] = domain_metrics

    await _save_analysis(project_id, analysis)

    print(f"[SiteAnalyzer] Analysis complete for {domain}: niche='{analysis.get('niche')}', "
          f"{len(analysis.get('keywords', []))} keywords, "
          f"{len(analysis.get('target_pages', []))} target pages, "
          f"lang={detected_language}")

    return analysis
