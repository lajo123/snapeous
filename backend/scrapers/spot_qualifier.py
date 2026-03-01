"""SpotSEO - Spot Qualifier.

Visits each discovered spot URL and detects platform/CMS, spot type,
comment forms, registration options, URL fields, dofollow status, and
computes a quality score.

Does NOT persist anything to DB — returns updated spot attributes for
the caller to commit.
"""

import asyncio
import random
import re
from types import SimpleNamespace
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from backend.config import settings

# ── Constants ──────────────────────────────────────────────────────────

REQUEST_TIMEOUT = 20.0
MAX_BATCH_SIZE = 20
DELAY_BETWEEN_SPOTS = 1.0

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
    "Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) "
    "Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]

# ── Platform Signatures ───────────────────────────────────────────────

PLATFORM_SIGNATURES: dict[str, list[str]] = {
    "WordPress": [
        "wp-content", "wp-includes", "Propulsé par WordPress",
        "wp-login.php",
    ],
    "phpBB": ["phpbb", "viewtopic.php", "viewforum.php"],
    "vBulletin": ["vbulletin", "showthread.php"],
    "XenForo": ["xenforo", "Powered by XenForo"],
    "Forumactif": ["forumactif", "forum gratuit"],
    "Joomla": ["joomla", "/components/com_"],
    "Drupal": ["drupal", "sites/default/files"],
    "Blogger": ["blogspot.com", "blogger.com"],
    "Medium": ["medium.com"],
    "SPIP": ["spip.php"],
    "MediaWiki": ["mediawiki", "action=edit"],
}

# ── Spot Type Patterns ────────────────────────────────────────────────
# Each key maps to keywords used for both URL matching (+3) and
# HTML content matching (+1).

SPOT_TYPE_PATTERNS: dict[str, list[str]] = {
    "blog": ["blog", "article", "post", "actualite", "news"],
    "forum": ["forum", "discussion", "topic", "thread", "sujet"],
    "directory": ["annuaire", "directory", "listing", "repertoire"],
    "guestbook": ["livre-d-or", "guestbook"],
    "wiki": ["wiki", "mediawiki"],
    "social": ["profil", "profile", "membre", "member"],
    "news": ["actualite", "news", "presse", "journal"],
}

# ── Helpers ────────────────────────────────────────────────────────────


def _build_headers() -> dict[str, str]:
    """Return realistic browser headers."""
    ua = random.choice(USER_AGENTS)
    return {
        "User-Agent": ua,
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,"
            "image/avif,image/webp,image/apng,*/*;q=0.8"
        ),
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


async def _fetch_html(url: str) -> str | None:
    """Fetch HTML content of a URL. Returns None on failure."""
    proxy_url = settings.decodo_proxy_url
    proxy_kwarg = {"proxy": proxy_url} if proxy_url else {}

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
        verify=False,
        **proxy_kwarg,
    ) as client:
        response = await client.get(url, headers=_build_headers())
        if response.status_code != 200:
            print(
                f"[QUALIFIER] HTTP {response.status_code} for "
                f"{url[:80]}"
            )
            return None
        return response.text


# ── Detection Functions ────────────────────────────────────────────────


def _check_content_relevance(html: str, soup: BeautifulSoup, search_keyword: str) -> dict:
    """
    Check if page content is relevant to the search keyword.
    Returns dict with relevance score and flags.
    
    Example: searching for 'cv' (curriculum) should not match 'cv' (chevaux fiscaux)
    """
    html_lower = html.lower()
    title = soup.find('title')
    title_text = title.get_text(strip=True).lower() if title else ""
    
    # Get meta description
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    meta_text = meta_desc.get('content', '').lower() if meta_desc else ""
    
    # Common disambiguation keywords
    disambiguation = {
        'cv': {
            'positive': ['curriculum', 'emploi', 'recrutement', 'travail', 'carrière', 'professionnel', 
                        'resume', 'job', 'career', 'work', 'professional', 'template', 'modèle'],
            'negative': ['cheval', 'chevaux', 'fiscal', 'puissance', 'moteur', 'voiture', 'automobile',
                        'car', 'horsepower', 'fiscal horsepower', ' taxation']
        }
    }
    
    relevance_score = 0
    flags = []
    
    # Check if we have disambiguation rules for this keyword
    keyword_lower = search_keyword.lower().strip()
    if keyword_lower in disambiguation:
        rules = disambiguation[keyword_lower]
        
        # Check positive indicators
        for term in rules['positive']:
            if term in title_text:
                relevance_score += 3
            if term in meta_text:
                relevance_score += 2
            if term in html_lower[:5000]:  # First 5000 chars only
                relevance_score += 1
        
        # Check negative indicators
        for term in rules['negative']:
            if term in title_text:
                relevance_score -= 5
                flags.append(f"negative:{term}")
            elif term in meta_text:
                relevance_score -= 3
                flags.append(f"negative:{term}")
    
    return {
        'score': relevance_score,
        'flags': flags,
        'is_relevant': relevance_score >= 0
    }


