"""
<<<<<<< HEAD
Stripe Payment Service
Handles PaymentIntent creation, webhook verification, and QR code generation.
Uses test mode by default. Set STRIPE_SECRET_KEY in .env for live mode.
"""
import stripe
import qrcode
import io
import base64
=======
Stripe Payment Service.

Hardened: webhook verification fails closed (no plain-JSON fallback).
The simulated path is only reachable when STRIPE_SECRET_KEY is unset/placeholder
AND the caller is running with ENV != production (enforced in routes/stripe_payments).
"""
import base64
import io

import qrcode
import stripe

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
from app.config import settings


def _get_stripe_client():
<<<<<<< HEAD
    """Initialize Stripe with secret key from config."""
=======
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


<<<<<<< HEAD
=======
def _stripe_is_simulated() -> bool:
    return (
        not settings.STRIPE_SECRET_KEY
        or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder")
    )


>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
async def create_payment_intent(
    amount_dollars: float,
    currency: str,
    order_id: str,
<<<<<<< HEAD
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
=======
    table_number: int | None = None,
    description: str | None = None,
) -> dict:
    """Create a Stripe PaymentIntent for an order. Returns simulated payload
    when no live Stripe key is configured.

    Production callers MUST guard this with `not settings.is_production` before
    relying on the simulated branch (see routes/stripe_payments.py)."""
    if _stripe_is_simulated():
        if settings.is_production:
            # Defence in depth: refuse to mint simulated payments in prod even
            # if the route forgets to guard.
            raise RuntimeError("Stripe is not configured; refusing simulated payment in production")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
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

<<<<<<< HEAD
    # Real Stripe call
    try:
        _get_stripe_client()
        amount_cents = int(round(amount_dollars * 100))

=======
    try:
        _get_stripe_client()
        amount_cents = int(round(amount_dollars * 100))
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            description=description or f"S.A.F.E Table Order {order_id}",
            metadata={
                "order_id": order_id,
                "table_number": str(table_number) if table_number else "",
            },
        )
<<<<<<< HEAD

        # Build a Stripe Checkout URL (deep-link for mobile payments)
        payment_url = f"https://checkout.stripe.com/pay/{intent['id']}"
        qr_b64 = _generate_qr_base64(payment_url)

=======
        payment_url = f"https://checkout.stripe.com/pay/{intent['id']}"
        qr_b64 = _generate_qr_base64(payment_url)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
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
<<<<<<< HEAD
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
=======
    """Verify a Stripe webhook signature. **Fails closed.**

    Raises ValueError when the webhook secret is missing/placeholder OR when
    the signature does not validate. There is NO plain-JSON fallback path.
    """
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret or secret.startswith("whsec_placeholder"):
        raise ValueError(
            "STRIPE_WEBHOOK_SECRET is not configured; refusing to process webhook"
        )

    try:
        _get_stripe_client()
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        return dict(event)
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid Stripe webhook signature")


<<<<<<< HEAD
def _generate_qr_base64(data: str) -> str:
    """
    Generate a QR code for the given data and return as base64-encoded PNG.
    The QR code encodes the payment URL so a phone can scan it to pay.
    """
=======
_MAX_QR_BYTES = 2048  # ~2KB cap; QR v40 max is ~2.9KB raw alphanumeric.


def _generate_qr_base64(data: str) -> str:
    """Render `data` as a base64 PNG QR code. Caller is responsible for size
    validation (we re-check defensively here)."""
    if not isinstance(data, str):
        raise ValueError("QR data must be a string")
    encoded = data.encode("utf-8")
    if len(encoded) > _MAX_QR_BYTES:
        raise ValueError(f"QR data exceeds {_MAX_QR_BYTES} bytes")

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
<<<<<<< HEAD

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

=======
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
