"""Snapeous - FastAPI application with all API routes."""

import asyncio
import csv
import io
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, delete, case, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db.database import get_db
from backend.auth import get_current_user
from backend.models.models import (
    Project, Footprint, Search, Spot, Backlink, BacklinkHistory,
    Subscription, SubscriptionPlan, SubscriptionStatus, BillingInterval,
    ProjectStatus, FootprintCategory, LinkType, Difficulty,
    SearchStatus, SpotStatus, BacklinkStatus, BacklinkLinkType,
)
from backend.services.backlink_history import record_history
from backend.subscription import get_user_subscription, check_domain_limit, check_backlink_limit
from backend.plans import PLAN_LIMITS, get_plan_limits

# ── App Setup ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Snapeous",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vercel serves frontend & API from same origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Note: init_db() removed — tables are managed in Supabase directly.
# No need to run create_all on every serverless cold start.


async def _verify_project_owner(
    project_id: str,
    db: AsyncSession,
    user_id: str,
) -> Project:
    """Verify the project exists and belongs to the current user."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return project


# ── Pydantic Schemas ──────────────────────────────────────────────────


# Projects
class ProjectCreate(BaseModel):
    name: str
    client_domain: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_domain: Optional[str] = None
    status: Optional[str] = None
    keywords: Optional[list] = None
    anchors: Optional[list] = None
    target_urls: Optional[list] = None
    niche: Optional[str] = None
    niches: Optional[list[str]] = None
    scoring_weights: Optional[dict] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    client_domain: str
    target_urls: Optional[list] = None
    keywords: Optional[list] = None
    anchors: Optional[list] = None
    niche: Optional[str] = None
    niches: Optional[list[str]] = None
    scoring_weights: Optional[dict] = None
    site_analysis: Optional[dict] = None
    status: str
    created_at: datetime
    updated_at: datetime
    spots_count: int = 0
    searches_count: int = 0

    model_config = {"from_attributes": True}


# Footprints
class FootprintCreate(BaseModel):
    name: str
    category: str
    subcategory: Optional[str] = None
    query_template: str
    expected_link_type: str = "nofollow"
    difficulty: str = "medium"
    platform_target: Optional[str] = None
    language: str = "fr"
    description: Optional[str] = None
    tags: Optional[list] = None


class FootprintOut(BaseModel):
    id: str
    name: str
    category: str
    subcategory: Optional[str] = None
    query_template: str
    expected_link_type: str
    difficulty: str
    platform_target: Optional[str] = None
    language: str
    description: Optional[str] = None
    is_custom: bool
    tags: Optional[list] = None
    success_rate: float
    usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# Search
class SearchCreate(BaseModel):
    project_id: str
    footprint_ids: list[str] = []
    keywords: list[str] = []
    num_results: int = 100
    auto_qualify: bool = True


class SearchBulk(BaseModel):
    project_id: str
    categories: list[str] = []
    max_keywords: int = 10
    num_results_per_query: int = 100


class SearchOut(BaseModel):
    id: str
    project_id: str
    footprint_id: Optional[str] = None
    query_used: str
    keyword: Optional[str] = None
    results_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Spots
class SpotUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class SpotOut(BaseModel):
    id: str
    project_id: str
    search_id: Optional[str] = None
    url: str
    domain: str
    title: Optional[str] = None
    description: Optional[str] = None
    serp_position: Optional[int] = None
    da: Optional[int] = None
    dr: Optional[int] = None
    tf: Optional[int] = None
    cf: Optional[int] = None
    spam_score: Optional[float] = None
    organic_traffic: Optional[int] = None
    detected_platform: Optional[str] = None
    detected_link_type: Optional[str] = None
    has_comment_form: Optional[bool] = None
    has_registration: Optional[bool] = None
    has_url_field: Optional[bool] = None
    quality_score: Optional[float] = None
    spot_type: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# Settings
class SettingsOut(BaseModel):
    has_ai: bool
    has_proxy: bool
    has_dataforseo: bool
    has_serpapi: bool
    has_speedyindex: bool
    has_domdetailer: bool
    openrouter_model: str
    debug: bool


class SettingsUpdate(BaseModel):
    openrouter_api_key: Optional[str] = None
    decodo_proxy_host: Optional[str] = None
    decodo_proxy_port: Optional[int] = None
    decodo_proxy_user: Optional[str] = None
    decodo_proxy_pass: Optional[str] = None


# Backlinks
class BacklinkCreate(BaseModel):
    source_url: str
    target_url: Optional[str] = None
    anchor_text: Optional[str] = None
    link_type: Optional[str] = "dofollow"


class BacklinkUpdate(BaseModel):
    source_url: Optional[str] = None
    target_url: Optional[str] = None
    anchor_text: Optional[str] = None
    link_type: Optional[str] = None
    status: Optional[str] = None


class BacklinkOut(BaseModel):
    id: str
    project_id: str
    source_url: str
    target_url: Optional[str] = None
    anchor_text: Optional[str] = None
    source_domain: Optional[str] = None
    target_domain: Optional[str] = None
    http_code: Optional[int] = None
    links_on_page: Optional[int] = None
    link_type: Optional[str] = None
    status: str
    domain_rank: Optional[int] = None
    url_rank: Optional[int] = None
    backlinks_count: Optional[int] = None
    referring_domains: Optional[int] = None
    dofollow_backlinks: Optional[int] = None
    nofollow_backlinks: Optional[int] = None
    gov_backlinks: Optional[int] = None
    edu_backlinks: Optional[int] = None
    dofollow_referring: Optional[int] = None
    nofollow_referring: Optional[int] = None
    gov_referring: Optional[int] = None
    edu_referring: Optional[int] = None
    is_indexed: Optional[bool] = None
    index_checked_at: Optional[datetime] = None
    first_check_at: Optional[datetime] = None
    last_check_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BacklinkImportItem(BaseModel):
    source_url: str


# ── Health ─────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Snapeous", "version": "1.0.0"}


# ── Turnstile Verification ───────────────────────────────────────────


class TurnstileVerifyRequest(BaseModel):
    token: str


@app.post("/api/auth/verify-turnstile")
async def verify_turnstile(body: TurnstileVerifyRequest, request: Request):
    """Verify a Cloudflare Turnstile token server-side."""
    if not settings.turnstile_secret_key:
        return {"success": True}

    # Allow localhost bypass in debug mode
    if settings.debug and body.token == "localhost-bypass":
        return {"success": True}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": settings.turnstile_secret_key,
                "response": body.token,
                "remoteip": request.client.host if request.client else None,
            },
        )
        result = resp.json()

    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Vérification Turnstile échouée. Veuillez réessayer.")

    return {"success": True}


# ── Settings Routes ───────────────────────────────────────────────────


@app.get("/api/settings", response_model=SettingsOut)
async def get_settings():
    return SettingsOut(
        has_ai=settings.has_ai,
        has_proxy=settings.has_proxy,
        has_dataforseo=settings.has_dataforseo,
        has_serpapi=settings.has_serpapi,
        has_speedyindex=settings.has_speedyindex,
        has_domdetailer=settings.has_domdetailer,
        openrouter_model=settings.openrouter_model,
        debug=settings.debug,
    )


# ── Project Routes ────────────────────────────────────────────────────


@app.get("/api/projects", response_model=list[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    out = []
    for p in projects:
        # Count spots and searches
        spots_q = await db.execute(
            select(func.count(Spot.id)).where(Spot.project_id == p.id)
        )
        searches_q = await db.execute(
            select(func.count(Search.id)).where(Search.project_id == p.id)
        )
        proj_dict = {
            "id": p.id,
            "name": p.name,
            "client_domain": p.client_domain,
            "target_urls": p.target_urls,
            "keywords": p.keywords,
            "anchors": p.anchors,
            "niche": p.niche,
            "niches": (p.site_analysis or {}).get("niches", [p.niche] if p.niche else []),
            "scoring_weights": p.scoring_weights,
            "site_analysis": p.site_analysis,
            "status": p.status.value if hasattr(p.status, "value") else p.status,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "spots_count": spots_q.scalar() or 0,
            "searches_count": searches_q.scalar() or 0,
        }
        out.append(ProjectOut(**proj_dict))
    return out


@app.post("/api/projects", response_model=ProjectOut)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    # Check plan limit
    await check_domain_limit(db, user_id, sub)

    # Clean domain
    domain = data.client_domain.strip()
    domain = domain.replace("https://", "").replace("http://", "").rstrip("/")

    project = Project(
        name=data.name.strip(),
        client_domain=domain,
        user_id=user_id,
        site_analysis={"status": "analyzing", "progress": "Analyse automatique en cours..."},
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    await db.commit()
    await db.refresh(project)

    # Launch automatic analysis (synchronous for serverless)
    from backend.services.site_analyzer import analyze_site
    await analyze_site(project.id, project.client_domain)
    
    return ProjectOut(
        **{
            "id": project.id,
            "name": project.name,
            "client_domain": project.client_domain,
            "target_urls": project.target_urls or [],
            "keywords": project.keywords or [],
            "anchors": project.anchors or [],
            "niche": project.niche,
            "niches": (project.site_analysis or {}).get("niches", [project.niche] if project.niche else []),
            "scoring_weights": project.scoring_weights,
            "site_analysis": project.site_analysis,
            "status": project.status.value if hasattr(project.status, "value") else project.status,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "spots_count": 0,
            "searches_count": 0,
        }
    )


@app.get("/api/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Lazy-fetch domain metrics if analysis exists but metrics are missing
    sa = project.site_analysis
    if (
        sa
        and sa.get("status") == "completed"
        and not sa.get("domain_metrics")
        and project.client_domain
    ):
        try:
            from backend.services.domdetailer import fetch_domain_metrics
            metrics = await fetch_domain_metrics(project.client_domain)
            if metrics:
                sa["domain_metrics"] = metrics
                project.site_analysis = sa
                # Force SQLAlchemy to detect the JSON change
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(project, "site_analysis")
                await db.commit()
                await db.refresh(project)
        except Exception as e:
            print(f"[API] Lazy domain metrics fetch failed for {project.client_domain}: {e}")

    spots_q = await db.execute(
        select(func.count(Spot.id)).where(Spot.project_id == project.id)
    )
    searches_q = await db.execute(
        select(func.count(Search.id)).where(Search.project_id == project.id)
    )
    return ProjectOut(
        **{
            "id": project.id,
            "name": project.name,
            "client_domain": project.client_domain,
            "target_urls": project.target_urls or [],
            "keywords": project.keywords or [],
            "anchors": project.anchors or [],
            "niche": project.niche,
            "niches": (project.site_analysis or {}).get("niches", [project.niche] if project.niche else []),
            "scoring_weights": project.scoring_weights,
            "site_analysis": project.site_analysis,
            "status": project.status.value if hasattr(project.status, "value") else project.status,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "spots_count": spots_q.scalar() or 0,
            "searches_count": searches_q.scalar() or 0,
        }
    )


@app.patch("/api/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    update_data = data.model_dump(exclude_unset=True)

    # Handle niches specially - store in site_analysis JSON
    niches_value = update_data.pop("niches", None)
    if niches_value is not None:
        analysis_data = dict(project.site_analysis or {})
        analysis_data["niches"] = niches_value
        project.site_analysis = analysis_data
        if niches_value:
            project.niche = niches_value[0]

    for key, value in update_data.items():
        if key == "client_domain" and value:
            value = value.strip().replace("https://", "").replace("http://", "").rstrip("/")
        setattr(project, key, value)

    project.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    await db.refresh(project)

    spots_q = await db.execute(
        select(func.count(Spot.id)).where(Spot.project_id == project.id)
    )
    searches_q = await db.execute(
        select(func.count(Search.id)).where(Search.project_id == project.id)
    )
    return ProjectOut(
        **{
            "id": project.id,
            "name": project.name,
            "client_domain": project.client_domain,
            "target_urls": project.target_urls or [],
            "keywords": project.keywords or [],
            "anchors": project.anchors or [],
            "niche": project.niche,
            "niches": (project.site_analysis or {}).get("niches", [project.niche] if project.niche else []),
            "scoring_weights": project.scoring_weights,
            "site_analysis": project.site_analysis,
            "status": project.status.value if hasattr(project.status, "value") else project.status,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "spots_count": spots_q.scalar() or 0,
            "searches_count": searches_q.scalar() or 0,
        }
    )


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    await db.delete(project)
    await db.commit()
    return {"detail": "Projet supprimé"}


# ── Footprint Routes ──────────────────────────────────────────────────


@app.get("/api/footprints", response_model=list[FootprintOut])
async def list_footprints(
    category: Optional[str] = None,
    language: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Footprint)
    if category:
        query = query.where(Footprint.category == category)
    if language:
        query = query.where(Footprint.language == language)
    if difficulty:
        query = query.where(Footprint.difficulty == difficulty)
    if search:
        query = query.where(
            Footprint.name.ilike(f"%{search}%")
            | Footprint.query_template.ilike(f"%{search}%")
            | Footprint.description.ilike(f"%{search}%")
        )
    query = query.order_by(Footprint.category, Footprint.name)
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/footprints/categories")
async def list_footprint_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Footprint.category, func.count(Footprint.id))
        .group_by(Footprint.category)
    )
    categories = []
    for cat, count in result.all():
        cat_val = cat.value if hasattr(cat, "value") else cat
        categories.append({"category": cat_val, "count": count})
    return categories


@app.post("/api/footprints", response_model=FootprintOut)
async def create_footprint(data: FootprintCreate, db: AsyncSession = Depends(get_db)):
    footprint = Footprint(
        name=data.name,
        category=data.category,
        subcategory=data.subcategory,
        query_template=data.query_template,
        expected_link_type=data.expected_link_type,
        difficulty=data.difficulty,
        platform_target=data.platform_target,
        language=data.language,
        description=data.description,
        tags=data.tags or [],
        is_custom=True,
    )
    db.add(footprint)
    await db.flush()
    await db.refresh(footprint)
    return footprint


@app.delete("/api/footprints/{footprint_id}")
async def delete_footprint(footprint_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Footprint).where(Footprint.id == footprint_id)
    )
    footprint = result.scalar_one_or_none()
    if not footprint:
        raise HTTPException(status_code=404, detail="Footprint non trouvé")
    await db.delete(footprint)
    return {"detail": "Footprint supprimé"}


@app.post("/api/footprints/seed")
async def seed_footprints(
    force: bool = Query(default=False, description="Force re-seed (delete old system footprints first)"),
    db: AsyncSession = Depends(get_db),
):
    from backend.db.footprints_seed import FOOTPRINTS_SEED

    # Check if already seeded
    result = await db.execute(
        select(func.count(Footprint.id)).where(Footprint.is_custom == False)
    )
    existing_count = result.scalar()

    if existing_count > 0 and not force:
        return {"detail": f"Déjà {existing_count} footprints système en base. Utilisez ?force=true pour re-seed.", "count": existing_count}

    # If force, delete old system footprints (keep custom ones)
    if existing_count > 0 and force:
        await db.execute(
            select(Footprint).where(Footprint.is_custom == False).execution_options(synchronize_session="fetch")
        )
        from sqlalchemy import delete
        await db.execute(delete(Footprint).where(Footprint.is_custom == False))
        print(f"[SEED] Deleted {existing_count} old system footprints")

    count = 0
    for fp_data in FOOTPRINTS_SEED:
        footprint = Footprint(**fp_data, is_custom=False)
        db.add(footprint)
        count += 1

    await db.flush()
    return {"detail": f"{count} footprints insérés (force={force})", "count": count}


# ── Analysis Route ────────────────────────────────────────────────────


@app.post("/api/projects/{project_id}/analyze")
async def analyze_project(
    project_id: str,
    language: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Mark project as analyzing
    project.site_analysis = {"status": "analyzing", "progress": "Crawl et analyse en cours..."}
    project.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    await db.refresh(project)

    from backend.services.site_analyzer import analyze_site
    await analyze_site(project_id, project.client_domain, language)
    return {"detail": "Analyse terminée", "project_id": project_id}


@app.get("/api/projects/{project_id}/sitemap-pages")
async def get_sitemap_pages(
    project_id: str,
    language: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    project = await _verify_project_owner(project_id, db, user_id)

    sitemap_pages = (project.site_analysis or {}).get("sitemap_pages", [])

    if language:
        sitemap_pages = [p for p in sitemap_pages if p.get("language") == language]

    total = len(sitemap_pages)
    offset = (page - 1) * per_page
    paginated = sitemap_pages[offset:offset + per_page]

    return {
        "pages": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "languages": (project.site_analysis or {}).get("sitemap_languages", {}),
    }


# ── Search Routes ─────────────────────────────────────────────────────


@app.post("/api/search")
async def create_search(
    data: SearchCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Get footprints
    fp_result = await db.execute(
        select(Footprint).where(Footprint.id.in_(data.footprint_ids))
    )
    footprints = fp_result.scalars().all()

    if not footprints:
        raise HTTPException(status_code=400, detail="Aucun footprint sélectionné")

    # Use provided keywords or project keywords
    keywords = data.keywords
    if not keywords and project.keywords:
        keywords = [kw["keyword"] for kw in project.keywords if isinstance(kw, dict)]

    if not keywords:
        raise HTTPException(status_code=400, detail="Aucun keyword disponible")

    # Create search records for each footprint x keyword combination
    search_ids = []
    for fp in footprints:
        for kw in keywords:
            query = fp.query_template.replace("{keyword}", kw)
            if "{domain}" in fp.query_template:
                query = query.replace("{domain}", project.client_domain)

            search = Search(
                project_id=data.project_id,
                footprint_id=fp.id,
                query_used=query,
                keyword=kw,
                status=SearchStatus.pending,
            )
            db.add(search)
            await db.flush()
            search_ids.append(search.id)

    await db.commit()

    # Launch scraping (synchronous for serverless)
    from backend.scrapers.google_scraper import run_searches
    await run_searches(search_ids, data.num_results, data.auto_qualify)

    return {
        "detail": f"{len(search_ids)} recherches terminées",
        "search_ids": search_ids,
        "queries_count": len(search_ids),
    }


@app.post("/api/search/bulk")
async def create_search_bulk(
    data: SearchBulk,
    db: AsyncSession = Depends(get_db),
):
    # Verify project
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Get footprints by categories
    fp_query = select(Footprint)
    if data.categories:
        fp_query = fp_query.where(Footprint.category.in_(data.categories))
    fp_result = await db.execute(fp_query)
    footprints = fp_result.scalars().all()

    # Get keywords
    keywords = []
    if project.keywords:
        keywords = [
            kw["keyword"] for kw in project.keywords
            if isinstance(kw, dict) and "keyword" in kw
        ][:data.max_keywords]

    if not keywords:
        raise HTTPException(status_code=400, detail="Aucun keyword dans le projet")

    search_ids = []
    for fp in footprints:
        for kw in keywords:
            query = fp.query_template.replace("{keyword}", kw)
            if "{domain}" in fp.query_template:
                query = query.replace("{domain}", project.client_domain)

            search = Search(
                project_id=data.project_id,
                footprint_id=fp.id,
                query_used=query,
                keyword=kw,
                status=SearchStatus.pending,
            )
            db.add(search)
            await db.flush()
            search_ids.append(search.id)

    await db.commit()

    from backend.scrapers.google_scraper import run_searches
    await run_searches(search_ids, data.num_results_per_query, True)

    return {
        "detail": f"{len(search_ids)} recherches terminées (bulk)",
        "search_ids": search_ids,
        "queries_count": len(search_ids),
    }


@app.get("/api/projects/{project_id}/searches", response_model=list[SearchOut])
async def list_searches(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    await _verify_project_owner(project_id, db, user_id)
    result = await db.execute(
        select(Search)
        .where(Search.project_id == project_id)
        .order_by(Search.created_at.desc())
    )
    return result.scalars().all()


# ── Spot Routes ───────────────────────────────────────────────────────


@app.get("/api/projects/{project_id}/spots", response_model=list[SpotOut])
async def list_spots(
    project_id: str,
    status: Optional[str] = None,
    spot_type: Optional[str] = None,
    min_da: Optional[int] = None,
    has_dofollow: Optional[bool] = None,
    has_comment_form: Optional[bool] = None,
    platform: Optional[str] = None,
    sort_by: Optional[str] = "quality_score",
    sort_dir: Optional[str] = "desc",
    limit: int = Query(default=50, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    await _verify_project_owner(project_id, db, user_id)
    query = select(Spot).where(Spot.project_id == project_id)

    if status:
        query = query.where(Spot.status == status)
    if spot_type:
        query = query.where(Spot.spot_type == spot_type)
    if min_da is not None:
        query = query.where(Spot.da >= min_da)
    if has_dofollow is not None:
        if has_dofollow:
            query = query.where(Spot.detected_link_type == "dofollow")
        else:
            query = query.where(Spot.detected_link_type != "dofollow")
    if has_comment_form is not None:
        query = query.where(Spot.has_comment_form == has_comment_form)
    if platform:
        query = query.where(Spot.detected_platform.ilike(f"%{platform}%"))

    # Sorting
    sort_col = getattr(Spot, sort_by, Spot.quality_score)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc().nullslast())
    else:
        query = query.order_by(sort_col.desc().nullslast())

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/projects/{project_id}/spots/count")
async def count_spots(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    await _verify_project_owner(project_id, db, user_id)
    result = await db.execute(
        select(func.count(Spot.id)).where(Spot.project_id == project_id)
    )
    total = result.scalar()

    # Count by status
    status_result = await db.execute(
        select(Spot.status, func.count(Spot.id))
        .where(Spot.project_id == project_id)
        .group_by(Spot.status)
    )
    by_status = {}
    for s, c in status_result.all():
        key = s.value if hasattr(s, "value") else s
        by_status[key] = c

    # Count by type
    type_result = await db.execute(
        select(Spot.spot_type, func.count(Spot.id))
        .where(Spot.project_id == project_id)
        .group_by(Spot.spot_type)
    )
    by_type = {}
    for t, c in type_result.all():
        by_type[t or "unknown"] = c

    return {"total": total, "by_status": by_status, "by_type": by_type}


@app.patch("/api/spots/{spot_id}", response_model=SpotOut)
async def update_spot(
    spot_id: str, data: SpotUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Spot).where(Spot.id == spot_id))
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(spot, key, value)

    await db.flush()
    await db.refresh(spot)
    return spot


@app.post("/api/spots/{spot_id}/qualify", response_model=SpotOut)
async def qualify_spot(spot_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Spot).where(Spot.id == spot_id))
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot non trouvé")

    from backend.scrapers.spot_qualifier import qualify_single_spot
    updated_spot = await qualify_single_spot(spot)

    for key in [
        "detected_platform", "detected_link_type", "has_comment_form",
        "has_registration", "has_url_field", "spot_type", "quality_score", "status"
    ]:
        setattr(spot, key, getattr(updated_spot, key, None))

    await db.flush()
    await db.refresh(spot)
    return spot


@app.delete("/api/spots/{spot_id}")
async def delete_spot(spot_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Spot).where(Spot.id == spot_id))
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot non trouvé")
    await db.delete(spot)
    return {"detail": "Spot supprimé"}


class SpotVerifyRequest(BaseModel):
    is_relevant: bool
    reason: Optional[str] = None


@app.post("/api/spots/{spot_id}/verify")
async def verify_spot(
    spot_id: str,
    data: SpotVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Manually verify a spot's relevance and mark it accordingly."""
    result = await db.execute(select(Spot).where(Spot.id == spot_id))
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot non trouvé")

    if data.is_relevant:
        spot.status = "selected"
        message = "Spot marqué comme pertinent"
    else:
        spot.status = "rejected"
        if data.reason:
            spot.notes = f"Rejeté: {data.reason}"
        else:
            spot.notes = "Rejeté: Non pertinent"
        message = "Spot rejeté"

    await db.flush()
    return {"detail": message, "spot_id": spot_id, "status": spot.status}


