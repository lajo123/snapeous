"""Snapeous - Stripe API service layer."""

import stripe
from backend.config import settings

stripe.api_key = settings.stripe_secret_key

# Map (plan, interval) -> Stripe Price ID
PRICE_MAP = {
    ("starter", "monthly"): settings.stripe_price_starter_monthly,
    ("starter", "annual"): settings.stripe_price_starter_annual,
    ("pro", "monthly"): settings.stripe_price_pro_monthly,
    ("pro", "annual"): settings.stripe_price_pro_annual,
    ("agency", "monthly"): settings.stripe_price_agency_monthly,
    ("agency", "annual"): settings.stripe_price_agency_annual,
}


def get_price_id(plan: str, interval: str) -> str | None:
    """Get the Stripe Price ID for a plan/interval combo."""
    return PRICE_MAP.get((plan, interval)) or None


def create_stripe_customer(email: str, user_id: str) -> str:
    """Create a Stripe customer and return the customer ID."""
    customer = stripe.Customer.create(
        email=email,
        metadata={"supabase_user_id": user_id},
    )
    return customer.id


def create_setup_intent(customer_id: str) -> dict:
    """Create a SetupIntent for collecting card details via Stripe Elements."""
    intent = stripe.SetupIntent.create(
        customer=customer_id,
        payment_method_types=["card"],
    )
    return {"client_secret": intent.client_secret, "id": intent.id}


def create_subscription(
    customer_id: str,
    price_id: str,
    payment_method_id: str,
    trial_days: int = 7,
) -> stripe.Subscription:
    """Create a Stripe subscription with trial period."""
    # Set the payment method as the customer's default
    stripe.Customer.modify(
        customer_id,
        invoice_settings={"default_payment_method": payment_method_id},
    )

    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        trial_period_days=trial_days,
        payment_settings={
            "payment_method_types": ["card"],
            "save_default_payment_method": "on_subscription",
        },
        expand=["latest_invoice"],
    )
    return subscription


def cancel_subscription(stripe_subscription_id: str, at_period_end: bool = True):
    """Cancel a subscription (at period end by default)."""
    if at_period_end:
        return stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=True,
        )
    else:
        return stripe.Subscription.cancel(stripe_subscription_id)


def reactivate_subscription(stripe_subscription_id: str):
    """Reactivate a subscription that was set to cancel at period end."""
    return stripe.Subscription.modify(
        stripe_subscription_id,
        cancel_at_period_end=False,
    )


def change_subscription_price(stripe_subscription_id: str, new_price_id: str):
    """Change the price on an existing subscription (upgrade/downgrade)."""
    sub = stripe.Subscription.retrieve(stripe_subscription_id)
    return stripe.Subscription.modify(
        stripe_subscription_id,
        items=[{
            "id": sub["items"]["data"][0]["id"],
            "price": new_price_id,
        }],
        proration_behavior="create_prorations",
    )


def create_billing_portal_session(customer_id: str, return_url: str) -> str:
    """Create a Stripe Billing Portal session URL."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url
