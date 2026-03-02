"""Snapeous - SQLAlchemy models for all database tables."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime, Enum, JSON, ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Return current UTC time as a naive (offset-unaware) datetime.

    PostgreSQL columns are TIMESTAMP WITHOUT TIME ZONE, so asyncpg requires
    naive datetime objects.  We still compute the value from timezone.utc to
    guarantee UTC semantics.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Enums ──────────────────────────────────────────────────────────────


class ProjectStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    archived = "archived"


class FootprintCategory(str, enum.Enum):
    blog_comments = "blog_comments"
    forums = "forums"
    directories = "directories"
    guestbooks = "guestbooks"
    profiles = "profiles"
    social = "social"
    authority = "authority"
    serp_exploration = "serp_exploration"
    files = "files"
    guest_posts = "guest_posts"
    wikis = "wikis"
    ereputation = "ereputation"
    web20 = "web20"


class LinkType(str, enum.Enum):
    dofollow = "dofollow"
    nofollow = "nofollow"
    ugc = "ugc"
    sponsored = "sponsored"
    mix = "mix"


class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class SearchStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class SpotStatus(str, enum.Enum):
    discovered = "discovered"
    qualified = "qualified"
    selected = "selected"
    rejected = "rejected"
    contacted = "contacted"
    link_posted = "link_posted"
    failed = "failed"


class BacklinkStatus(str, enum.Enum):
    active = "active"
    lost = "lost"
    pending = "pending"


class BacklinkLinkType(str, enum.Enum):
    dofollow = "dofollow"
    nofollow = "nofollow"


class SubscriptionPlan(str, enum.Enum):
    free = "free"
    starter = "starter"
    pro = "pro"
    agency = "agency"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    trialing = "trialing"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"
    unpaid = "unpaid"


class BillingInterval(str, enum.Enum):
    monthly = "monthly"
    annual = "annual"


# ── Models ─────────────────────────────────────────────────────────────


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_domain: Mapped[str] = mapped_column(String(255), nullable=False)
    target_urls: Mapped[dict | None] = mapped_column(JSON, default=list)
    keywords: Mapped[dict | None] = mapped_column(JSON, default=list)
    anchors: Mapped[dict | None] = mapped_column(JSON, default=list)
    niche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scoring_weights: Mapped[dict | None] = mapped_column(
        JSON,
        default=lambda: {
            "da": 0.25,
            "dr": 0.25,
            "tf": 0.20,
            "spam_score_inv": 0.15,
            "dofollow_bonus": 0.15,
        },
    )
    site_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    # Relationships
    searches: Mapped[list["Search"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    spots: Mapped[list["Spot"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    backlinks: Mapped[list["Backlink"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Footprint(Base):
    __tablename__ = "footprints"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(Enum(FootprintCategory), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    query_template: Mapped[str] = mapped_column(Text, nullable=False)
    expected_link_type: Mapped[str] = mapped_column(
        Enum(LinkType), default=LinkType.nofollow
    )
    difficulty: Mapped[str] = mapped_column(
        Enum(Difficulty), default=Difficulty.medium
    )
    platform_target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="fr")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[dict | None] = mapped_column(JSON, default=list)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relationships
    searches: Mapped[list["Search"]] = relationship(back_populates="footprint")


class Search(Base):
    __tablename__ = "searches"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    footprint_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("footprints.id"), nullable=True
    )
    query_used: Mapped[str] = mapped_column(Text, nullable=False)
    keyword: Mapped[str | None] = mapped_column(String(255), nullable=True)
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        Enum(SearchStatus), default=SearchStatus.pending
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="searches")
    footprint: Mapped["Footprint | None"] = relationship(back_populates="searches")
    spots: Mapped[list["Spot"]] = relationship(back_populates="search")


class Spot(Base):
    __tablename__ = "spots"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    search_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("searches.id"), nullable=True
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serp_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # SEO metrics
    da: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tf: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cf: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spam_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    organic_traffic: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Detection results
    detected_platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detected_link_type: Mapped[str | None] = mapped_column(
        Enum(LinkType), nullable=True
    )
    has_comment_form: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_registration: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_url_field: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    spot_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Status & notes
    status: Mapped[str] = mapped_column(
        Enum(SpotStatus), default=SpotStatus.discovered
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="spots")
    search: Mapped["Search | None"] = relationship(back_populates="spots")


class Backlink(Base):
    __tablename__ = "backlinks"
    __table_args__ = (
        UniqueConstraint('project_id', 'source_url', name='uq_backlink_project_source'),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    # Foreign key to project
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    # Core link data
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    target_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    anchor_text: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # HTTP & link analysis
    http_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    links_on_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    link_type: Mapped[str | None] = mapped_column(
        Enum(BacklinkLinkType), nullable=True, default=BacklinkLinkType.dofollow
    )

    # Status
    status: Mapped[str] = mapped_column(
        Enum(BacklinkStatus), default=BacklinkStatus.pending
    )

    # Domain metrics (from DomDetailer API)
    domain_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    url_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    backlinks_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    referring_domains: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dofollow_backlinks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nofollow_backlinks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gov_backlinks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edu_backlinks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dofollow_referring: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nofollow_referring: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gov_referring: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edu_referring: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Google indexation (SpeedyIndex)
    is_indexed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    index_checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    first_check_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_check_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="backlinks")
    history: Mapped[list["BacklinkHistory"]] = relationship(
        back_populates="backlink", cascade="all, delete-orphan"
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )

    # Plan info — use schema_name to match existing PostgreSQL enum types
    plan: Mapped[str] = mapped_column(
        Enum(SubscriptionPlan, name="subscription_plan", create_type=False),
        default=SubscriptionPlan.free,
    )
    status: Mapped[str] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status", create_type=False),
        default=SubscriptionStatus.active,
    )
    billing_interval: Mapped[str | None] = mapped_column(
        Enum(BillingInterval, name="billing_interval", create_type=False),
        nullable=True,
    )

    # Stripe references
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True
    )
    stripe_price_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    # Trial tracking
    trial_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trial_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Period tracking
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    # Cancel tracking
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )


class BacklinkHistory(Base):
    __tablename__ = "backlink_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    backlink_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("backlinks.id", ondelete="CASCADE"), nullable=False
    )

    # What changed
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # created, status_changed, http_changed, metrics_updated

    # Old/new values for status
    old_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Old/new values for HTTP code
    old_http_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_http_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Snapshot of key metrics at time of event
    domain_rank_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_indexed_snapshot: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Metadata
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relationships
    backlink: Mapped["Backlink"] = relationship(back_populates="history")