class BulkUpdateRequest(BaseModel):
    spot_ids: list[str]
    status: str


@app.post("/api/spots/bulk-update")
async def bulk_update_spots(
    data: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    count = 0
    for sid in data.spot_ids:
        result = await db.execute(select(Spot).where(Spot.id == sid))
        spot = result.scalar_one_or_none()
        if spot:
            spot.status = data.status
            count += 1
    await db.flush()
    return {"detail": f"{count} spots mis à jour"}


@app.get("/api/projects/{project_id}/spots/export")
async def export_spots(
    project_id: str,
    status: Optional[str] = None,
    spot_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    await _verify_project_owner(project_id, db, user_id)
    query = select(Spot).where(Spot.project_id == project_id)
    if status:
        query = query.where(Spot.status == status)
    if spot_type:
        query = query.where(Spot.spot_type == spot_type)

    result = await db.execute(query.order_by(Spot.quality_score.desc().nullslast()))
    spots = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "URL", "Domaine", "Titre", "Type", "Plateforme",
        "Lien", "Commentaire", "Inscription", "Champ URL",
        "DA", "DR", "TF", "Score", "Statut", "Notes"
    ])
    for s in spots:
        writer.writerow([
            s.url, s.domain, s.title or "", s.spot_type or "",
            s.detected_platform or "",
            s.detected_link_type.value if hasattr(s.detected_link_type, "value") else (s.detected_link_type or ""),
            "Oui" if s.has_comment_form else "Non",
            "Oui" if s.has_registration else "Non",
            "Oui" if s.has_url_field else "Non",
            s.da or "", s.dr or "", s.tf or "",
            f"{s.quality_score:.1f}" if s.quality_score else "",
            s.status.value if hasattr(s.status, "value") else s.status,
            s.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=spots_export.csv"},
    )


# ── Dashboard Stats ───────────────────────────────────────────────────


@app.get("/api/dashboard/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # Get user's project IDs
    user_projects = select(Project.id).where(Project.user_id == user_id)

    projects_count = (await db.execute(
        select(func.count(Project.id)).where(Project.user_id == user_id)
    )).scalar()
    spots_count = (await db.execute(
        select(func.count(Spot.id)).where(Spot.project_id.in_(user_projects))
    )).scalar()
    searches_count = (await db.execute(
        select(func.count(Search.id)).where(Search.project_id.in_(user_projects))
    )).scalar()

    # Spots by status
    status_result = await db.execute(
        select(Spot.status, func.count(Spot.id))
        .where(Spot.project_id.in_(user_projects))
        .group_by(Spot.status)
    )
    spots_by_status = {}
    for s, c in status_result.all():
        key = s.value if hasattr(s, "value") else s
        spots_by_status[key] = c

    # Active searches
    active_searches = (await db.execute(
        select(func.count(Search.id)).where(
            Search.project_id.in_(user_projects),
            Search.status.in_([SearchStatus.pending, SearchStatus.running]),
        )
    )).scalar()

    return {
        "projects_count": projects_count,
        "spots_count": spots_count,
        "searches_count": searches_count,
        "spots_by_status": spots_by_status,
        "active_searches": active_searches,
    }


# ── Backlink Routes ───────────────────────────────────────────────────


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    from urllib.parse import urlparse
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except:
        return ""


def normalize_domain(domain: str) -> str:
    """Normalize domain for comparison."""
    return domain.lower().replace('www.', '').replace('https://', '').replace('http://', '').rstrip('/')


@app.get("/api/projects/{project_id}/backlinks", response_model=list[BacklinkOut])
async def list_backlinks(
    project_id: str,
    status: Optional[str] = None,
    link_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_dir: Optional[str] = "desc",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List all backlinks for a project with filters and pagination."""
    await _verify_project_owner(project_id, db, user_id)

    query = select(Backlink).where(Backlink.project_id == project_id)

    # Apply filters
    if status:
        query = query.where(Backlink.status == status)
    if link_type:
        query = query.where(Backlink.link_type == link_type)
    if search:
        search_filter = (
            Backlink.source_url.ilike(f"%{search}%") |
            Backlink.target_url.ilike(f"%{search}%") |
            Backlink.anchor_text.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    # Apply sorting
    sort_col = getattr(Backlink, sort_by, Backlink.created_at)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/projects/{project_id}/backlinks/count")
async def count_backlinks(
    project_id: str,
    status: Optional[str] = None,
    link_type: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get backlink counts for a project."""
    await _verify_project_owner(project_id, db, user_id)

    query = select(func.count(Backlink.id)).where(Backlink.project_id == project_id)

    if status:
        query = query.where(Backlink.status == status)
    if link_type:
        query = query.where(Backlink.link_type == link_type)
    if search:
        search_filter = (
            Backlink.source_url.ilike(f"%{search}%") |
            Backlink.target_url.ilike(f"%{search}%") |
            Backlink.anchor_text.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    result = await db.execute(query)
    total = result.scalar()

    # Count by status
    status_query = select(Backlink.status, func.count(Backlink.id)).where(Backlink.project_id == project_id).group_by(Backlink.status)
    if status:
        status_query = status_query.where(Backlink.status == status)
    status_result = await db.execute(status_query)
    by_status = {}
    for s, c in status_result.all():
        key = s.value if hasattr(s, "value") else s
        by_status[key] = c

    # Count by link_type
    type_query = select(Backlink.link_type, func.count(Backlink.id)).where(Backlink.project_id == project_id).group_by(Backlink.link_type)
    if link_type:
        type_query = type_query.where(Backlink.link_type == link_type)
    type_result = await db.execute(type_query)
    by_type = {}
    for t, c in type_result.all():
        key = t.value if hasattr(t, "value") else t
        by_type[key] = c

    return {"total": total, "by_status": by_status, "by_type": by_type}


@app.get("/api/projects/{project_id}/backlinks/stats")
async def get_backlink_stats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get aggregated backlink statistics for dashboard KPIs and charts."""
    await _verify_project_owner(project_id, db, user_id)

    base_filter = Backlink.project_id == project_id

    # Total + unique domains
    total = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter)
    )).scalar() or 0

    unique_domains = (await db.execute(
        select(func.count(distinct(Backlink.source_domain))).where(base_filter)
    )).scalar() or 0

    # By status
    status_result = await db.execute(
        select(Backlink.status, func.count(Backlink.id))
        .where(base_filter)
        .group_by(Backlink.status)
    )
    status_map = {}
    for s, c in status_result.all():
        key = s.value if hasattr(s, "value") else s
        status_map[key] = c
    active_count = status_map.get("active", 0)
    lost_count = status_map.get("lost", 0)
    pending_count = status_map.get("pending", 0)
    active_percentage = round((active_count / total * 100), 1) if total > 0 else 0

    # HTTP code breakdown
    http_result = await db.execute(
        select(
            func.sum(case((Backlink.http_code.between(200, 299), 1), else_=0)).label("ok"),
            func.sum(case((Backlink.http_code.between(300, 399), 1), else_=0)).label("redirect"),
            func.sum(case((Backlink.http_code.in_([404, 410]), 1), else_=0)).label("not_found"),
            func.sum(case(
                (Backlink.http_code.isnot(None) & ~Backlink.http_code.between(200, 299) & ~Backlink.http_code.between(300, 399) & ~Backlink.http_code.in_([404, 410]), 1),
                else_=0
            )).label("other"),
        ).where(base_filter)
    )
    http_row = http_result.one()
    http_200_count = int(http_row.ok or 0)
    http_301_count = int(http_row.redirect or 0)
    http_404_count = int(http_row.not_found or 0)
    http_other_count = int(http_row.other or 0)

    # Indexation counts
    indexed_count = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter, Backlink.is_indexed == True)
    )).scalar() or 0
    not_indexed_count = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter, Backlink.is_indexed == False)
    )).scalar() or 0
    not_checked_count = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter, Backlink.is_indexed.is_(None))
    )).scalar() or 0
    checked_total = indexed_count + not_indexed_count
    indexed_percentage = round((indexed_count / checked_total * 100), 1) if checked_total > 0 else 0

    # Average DR
    avg_dr = (await db.execute(
        select(func.avg(Backlink.domain_rank)).where(base_filter, Backlink.domain_rank.isnot(None))
    )).scalar()
    avg_domain_rank = round(float(avg_dr), 1) if avg_dr else None

    # Link type counts
    dofollow_count = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter, Backlink.link_type == "dofollow")
    )).scalar() or 0
    nofollow_count = (await db.execute(
        select(func.count(Backlink.id)).where(base_filter, Backlink.link_type == "nofollow")
    )).scalar() or 0
    dofollow_percentage = round((dofollow_count / total * 100), 1) if total > 0 else 0

    # DA distribution buckets
    da_result = await db.execute(
        select(
            func.sum(case((Backlink.domain_rank.between(0, 19), 1), else_=0)).label("da_0_20"),
            func.sum(case((Backlink.domain_rank.between(20, 39), 1), else_=0)).label("da_20_40"),
            func.sum(case((Backlink.domain_rank.between(40, 59), 1), else_=0)).label("da_40_60"),
            func.sum(case((Backlink.domain_rank.between(60, 79), 1), else_=0)).label("da_60_80"),
            func.sum(case((Backlink.domain_rank >= 80, 1), else_=0)).label("da_80_100"),
        ).where(base_filter)
    )
    da_row = da_result.one()
    da_distribution = {
        "0-20": int(da_row.da_0_20 or 0),
        "20-40": int(da_row.da_20_40 or 0),
        "40-60": int(da_row.da_40_60 or 0),
        "60-80": int(da_row.da_60_80 or 0),
        "80-100": int(da_row.da_80_100 or 0),
    }

    # Top referring domains
    top_result = await db.execute(
        select(
            Backlink.source_domain,
            func.count(Backlink.id).label("count"),
            func.avg(Backlink.domain_rank).label("avg_dr"),
        )
        .where(base_filter, Backlink.source_domain.isnot(None))
        .group_by(Backlink.source_domain)
        .order_by(func.count(Backlink.id).desc())
        .limit(10)
    )
    top_referring_domains = [
        {
            "domain": r.source_domain,
            "count": r.count,
            "avg_dr": round(float(r.avg_dr), 1) if r.avg_dr else None,
        }
        for r in top_result.all()
    ]

    return {
        "total_backlinks": total,
        "unique_domains": unique_domains,
        "active_count": active_count,
        "lost_count": lost_count,
        "pending_count": pending_count,
        "active_percentage": active_percentage,
        "http_200_count": http_200_count,
        "http_301_count": http_301_count,
        "http_404_count": http_404_count,
        "http_other_count": http_other_count,
        "indexed_count": indexed_count,
        "not_indexed_count": not_indexed_count,
        "not_checked_count": not_checked_count,
        "indexed_percentage": indexed_percentage,
        "avg_domain_rank": avg_domain_rank,
        "dofollow_count": dofollow_count,
        "nofollow_count": nofollow_count,
        "dofollow_percentage": dofollow_percentage,
        "da_distribution": da_distribution,
        "top_referring_domains": top_referring_domains,
    }


@app.get("/api/projects/{project_id}/backlinks/anchors")
async def get_backlink_anchors(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get anchor text analysis for a project's backlinks."""
    await _verify_project_owner(project_id, db, user_id)

    anchor_result = await db.execute(
        select(
            Backlink.anchor_text,
            func.count(Backlink.id).label("count"),
            func.sum(case((Backlink.link_type == "dofollow", 1), else_=0)).label("dofollow"),
            func.sum(case((Backlink.link_type == "nofollow", 1), else_=0)).label("nofollow"),
        )
        .where(Backlink.project_id == project_id)
        .group_by(Backlink.anchor_text)
        .order_by(func.count(Backlink.id).desc())
    )

    rows = anchor_result.all()
    total = sum(r.count for r in rows)
    unique = len(rows)

    anchors = []
    over_optimized = []
    for r in rows:
        pct = round((r.count / total * 100), 1) if total > 0 else 0
        entry = {
            "text": r.anchor_text or "(vide)",
            "count": r.count,
            "percentage": pct,
            "dofollow": int(r.dofollow or 0),
            "nofollow": int(r.nofollow or 0),
        }
        anchors.append(entry)
        if pct > 30:
            over_optimized.append(entry)

    diversity_score = round((unique / total * 100), 1) if total > 0 else 0

    return {
        "total_anchors": total,
        "unique_anchors": unique,
        "diversity_score": diversity_score,
        "anchors": anchors,
        "over_optimized": over_optimized,
    }


@app.get("/api/projects/{project_id}/backlinks/history")
async def get_backlink_history(
    project_id: str,
    period: str = Query(default="week"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get backlink history timeline with aggregation."""
    await _verify_project_owner(project_id, db, user_id)

    # Get history events joined with backlink source_url
    events_result = await db.execute(
        select(
            BacklinkHistory.id,
            BacklinkHistory.backlink_id,
            BacklinkHistory.event_type,
            BacklinkHistory.old_status,
            BacklinkHistory.new_status,
            BacklinkHistory.old_http_code,
            BacklinkHistory.new_http_code,
            BacklinkHistory.domain_rank_snapshot,
            BacklinkHistory.is_indexed_snapshot,
            BacklinkHistory.details,
            BacklinkHistory.changed_at,
            Backlink.source_url,
            Backlink.source_domain,
        )
        .join(Backlink, BacklinkHistory.backlink_id == Backlink.id)
        .where(Backlink.project_id == project_id)
        .order_by(BacklinkHistory.changed_at.desc())
        .limit(limit)
        .offset(offset)
    )

    events = [
        {
            "id": r.id,
            "backlink_id": r.backlink_id,
            "event_type": r.event_type,
            "old_status": r.old_status,
            "new_status": r.new_status,
            "old_http_code": r.old_http_code,
            "new_http_code": r.new_http_code,
            "domain_rank_snapshot": r.domain_rank_snapshot,
            "is_indexed_snapshot": r.is_indexed_snapshot,
            "details": r.details,
            "changed_at": r.changed_at.isoformat() if r.changed_at else None,
            "source_url": r.source_url,
            "source_domain": r.source_domain,
        }
        for r in events_result.all()
    ]

    # Timeline aggregation: gained/lost per period
    # Gained = new_status == "active" (status_changed or created)
    # Lost = new_status == "lost"
    if period == "day":
        date_trunc = func.date_trunc('day', BacklinkHistory.changed_at)
    elif period == "month":
        date_trunc = func.to_char(BacklinkHistory.changed_at, 'YYYY-MM')
    else:  # week
        date_trunc = func.to_char(BacklinkHistory.changed_at, 'IYYY-IW')

    timeline_result = await db.execute(
        select(
            date_trunc.label("period"),
            func.sum(case(
                (BacklinkHistory.new_status == "active", 1),
                (BacklinkHistory.event_type == "created", 1),
                else_=0
            )).label("gained"),
            func.sum(case(
                (BacklinkHistory.new_status == "lost", 1),
                else_=0
            )).label("lost"),
        )
        .join(Backlink, BacklinkHistory.backlink_id == Backlink.id)
        .where(Backlink.project_id == project_id)
        .group_by(date_trunc)
        .order_by(date_trunc.asc())
    )

    timeline = [
        {
            "period": r.period,
            "gained": int(r.gained or 0),
            "lost": int(r.lost or 0),
        }
        for r in timeline_result.all()
    ]

    return {
        "events": events,
        "timeline": timeline,
    }


@app.get("/api/projects/{project_id}/backlinks/domains")
async def get_backlink_domains(
    project_id: str,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get top referring domains with metrics."""
    await _verify_project_owner(project_id, db, user_id)

    domains_result = await db.execute(
        select(
            Backlink.source_domain,
            func.count(Backlink.id).label("backlink_count"),
            func.avg(Backlink.domain_rank).label("avg_dr"),
            func.sum(case((Backlink.status == "active", 1), else_=0)).label("active_count"),
            func.sum(case((Backlink.link_type == "dofollow", 1), else_=0)).label("dofollow_count"),
        )
        .where(Backlink.project_id == project_id, Backlink.source_domain.isnot(None))
        .group_by(Backlink.source_domain)
        .order_by(func.count(Backlink.id).desc())
        .limit(limit)
    )

    return [
        {
            "domain": r.source_domain,
            "backlink_count": r.backlink_count,
            "avg_dr": round(float(r.avg_dr), 1) if r.avg_dr else None,
            "active_count": int(r.active_count or 0),
            "dofollow_count": int(r.dofollow_count or 0),
        }
        for r in domains_result.all()
    ]


async def run_post_creation_analysis(backlink_ids: list[str]):
    """Background task: fetch domain metrics + check indexation for newly created backlinks."""
    from backend.services.domdetailer import fetch_metrics_batch
    from backend.services.speedyindex import check_indexation_batch

    print(f"[ANALYSIS] Starting post-creation analysis for {len(backlink_ids)} backlinks")

    # 1. Domain metrics (DomDetailer)
    if settings.has_domdetailer:
        try:
            await fetch_metrics_batch(backlink_ids)
            print(f"[ANALYSIS] Domain metrics fetched for {len(backlink_ids)} backlinks")
        except Exception as e:
            print(f"[ANALYSIS] Error fetching domain metrics: {e}")
    else:
        print("[ANALYSIS] DomDetailer API key not configured, skipping metrics")

    # 2. Indexation check (SpeedyIndex)
    if settings.has_speedyindex:
        try:
            await check_indexation_batch(backlink_ids)
            print(f"[ANALYSIS] Indexation checked for {len(backlink_ids)} backlinks")
        except Exception as e:
            print(f"[ANALYSIS] Error checking indexation: {e}")
    else:
        print("[ANALYSIS] SpeedyIndex API key not configured, skipping indexation")

    print(f"[ANALYSIS] Post-creation analysis completed for {len(backlink_ids)} backlinks")


@app.post("/api/projects/{project_id}/backlinks", response_model=BacklinkOut)
async def create_backlink(
    project_id: str,
    data: BacklinkCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Create a new backlink for a project. Auto-detects target URL from project domains."""
    project = await _verify_project_owner(project_id, db, user_id)

    # Check plan limit
    await check_backlink_limit(db, project_id, sub)

    # Clean source URL
    source_url = data.source_url.strip()

    # Check for duplicate
    existing = await db.execute(
        select(Backlink).where(
            Backlink.project_id == project_id,
            Backlink.source_url == source_url
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ce backlink existe déjà dans le projet")

    # Get project domains from client_domain and target_urls
    project_domains = [project.client_domain]
    if project.target_urls:
        project_domains.extend([normalize_domain(url) for url in project.target_urls if isinstance(url, str)])

    # Auto-detect backlink info by scraping the page
    from backend.services.backlink_extractor import validate_and_enrich_backlink
    enriched_data = await validate_and_enrich_backlink(source_url, project_domains)

    if enriched_data and enriched_data.get('found'):
        # Link found on the page
        backlink = Backlink(
            project_id=project_id,
            source_url=source_url,
            target_url=enriched_data.get('target_url'),
            anchor_text=enriched_data.get('anchor_text'),
            source_domain=extract_domain(source_url),
            target_domain=extract_domain(enriched_data.get('target_url', '')),
            http_code=enriched_data.get('http_code'),
            links_on_page=enriched_data.get('links_on_page'),
            link_type=enriched_data.get('link_type', 'dofollow'),
            status=BacklinkStatus.active if enriched_data.get('status') == 'active' else BacklinkStatus.pending,
            first_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
            last_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    else:
        # Page accessible but no link found, or page error
        backlink = Backlink(
            project_id=project_id,
            source_url=source_url,
            target_url=data.target_url,  # Use provided target_url if any
            anchor_text=data.anchor_text,
            source_domain=extract_domain(source_url),
            target_domain=extract_domain(data.target_url) if data.target_url else None,
            http_code=enriched_data.get('http_code') if enriched_data else None,
            links_on_page=enriched_data.get('links_on_page') if enriched_data else None,
            link_type=data.link_type or 'dofollow',
            status=BacklinkStatus.lost if (enriched_data and enriched_data.get('status') == 'lost') else BacklinkStatus.pending,
            first_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )

    db.add(backlink)
    await db.flush()

    # Record creation history
    await record_history(
        db, backlink, "created",
        new_status=str(backlink.status.value if hasattr(backlink.status, 'value') else backlink.status),
        new_http_code=backlink.http_code,
    )

    await db.commit()

    # Launch analysis in background (non-blocking)
    asyncio.create_task(run_post_creation_analysis([backlink.id]))

    await db.refresh(backlink)
    return backlink


@app.post("/api/projects/{project_id}/backlinks/bulk", response_model=dict)
async def create_backlinks_bulk(
    project_id: str,
    items: list[BacklinkImportItem],
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Create multiple backlinks at once (from CSV import). Auto-detects target URLs."""
    import time
    start_time = time.time()

    project = await _verify_project_owner(project_id, db, user_id)

    # Check plan limit
    await check_backlink_limit(db, project_id, sub)

    # Get project domains
    project_domains = [normalize_domain(project.client_domain)]
    if project.target_urls:
        project_domains.extend([normalize_domain(url) for url in project.target_urls if isinstance(url, str)])

    # ── Deduplication ──────────────────────────────────────────────────
    # Fetch existing source_urls for this project
    existing_result = await db.execute(
        select(Backlink.source_url).where(Backlink.project_id == project_id)
    )
    existing_urls = {row[0] for row in existing_result.all()}

    # Filter out duplicates (vs existing DB entries AND within the import itself)
    seen = set()
    unique_items = []
    skipped_count = 0
    for item in items:
        url = item.source_url.strip()
        if url in existing_urls or url in seen:
            skipped_count += 1
            continue
        seen.add(url)
        unique_items.append(item)

    print(f"[BULK] Processing {len(unique_items)} unique backlinks for project {project_id} ({skipped_count} duplicates skipped)")

    if not unique_items:
        elapsed = time.time() - start_time
        return {
            "created": 0,
            "skipped": skipped_count,
            "errors": [],
            "total": len(items),
            "duration_seconds": round(elapsed, 2)
        }

    # Process all URLs in parallel with concurrency limit
    from backend.services.backlink_extractor import process_backlinks_batch
    results = await process_backlinks_batch([{"source_url": item.source_url} for item in unique_items], project_domains, max_concurrent=5)

    created_count = 0
    created_ids = []
    errors = []

    for i, enriched_data in enumerate(results):
        try:
            source_url = unique_items[i].source_url.strip()

            if enriched_data.get('error'):
                errors.append({"url": source_url, "error": enriched_data['error']})
                continue

            if enriched_data.get('found'):
                backlink = Backlink(
                    project_id=project_id,
                    source_url=source_url,
                    target_url=enriched_data.get('target_url'),
                    anchor_text=enriched_data.get('anchor_text'),
                    source_domain=extract_domain(source_url),
                    target_domain=extract_domain(enriched_data.get('target_url', '')),
                    http_code=enriched_data.get('http_code'),
                    links_on_page=enriched_data.get('links_on_page'),
                    link_type=enriched_data.get('link_type', 'dofollow'),
                    status=BacklinkStatus.active if enriched_data.get('status') == 'active' else BacklinkStatus.pending,
                    first_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
                    last_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
            else:
                backlink = Backlink(
                    project_id=project_id,
                    source_url=source_url,
                    http_code=enriched_data.get('http_code'),
                    links_on_page=enriched_data.get('links_on_page'),
                    link_type='dofollow',
                    status=BacklinkStatus.lost if enriched_data.get('status') == 'lost' else BacklinkStatus.pending,
                    first_check_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )

            db.add(backlink)
            await db.flush()
            created_ids.append(backlink.id)
            created_count += 1
        except Exception as e:
            errors.append({"url": unique_items[i].source_url, "error": str(e)})

    await db.commit()

    # Launch analysis in background (non-blocking) for all newly created backlinks
    if created_ids:
        asyncio.create_task(run_post_creation_analysis(created_ids))

    elapsed = time.time() - start_time
    print(f"[BULK] Completed: {created_count} created, {skipped_count} skipped, {len(errors)} errors in {elapsed:.2f}s")

    return {
        "created": created_count,
        "skipped": skipped_count,
        "errors": errors,
        "total": len(items),
        "duration_seconds": round(elapsed, 2)
    }


@app.get("/api/projects/{project_id}/backlinks/{backlink_id}", response_model=BacklinkOut)
async def get_backlink(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a single backlink by ID."""
    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")
    return backlink


@app.patch("/api/projects/{project_id}/backlinks/{backlink_id}", response_model=BacklinkOut)
async def update_backlink(
    project_id: str,
    backlink_id: str,
    data: BacklinkUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a backlink."""
    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")

    update_data = data.model_dump(exclude_unset=True)

    # Update domains if URLs changed
    if 'source_url' in update_data and update_data['source_url']:
        update_data['source_domain'] = extract_domain(update_data['source_url'])
    if 'target_url' in update_data and update_data['target_url']:
        update_data['target_domain'] = extract_domain(update_data['target_url'])

    for key, value in update_data.items():
        setattr(backlink, key, value)

    backlink.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    await db.refresh(backlink)
    return backlink


@app.delete("/api/projects/{project_id}/backlinks/{backlink_id}")
async def delete_backlink(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a backlink."""
    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")
    await db.delete(backlink)
    return {"detail": "Backlink supprimé"}


@app.delete("/api/projects/{project_id}/backlinks")
async def delete_all_backlinks(
    project_id: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Delete all backlinks for a project (optionally filtered by status)."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    query = delete(Backlink).where(Backlink.project_id == project_id)
    if status:
        query = query.where(Backlink.status == status)

    result = await db.execute(query)
    deleted_count = result.rowcount

    return {"detail": f"{deleted_count} backlinks supprimés", "count": deleted_count}


@app.get("/api/projects/{project_id}/backlinks/export")
async def export_backlinks(
    project_id: str,
    status: Optional[str] = None,
    link_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Export backlinks to CSV."""
    await _verify_project_owner(project_id, db, user_id)

    query = select(Backlink).where(Backlink.project_id == project_id)
    if status:
        query = query.where(Backlink.status == status)
    if link_type:
        query = query.where(Backlink.link_type == link_type)

    query = query.order_by(Backlink.created_at.desc())
    result = await db.execute(query)
    backlinks = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "URL Source", "URL Cible", "Texte d'ancre",
        "Domaine Source", "Domaine Cible", "Code HTTP",
        "Liens sur page", "Type", "Statut",
        "DR", "UR", "Backlinks", "Domaines référents",
        "Dofollow BL", "Nofollow BL", "Gov BL", "Edu BL",
        "Indexé Google", "Date création", "Dernière mise à jour"
    ])

    for b in backlinks:
        writer.writerow([
            b.id,
            b.source_url,
            b.target_url or "",
            b.anchor_text or "",
            b.source_domain or "",
            b.target_domain or "",
            b.http_code or "",
            b.links_on_page or "",
            b.link_type if b.link_type else "",
            b.status.value if hasattr(b.status, "value") else b.status,
            b.domain_rank or "",
            b.url_rank or "",
            b.backlinks_count or "",
            b.referring_domains or "",
            b.dofollow_backlinks or "",
            b.nofollow_backlinks or "",
            b.gov_backlinks or "",
            b.edu_backlinks or "",
            "Oui" if b.is_indexed else ("Non" if b.is_indexed is False else ""),
            b.created_at.isoformat() if b.created_at else "",
            b.updated_at.isoformat() if b.updated_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=backlinks_{project_id}.csv"},
    )


@app.post("/api/projects/{project_id}/backlinks/{backlink_id}/check")
async def check_backlink(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Check backlink HTTP status and auto-detect info."""
    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")

    # Get project domains for detection
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one()
    project_domains = [normalize_domain(project.client_domain)]
    if project.target_urls:
        project_domains.extend([normalize_domain(url) for url in project.target_urls if isinstance(url, str)])

    # Re-scrape and update
    from backend.services.backlink_extractor import validate_and_enrich_backlink
    enriched_data = await validate_and_enrich_backlink(backlink.source_url, project_domains)

    if enriched_data:
        backlink.http_code = enriched_data.get('http_code')
        backlink.links_on_page = enriched_data.get('links_on_page')
        backlink.last_check_at = datetime.now(timezone.utc).replace(tzinfo=None)

        if enriched_data.get('found'):
            backlink.target_url = enriched_data.get('target_url')
            backlink.anchor_text = enriched_data.get('anchor_text')
            backlink.link_type = enriched_data.get('link_type')
            backlink.target_domain = extract_domain(enriched_data.get('target_url', ''))
            backlink.status = BacklinkStatus.active
        else:
            backlink.status = BacklinkStatus.lost if enriched_data.get('status') == 'lost' else BacklinkStatus.pending

        await db.flush()

    return {"detail": "Vérification terminée", "backlink_id": backlink_id}


@app.post("/api/projects/{project_id}/backlinks/check-all")
async def check_all_backlinks(
    project_id: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Check all backlinks HTTP status for a project."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    query = select(Backlink.id).where(Backlink.project_id == project_id)
    if status:
        query = query.where(Backlink.status == status)

    result = await db.execute(query)
    backlink_ids = [r[0] for r in result.all()]

    # Use backlink_checker for batch processing (synchronous for serverless)
    from backend.services.backlink_checker import check_backlinks_batch
    await check_backlinks_batch(backlink_ids)

    return {"detail": f"Vérification de {len(backlink_ids)} backlinks terminée", "count": len(backlink_ids)}


@app.post("/api/projects/{project_id}/backlinks/{backlink_id}/index-check")
async def check_indexation(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Check Google indexation for a backlink."""
    if not settings.has_speedyindex:
        raise HTTPException(status_code=400, detail="SpeedyIndex API non configurée")

    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")

    from backend.services.speedyindex import check_indexation_status
    is_indexed = await check_indexation_status(backlink.source_url)

    backlink.is_indexed = is_indexed
    backlink.index_checked_at = datetime.now(timezone.utc).replace(tzinfo=None)
    backlink.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    return {"backlink_id": backlink_id, "is_indexed": is_indexed}


@app.post("/api/projects/{project_id}/backlinks/index-check-batch")
async def check_indexation_batch_endpoint(
    project_id: str,
    backlink_ids: list[str],
    db: AsyncSession = Depends(get_db)
):
    """Check Google indexation for multiple backlinks."""
    if not settings.has_speedyindex:
        raise HTTPException(status_code=400, detail="SpeedyIndex API non configurée")

    # Verify all backlinks belong to the project
    result = await db.execute(
        select(Backlink.id).where(Backlink.id.in_(backlink_ids), Backlink.project_id == project_id)
    )
    valid_ids = [r[0] for r in result.all()]

    from backend.services.speedyindex import check_indexation_batch
    await check_indexation_batch(valid_ids)

    return {"detail": f"Vérification indexation de {len(valid_ids)} backlinks terminée", "count": len(valid_ids)}


@app.post("/api/projects/{project_id}/backlinks/{backlink_id}/submit-index")
async def submit_for_indexation(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Submit URL for Google indexation."""
    if not settings.has_speedyindex:
        raise HTTPException(status_code=400, detail="SpeedyIndex API non configurée")

    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")

    from backend.services.speedyindex import submit_for_indexation
    success = await submit_for_indexation(backlink.source_url)

    return {"backlink_id": backlink_id, "submitted": success}


@app.post("/api/projects/{project_id}/backlinks/{backlink_id}/metrics")
async def fetch_domain_metrics(
    project_id: str,
    backlink_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetch domain metrics from DomDetailer."""
    if not settings.has_domdetailer:
        raise HTTPException(status_code=400, detail="DomDetailer API non configurée")

    result = await db.execute(
        select(Backlink).where(Backlink.id == backlink_id, Backlink.project_id == project_id)
    )
    backlink = result.scalar_one_or_none()
    if not backlink:
        raise HTTPException(status_code=404, detail="Backlink non trouvé")

    from backend.services.domdetailer import fetch_domain_metrics as fetch_metrics
    metrics = await fetch_metrics(backlink.source_domain)

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

        # Record metrics update history
        await record_history(
            db, backlink, "metrics_updated",
            details=f"DR={metrics.get('domain_rank')}, UR={metrics.get('url_rank')}",
        )

        await db.flush()

    return {"backlink_id": backlink_id, "metrics": metrics}


# ── Billing / Subscription Routes ────────────────────────────────────


class SubscribeRequest(BaseModel):
    plan: str
    interval: str = "monthly"
    payment_method_id: Optional[str] = None
    email: Optional[str] = None


class ChangePlanRequest(BaseModel):
    plan: str
    interval: str = "monthly"


class SubscriptionOut(BaseModel):
    id: str
    plan: str
    status: str
    billing_interval: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@app.get("/api/billing/subscription", response_model=SubscriptionOut)
async def get_subscription(
    sub: Subscription = Depends(get_user_subscription),
    user_id: str = Depends(get_current_user),
):
    """Get the current user's subscription."""
    return sub


@app.get("/api/billing/plans")
async def get_plans(
    user_id: str = Depends(get_current_user),
):
    """Return plan definitions for frontend display."""
    return PLAN_LIMITS


@app.post("/api/billing/setup-intent")
async def create_setup_intent_route(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create a Stripe SetupIntent for card collection via Stripe Elements."""
    from backend.services.stripe_service import create_setup_intent, create_stripe_customer

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        sub = Subscription(
            user_id=user_id,
            plan=SubscriptionPlan.free,
            status=SubscriptionStatus.active,
        )
        db.add(sub)
        await db.flush()

    if not sub.stripe_customer_id:
        customer_id = create_stripe_customer(email="", user_id=user_id)
        sub.stripe_customer_id = customer_id
        await db.flush()

    intent_data = create_setup_intent(sub.stripe_customer_id)
    await db.commit()
    return intent_data


@app.post("/api/billing/subscribe", response_model=SubscriptionOut)
async def subscribe(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create or update subscription. Free = DB only. Paid = Stripe flow."""
    from backend.services.stripe_service import (
        create_stripe_customer, create_subscription as create_stripe_sub,
        get_price_id,
    )

    # Get or create subscription record
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()

    if data.plan == "free":
        if sub:
            sub.plan = SubscriptionPlan.free
            sub.status = SubscriptionStatus.active
            sub.billing_interval = None
            sub.stripe_subscription_id = None
            sub.stripe_price_id = None
        else:
            sub = Subscription(
                user_id=user_id,
                plan=SubscriptionPlan.free,
                status=SubscriptionStatus.active,
            )
            db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    # Paid plan flow
    if not data.payment_method_id:
        raise HTTPException(400, "payment_method_id requis pour les plans payants")

    price_id = get_price_id(data.plan, data.interval)
    if not price_id:
        raise HTTPException(400, "Combinaison plan/intervalle invalide")

    if not sub:
        sub = Subscription(user_id=user_id)
        db.add(sub)
        await db.flush()

    # Create Stripe customer if needed
    if not sub.stripe_customer_id:
        customer_id = create_stripe_customer(
            email=data.email or "",
            user_id=user_id,
        )
        sub.stripe_customer_id = customer_id

    # Create Stripe subscription with 7-day trial
    stripe_sub = create_stripe_sub(
        customer_id=sub.stripe_customer_id,
        price_id=price_id,
        payment_method_id=data.payment_method_id,
        trial_days=7,
    )

    # Update DB record
    sub.plan = data.plan
    sub.status = stripe_sub.status
    sub.billing_interval = data.interval
    sub.stripe_subscription_id = stripe_sub.id
    sub.stripe_price_id = price_id

    if stripe_sub.trial_start:
        sub.trial_start = datetime.fromtimestamp(stripe_sub.trial_start)
    if stripe_sub.trial_end:
        sub.trial_end = datetime.fromtimestamp(stripe_sub.trial_end)
    sub.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start)
    sub.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end)

    await db.commit()
    await db.refresh(sub)
    return sub


@app.post("/api/billing/change-plan", response_model=SubscriptionOut)
async def change_plan(
    data: ChangePlanRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Upgrade or downgrade plan."""
    from backend.services.stripe_service import (
        change_subscription_price, cancel_subscription, get_price_id,
    )

    if data.plan == "free":
        # Downgrade to free = cancel Stripe subscription
        if sub.stripe_subscription_id:
            cancel_subscription(sub.stripe_subscription_id, at_period_end=False)
        sub.plan = SubscriptionPlan.free
        sub.status = SubscriptionStatus.active
        sub.stripe_subscription_id = None
        sub.stripe_price_id = None
        sub.billing_interval = None
        sub.cancel_at_period_end = False
        await db.commit()
        await db.refresh(sub)
        return sub

    price_id = get_price_id(data.plan, data.interval)
    if not price_id:
        raise HTTPException(400, "Combinaison plan/intervalle invalide")

    if not sub.stripe_subscription_id:
        raise HTTPException(
            400,
            "Pas d'abonnement payant actif. Utilisez /api/billing/subscribe.",
        )

    change_subscription_price(sub.stripe_subscription_id, price_id)
    sub.plan = data.plan
    sub.billing_interval = data.interval
    sub.stripe_price_id = price_id
    await db.commit()
    await db.refresh(sub)
    return sub


@app.post("/api/billing/cancel")
async def cancel_subscription_route(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Cancel subscription at end of billing period."""
    if not sub.stripe_subscription_id:
        raise HTTPException(400, "Pas d'abonnement actif à annuler")

    from backend.services.stripe_service import cancel_subscription
    cancel_subscription(sub.stripe_subscription_id, at_period_end=True)
    sub.cancel_at_period_end = True
    sub.canceled_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return {"message": "L'abonnement sera annulé à la fin de la période en cours"}


@app.post("/api/billing/reactivate")
async def reactivate_subscription_route(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Reactivate a subscription that was set to cancel at period end."""
    if not sub.stripe_subscription_id or not sub.cancel_at_period_end:
        raise HTTPException(400, "Pas d'abonnement en cours d'annulation")

    from backend.services.stripe_service import reactivate_subscription
    reactivate_subscription(sub.stripe_subscription_id)
    sub.cancel_at_period_end = False
    sub.canceled_at = None
    await db.commit()
    return {"message": "Abonnement réactivé"}


@app.post("/api/billing/portal")
async def billing_portal(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    sub: Subscription = Depends(get_user_subscription),
):
    """Create a Stripe Billing Portal URL."""
    if not sub.stripe_customer_id:
        raise HTTPException(400, "Pas de client Stripe associé")

    from backend.services.stripe_service import create_billing_portal_session
    url = create_billing_portal_session(
        sub.stripe_customer_id,
        return_url="https://spotseo.app/settings",
    )
    return {"url": url}


# ── Stripe Webhook (no auth) ─────────────────────────────────────────

from fastapi import Request

@app.post("/api/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events. No JWT auth required."""
    import stripe
    stripe.api_key = settings.stripe_secret_key

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Signature webhook invalide")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
    ):
        await _webhook_subscription_updated(db, data_obj)
    elif event_type == "customer.subscription.deleted":
        await _webhook_subscription_deleted(db, data_obj)
    elif event_type == "invoice.payment_failed":
        await _webhook_payment_failed(db, data_obj)

    await db.commit()
    return {"status": "ok"}


async def _webhook_subscription_updated(db: AsyncSession, stripe_sub: dict):
    """Sync Stripe subscription state to local DB."""
    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == stripe_sub["id"]
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    sub.status = stripe_sub["status"]
    sub.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"])
    sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
    sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)

    if stripe_sub.get("trial_end"):
        sub.trial_end = datetime.fromtimestamp(stripe_sub["trial_end"])

    # If subscription expired (trial ended without payment), downgrade to free
    if stripe_sub["status"] in ("canceled", "unpaid"):
        sub.plan = SubscriptionPlan.free
        sub.stripe_subscription_id = None

    sub.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)


async def _webhook_subscription_deleted(db: AsyncSession, stripe_sub: dict):
    """Stripe subscription was deleted. Downgrade to free."""
    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == stripe_sub["id"]
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.plan = SubscriptionPlan.free
        sub.status = SubscriptionStatus.canceled
        sub.stripe_subscription_id = None
        sub.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)


async def _webhook_payment_failed(db: AsyncSession, invoice: dict):
    """Mark subscription as past_due on payment failure."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.past_due
        sub.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
