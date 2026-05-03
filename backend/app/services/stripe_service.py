"""
Stripe Payment Service
Handles PaymentIntent creation, webhook verification, and QR code generation.
Uses test mode by default. Set STRIPE_SECRET_KEY in .env for live mode.
"""
import stripe
import qrcode
import io
import base64
from app.config import settings


def _get_stripe_client():
    """Initialize Stripe with secret key from config."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


async def create_payment_intent(
    amount_dollars: float,
    currency: str,
    order_id: str,
    table_number: int = None,
    description: str = None,
) -> dict:
    """
    Create a Stripe PaymentIntent for an order.
    amount_dollars is converted to cents internally.

    Returns:
        {
            "payment_intent_id": "pi_xxx",
            "client_secret": "pi_xxx_secret_xxx",
            "amount": 47.50,
            "currency": "usd",
            "status": "requires_payment_method",
            "order_id": "ORD-XXX",
            "qr_code_base64": "<base64 PNG>",
            "payment_url": "https://..."
        }
    """
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
        # Return simulated response when Stripe is not configured
        simulated_id = f"pi_sim_{order_id.replace('-', '_').lower()}"
        payment_url = f"http://localhost:8000/api/stripe/simulate?order_id={order_id}&amount={amount_dollars}"
        qr_b64 = _generate_qr_base64(payment_url)
        return {
            "payment_intent_id": simulated_id,
            "client_secret": f"{simulated_id}_secret_simulated",
            "amount": amount_dollars,
            "currency": currency,
            "status": "requires_payment_method",
            "order_id": order_id,
            "qr_code_base64": qr_b64,
            "payment_url": payment_url,
            "simulated": True,
        }

    # Real Stripe call
    try:
        _get_stripe_client()
        amount_cents = int(round(amount_dollars * 100))

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            description=description or f"S.A.F.E Table Order {order_id}",
            metadata={
                "order_id": order_id,
                "table_number": str(table_number) if table_number else "",
            },
        )

        # Build a Stripe Checkout URL (deep-link for mobile payments)
        payment_url = f"https://checkout.stripe.com/pay/{intent['id']}"
        qr_b64 = _generate_qr_base64(payment_url)

        return {
            "payment_intent_id": intent["id"],
            "client_secret": intent["client_secret"],
            "amount": amount_dollars,
            "currency": currency,
            "status": intent["status"],
            "order_id": order_id,
            "qr_code_base64": qr_b64,
            "payment_url": payment_url,
            "simulated": False,
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    """
    Verify Stripe webhook signature and return the parsed event.
    Raises ValueError if signature is invalid.
    """
    if not settings.STRIPE_WEBHOOK_SECRET or settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_placeholder"):
        import json
        # In dev mode without webhook secret, parse directly
        return json.loads(payload)

    try:
        _get_stripe_client()
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return dict(event)
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid Stripe webhook signature")


def _generate_qr_base64(data: str) -> str:
    """
    Generate a QR code for the given data and return as base64-encoded PNG.
    The QR code encodes the payment URL so a phone can scan it to pay.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")
