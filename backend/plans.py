"""Snapeous - Plan limits configuration (single source of truth)."""

PLAN_LIMITS = {
    "free": {
        "label": "Free",
        "max_domains": 1,
        "max_backlinks": 50,
        "check_frequency": "weekly",
        "data_retention_days": 30,
        "price_monthly_eur": 0,
        "price_annual_eur": 0,
        "features": [
            "basic_dashboard",
            "basic_email_alerts",
        ],
    },
    "starter": {
        "label": "Starter",
        "max_domains": 3,
        "max_backlinks": 500,
        "check_frequency": "daily",
        "data_retention_days": 180,
        "price_monthly_eur": 1900,
        "price_annual_eur": 1500,
        "features": [
            "basic_dashboard",
            "full_analysis",
            "toxic_link_detection",
            "csv_export",
            "full_email_alerts",
        ],
    },
    "pro": {
        "label": "Pro",
        "max_domains": 10,
        "max_backlinks": 5000,
        "check_frequency": "realtime",
        "data_retention_days": 365,
        "price_monthly_eur": 4900,
        "price_annual_eur": 3900,
        "features": [
            "basic_dashboard",
            "full_analysis",
            "toxic_link_detection",
            "csv_export",
            "full_email_alerts",
            "ai_recommendations",
            "competitors_3",
            "pdf_reports",
            "gsc_integration",
            "api_access",
        ],
    },
    "agency": {
        "label": "Agency",
        "max_domains": 999999,
        "max_backlinks": 25000,
        "check_frequency": "realtime",
        "data_retention_days": 999999,
        "price_monthly_eur": 9900,
        "price_annual_eur": 7900,
        "features": [
            "basic_dashboard",
            "full_analysis",
            "toxic_link_detection",
            "csv_export",
            "full_email_alerts",
            "ai_recommendations",
            "unlimited_competitors",
            "pdf_reports",
            "gsc_integration",
            "api_access",
            "sub_accounts",
            "scheduled_reports",
            "priority_support",
            "advanced_api",
        ],
    },
}


def get_plan_limits(plan: str) -> dict:
    """Return limits dict for a given plan name."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