def _detect_platform(html: str, soup: BeautifulSoup) -> str | None:
    """Detect the CMS/platform from HTML content and meta tags."""
    html_lower = html.lower()

    # Check meta generator tag first (most reliable)
    meta_gen = soup.find("meta", attrs={"name": re.compile(r"generator", re.I)})
    if meta_gen:
        gen_content = (meta_gen.get("content") or "").lower()
        for platform, _sigs in PLATFORM_SIGNATURES.items():
            if platform.lower() in gen_content:
                return platform

    # Fall back to HTML signature scanning
    for platform, signatures in PLATFORM_SIGNATURES.items():
        for sig in signatures:
            if sig.lower() in html_lower:
                return platform

    return None


def _detect_spot_type(url: str, html: str) -> str | None:
    """
    Detect spot type by scoring URL patterns (+3) and HTML content (+1).
    Returns the type with the highest score, or None.
    """
    url_lower = url.lower()
    html_lower = html.lower()
    scores: dict[str, int] = {}

    for spot_type, keywords in SPOT_TYPE_PATTERNS.items():
        score = 0
        for kw in keywords:
            if kw in url_lower:
                score += 3
            if kw in html_lower:
                score += 1
        if score > 0:
            scores[spot_type] = score

    if not scores:
        return None

    return max(scores, key=scores.get)


def _detect_comment_form(html: str, soup: BeautifulSoup) -> bool:
    """Detect whether the page has a comment form."""
    # Direct CSS selectors
    if soup.select_one("form#commentform"):
        return True
    if soup.select_one("textarea#comment"):
        return True

    # Search for forms containing comment-related words
    html_lower = html.lower()
    comment_words = ["comment", "commentaire", "répondre", "avis"]
    for form in soup.find_all("form"):
        form_html = str(form).lower()
        for word in comment_words:
            if word in form_html:
                return True

    # Also check if the words appear near form-like elements
    for word in comment_words:
        # Look for textareas or inputs near comment-related text
        pattern = rf'<(?:form|textarea)[^>]*{re.escape(word)}[^>]*>'
        if re.search(pattern, html_lower):
            return True

    return False


def _detect_registration(html: str, soup: BeautifulSoup) -> bool:
    """Detect whether the page offers user registration."""
    html_lower = html.lower()
    registration_words = [
        "inscription", "register", "créer un compte",
        "s'inscrire", "s&#39;inscrire", "sign up", "signup",
    ]

    # Check body text
    for word in registration_words:
        if word in html_lower:
            return True

    # Check link texts and hrefs
    for a_tag in soup.find_all("a", href=True):
        link_text = a_tag.get_text(strip=True).lower()
        href = (a_tag.get("href") or "").lower()
        for word in registration_words:
            if word in link_text or word in href:
                return True

    return False


def _detect_url_field(soup: BeautifulSoup) -> bool:
    """Detect whether the page has a URL input field."""
    # input[type=url]
    if soup.select_one('input[type="url"]') or soup.select_one("input[type='url']"):
        return True

    # input with name/id/placeholder containing URL-related words
    url_words = ["url", "site", "website", "web", "homepage"]
    for input_tag in soup.find_all("input"):
        for attr in ("name", "id", "placeholder"):
            val = (input_tag.get(attr) or "").lower()
            for word in url_words:
                if word in val:
                    return True

    return False


