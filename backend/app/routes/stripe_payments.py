"""
Stripe Payment Routes — QR Code & Payment Integration

Endpoints:
  POST /api/stripe/create-payment-intent  — create Stripe PaymentIntent + QR code
  POST /api/stripe/webhook                — handle Stripe webhook events
  GET  /api/stripe/payment-status/{id}   — check payment status
  GET  /api/stripe/simulate              — simulated payment success page (dev only)

Without a real Stripe key the endpoints return simulated responses that are
fully functional for frontend testing.

Example Request (create payment):
  POST /api/stripe/create-payment-intent
  {"order_id": "ORD-ABC-DEF", "amount": 47.50, "currency": "usd", "table_number": 1}

Example Response:
  {"payment_intent_id": "pi_...", "client_secret": "...", "qr_code_base64": "...", "payment_url": "..."}
"""
from fastapi import APIRouter, HTTPException, Request
from app.models.stripe_payment import StripePaymentCreate
from app.services.stripe_service import (
    create_payment_intent,
    verify_webhook,
    _generate_qr_base64,
)
from app.database import get_database
from datetime import datetime

router = APIRouter(prefix="/api/stripe", tags=["Stripe Payments"])


@router.post("/create-payment-intent", status_code=201)
async def create_intent(payment: StripePaymentCreate):
    """
    Create a Stripe PaymentIntent and generate a QR code image (base64 PNG).
    The QR code encodes the payment URL — customers scan it with their phone to pay.

    Returns client_secret for frontend Stripe.js integration.
    Works with simulated mode when STRIPE_SECRET_KEY is not configured.
    """
    db = get_database()

    # Verify order exists
    order = await db.orders.find_one({"order_id": payment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        result = await create_payment_intent(
            amount_dollars=payment.amount,
            currency=payment.currency,
            order_id=payment.order_id,
            table_number=payment.table_number,
            description=payment.description,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Record payment intent in DB
    payment_record = {
        "payment_intent_id": result["payment_intent_id"],
        "payment_id": result["payment_intent_id"],
        "order_id": payment.order_id,
        "amount": payment.amount,
        "currency": payment.currency,
        "method": "stripe",
        "status": "pending",
        "qr_code_data": result.get("payment_url", ""),
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "simulated": result.get("simulated", False),
    }
    await db.payments.update_one(
        {"order_id": payment.order_id, "method": "stripe"},
        {"$set": payment_record},
        upsert=True,
    )

    return result


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle incoming Stripe webhook events.
    On `payment_intent.succeeded` → marks order payment_status as 'paid'.

    Configure your webhook endpoint in Stripe Dashboard:
    URL: https://your-domain.com/api/stripe/webhook
    Events: payment_intent.succeeded, payment_intent.payment_failed
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    db = get_database()

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        order_id = pi.get("metadata", {}).get("order_id")
        if order_id:
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
            await db.payments.update_one(
                {"payment_intent_id": pi["id"]},
                {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
            )

    elif event["type"] == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        await db.payments.update_one(
            {"payment_intent_id": pi["id"]},
            {"$set": {"status": "failed"}}
        )

    return {"received": True, "type": event["type"]}


@router.get("/payment-status/{payment_intent_id}")
async def get_payment_status(payment_intent_id: str):
    """Check the status of a Stripe PaymentIntent in our database."""
    db = get_database()
    payment = await db.payments.find_one({"payment_intent_id": payment_intent_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment["_id"] = str(payment["_id"])
    return payment


@router.get("/simulate")
async def simulate_payment(order_id: str, amount: float):
    """
    Dev-only simulated payment page — marks payment as completed.
    In production this is replaced by the real Stripe hosted page.
    """
    db = get_database()
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
    )
    await db.payments.update_one(
        {"order_id": order_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    return {
        "message": "Payment simulated successfully (development mode)",
        "order_id": order_id,
        "amount": amount,
        "status": "paid",
    }


@router.post("/generate-qr")
async def generate_qr(data: str):
    """
    Generate a QR code image (base64 PNG) for any string data.
    Useful for custom payment links or table-specific QR codes.
    """
    if not data.strip():
        raise HTTPException(status_code=400, detail="Data cannot be empty")
    qr_b64 = _generate_qr_base64(data)
    return {"qr_code_base64": qr_b64, "data": data}
