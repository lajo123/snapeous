"""Snapeous - Subscription enforcement dependencies for FastAPI."""

from fastapi import Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.auth import get_current_user
from backend.models.models import (
    Subscription, SubscriptionPlan, SubscriptionStatus,
    Project, Backlink,
)
from backend.plans import get_plan_limits


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