def _detect_dofollow(html: str, soup: BeautifulSoup, url: str) -> str | None:
    """
    Detect dofollow/nofollow status of external links.

    Returns:
        "dofollow" - at least one external link without rel=nofollow
        "nofollow" - all external links have rel=nofollow
        "mix" - some dofollow, some nofollow
        None - no external links found
    """
    # Find the main content area
    main_content = (
        soup.find("main")
        or soup.find("article")
        or soup.find("body")
    )
    if not main_content:
        return None

    # Determine the spot's domain for filtering external links
    try:
        spot_domain = urlparse(url).hostname or ""
    except Exception:
        spot_domain = ""

    dofollow_count = 0
    nofollow_count = 0

    for a_tag in main_content.find_all("a", href=True):
        href = a_tag.get("href", "")
        if not href.startswith("http"):
            continue

        # Skip internal links
        try:
            link_domain = urlparse(href).hostname or ""
        except Exception:
            continue

        if not link_domain:
            continue

        # Consider it external if the domain differs
        if spot_domain and (
            link_domain == spot_domain
            or link_domain.endswith(f".{spot_domain}")
            or spot_domain.endswith(f".{link_domain}")
        ):
            continue

        # Check rel attribute for nofollow
        rel = (a_tag.get("rel") or [])
        if isinstance(rel, str):
            rel = rel.lower().split()
        else:
            rel = [r.lower() for r in rel]

        if "nofollow" in rel or "ugc" in rel or "sponsored" in rel:
            nofollow_count += 1
        else:
            dofollow_count += 1

    if dofollow_count == 0 and nofollow_count == 0:
        return None
    if dofollow_count > 0 and nofollow_count == 0:
        return "dofollow"
    if dofollow_count == 0 and nofollow_count > 0:
        return "nofollow"
    return "mix"


def _detect_actionable_features(html: str, soup: BeautifulSoup) -> dict:
    """
    Detect broader actionable features beyond just comment forms.
    Returns dict with detected features.
    """
    html_lower = html.lower()
    features = {
        "has_contact_form": False,
        "has_submit_button": False,
        "has_textarea": False,
        "has_external_links_section": False,
    }

    # Check for any form with a textarea (could be contact, comment, etc.)
    for form in soup.find_all("form"):
        if form.find("textarea"):
            features["has_textarea"] = True
        # Check for submit buttons
        submit = form.find("input", {"type": "submit"}) or form.find("button", {"type": "submit"})
        if submit:
            features["has_submit_button"] = True

    # Contact form detection
    contact_words = ["contact", "nous contacter", "envoyer un message", "formulaire"]
    for word in contact_words:
        if word in html_lower:
            for form in soup.find_all("form"):
                form_html = str(form).lower()
                if word in form_html or "email" in form_html:
                    features["has_contact_form"] = True
                    break

    # External links section (blogroll, partenaires, liens utiles)
    link_section_words = ["partenaires", "liens utiles", "blogroll", "sites amis", "ressources"]
    for word in link_section_words:
        if word in html_lower:
            features["has_external_links_section"] = True
            break

    return features


def _compute_quality_score(
    has_comment_form: bool,
    has_url_field: bool,
    has_registration: bool,
    dofollow_status: str | None,
    platform: str | None,
    spot_type: str | None,
    actionable_features: dict | None = None,
) -> float:
    """
    Compute a quality score from 0 to 100 based on detected features.

    The score focuses on ACTIONABILITY — can we actually place a link here?

    Scoring:
        Base score:             10
        Has comment form:      +20  (primary indicator)
        Has URL field:         +15  (can leave URL)
        Has registration:       +5  (can create account)
        Is dofollow:           +20
        Is mix:                +10
        Platform detected:      +5  (known CMS = predictable)
        Spot type detected:     +5
        Has textarea (any):    +10  (can write content)
        Has contact form:       +5  (can reach out)
        Has links section:      +5  (blogroll, partenaires)
    """
    score = 10.0

    if has_comment_form:
        score += 20.0
    if has_url_field:
        score += 15.0
    if has_registration:
        score += 5.0
    if dofollow_status == "dofollow":
        score += 20.0
    elif dofollow_status == "mix":
        score += 10.0
    if platform:
        score += 5.0
    if spot_type:
        score += 5.0

    # Bonus from actionable features
    if actionable_features:
        if actionable_features.get("has_textarea") and not has_comment_form:
            score += 10.0
        if actionable_features.get("has_contact_form"):
            score += 5.0
        if actionable_features.get("has_external_links_section"):
            score += 5.0

    return min(score, 100.0)


