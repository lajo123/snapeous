"""Snapeous - Subscription enforcement dependencies for FastAPI."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.auth import get_current_user
from backend.models.models import (
    Subscription, SubscriptionPlan, SubscriptionStatus,
    Project, Backlink, ProjectCreationLog,
)
from backend.plans import get_plan_limits

# Monthly project-creation cap for free accounts
FREE_PLAN_MONTHLY_CREATION_LIMIT = 5


async def get_user_subscription(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
) -> Subscription:
    """Get the user's subscription, auto-creating a free one if none exists."""
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
        await db.refresh(sub)

    return sub


async def check_domain_limit(
    db: AsyncSession,
    user_id: str,
    subscription: Subscription,
):
    """Raise 403 if the user has reached their project (domain) limit."""
    plan_name = subscription.plan if isinstance(subscription.plan, str) else subscription.plan.value
    limits = get_plan_limits(plan_name)

    result = await db.execute(
        select(func.count(Project.id)).where(Project.user_id == user_id)
    )
    current_count = result.scalar() or 0

    if current_count >= limits["max_domains"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_LIMIT_REACHED",
                "message": f"Votre plan {limits['label']} est limité à {limits['max_domains']} domaine(s).",
                "limit_type": "domains",
                "limit": limits["max_domains"],
                "current": current_count,
                "current_plan": plan_name,
                "upgrade_required": True,
            },
        )


async def check_backlink_limit(
    db: AsyncSession,
    project_id: str,
    subscription: Subscription,
):
    """Raise 403 if the project has reached the backlink limit for the plan."""
    plan_name = subscription.plan if isinstance(subscription.plan, str) else subscription.plan.value
    limits = get_plan_limits(plan_name)

    result = await db.execute(
        select(func.count(Backlink.id)).where(Backlink.project_id == project_id)
    )
    current_count = result.scalar() or 0

    if current_count >= limits["max_backlinks"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_LIMIT_REACHED",
                "message": f"Votre plan {limits['label']} est limité à {limits['max_backlinks']} backlinks par projet.",
                "limit_type": "backlinks",
                "limit": limits["max_backlinks"],
                "current": current_count,
                "current_plan": plan_name,
                "upgrade_required": True,
            },
        )


async def check_monthly_creation_limit(
    db: AsyncSession,
    user_id: str,
    subscription: Subscription,
):
    """Raise 429 if a free-plan user has created too many projects this month.

    This prevents the create-delete-recreate abuse pattern by tracking every
    creation in `project_creation_log`, which persists even after deletion.
    Paid plans are not subject to this limit.
    """
    plan_name = subscription.plan if isinstance(subscription.plan, str) else subscription.plan.value
    if plan_name != "free":
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    result = await db.execute(
        select(func.count(ProjectCreationLog.id)).where(
            ProjectCreationLog.user_id == user_id,
            extract("year", ProjectCreationLog.created_at) == now.year,
            extract("month", ProjectCreationLog.created_at) == now.month,
        )
    )
    creations_this_month = result.scalar() or 0

    if creations_this_month >= FREE_PLAN_MONTHLY_CREATION_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "MONTHLY_CREATION_LIMIT",
                "message": (
                    f"Les comptes gratuits sont limités à {FREE_PLAN_MONTHLY_CREATION_LIMIT} "
                    f"créations de projet par mois. Vous avez déjà créé "
                    f"{creations_this_month} projet(s) ce mois-ci."
                ),
                "limit_type": "monthly_creations",
                "limit": FREE_PLAN_MONTHLY_CREATION_LIMIT,
                "current": creations_this_month,
                "current_plan": plan_name,
                "upgrade_required": True,
            },
        )