# ── Main Qualifier Functions ───────────────────────────────────────────


async def qualify_single_spot(spot) -> object:
    """
    Qualify a single spot by visiting its URL and detecting features.

    Takes a Spot model instance (or any object with a `.url` attribute),
    updates its fields in place, and returns it.

    Updated fields:
        - detected_platform
        - detected_link_type
        - has_comment_form
        - has_registration
        - has_url_field
        - spot_type
        - quality_score
        - status (set to "qualified")

    On failure, the spot is returned with its fields unchanged.
    """
    url = spot.url

    try:
        print(f"[QUALIFIER] Qualifying: {url[:80]}")

        html = await _fetch_html(url)
        if html is None:
            print(f"[QUALIFIER] Could not fetch: {url[:80]}")
            spot.quality_score = 0.0
            return spot

        # Check if response is actually HTML-like content
        # Be permissive: SPA pages may not have <html> at start but still work
        html_lower_start = html.lower()[:2000]
        is_html = (
            "<html" in html_lower_start
            or "<!doctype" in html_lower_start
            or "<head" in html_lower_start
            or "<body" in html_lower_start
            or "<div" in html_lower_start
            or "<script" in html_lower_start  # SPA with JS
        )
        # Also check for obvious non-HTML (PDF binary, raw JSON, etc.)
        is_binary = html[:4] in ("%PDF", "\x89PNG", "GIF8", "\xff\xd8")
        if len(html) < 100 or is_binary or (not is_html and len(html) < 500):
            print(f"[QUALIFIER] Not HTML content: {url[:80]}")
            spot.quality_score = 0.0
            return spot

        soup = BeautifulSoup(html, "lxml")

        # Run all detections
        platform = _detect_platform(html, soup)
        spot_type = _detect_spot_type(url, html)
        has_comment = _detect_comment_form(html, soup)
        has_registration = _detect_registration(html, soup)
        has_url = _detect_url_field(soup)
        dofollow_status = _detect_dofollow(html, soup, url)
        actionable_features = _detect_actionable_features(html, soup)

        # Compute quality score
        quality = _compute_quality_score(
            has_comment_form=has_comment,
            has_url_field=has_url,
            has_registration=has_registration,
            dofollow_status=dofollow_status,
            platform=platform,
            spot_type=spot_type,
            actionable_features=actionable_features,
        )

        # Update spot attributes
        spot.detected_platform = platform
        spot.detected_link_type = dofollow_status
        spot.has_comment_form = has_comment
        spot.has_registration = has_registration
        spot.has_url_field = has_url
        spot.spot_type = spot_type
        spot.quality_score = quality
        spot.status = "qualified"

        print(
            f"[QUALIFIER] Done: {url[:60]} | "
            f"platform={platform} type={spot_type} "
            f"dofollow={dofollow_status} comment={has_comment} "
            f"url_field={has_url} score={quality:.0f}"
        )

    except httpx.TimeoutException:
        print(f"[QUALIFIER] Timeout: {url[:80]}")
    except httpx.HTTPError as exc:
        print(f"[QUALIFIER] HTTP error for {url[:60]}: {exc}")
    except Exception as exc:
        print(f"[QUALIFIER] Unexpected error for {url[:60]}: {exc}")

    return spot


async def qualify_spots(spots: list) -> list:
    """
    Qualify multiple spots sequentially with a delay between each.

    Processes at most MAX_BATCH_SIZE (20) spots per call.

    Returns the list of spots with updated attributes. The caller is
    responsible for persisting changes to the database.
    """
    batch = spots[:MAX_BATCH_SIZE]
    results = []

    print(
        f"[QUALIFIER] Starting batch qualification: "
        f"{len(batch)} spots (max {MAX_BATCH_SIZE})"
    )

    for idx, spot in enumerate(batch):
        result = await qualify_single_spot(spot)
        results.append(result)

        # Delay between spots (skip after last one)
        if idx < len(batch) - 1:
            await asyncio.sleep(DELAY_BETWEEN_SPOTS)

    qualified_count = sum(
        1 for s in results
        if getattr(s, "status", None) == "qualified"
    )
    print(
        f"[QUALIFIER] Batch complete: {qualified_count}/{len(batch)} "
        f"successfully qualified"
    )

    return results
