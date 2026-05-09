"""
<<<<<<< HEAD
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
=======
Stripe Payment Routes.

Hardening:
  • /webhook fails closed (services/stripe_service.verify_webhook).
  • /webhook is idempotent on Stripe's `event.id` (stripe_events TTL collection).
  • payment_intent.succeeded handler refuses to mark CANCELLED orders as paid;
    such events are deflected onto the `refund_queue` for back-office handling.
  • /simulate is mounted only when ENV != production.
  • /generate-qr requires staff auth and caps payload length.
  • All amounts are taken from the order on file, never from the request.
"""
from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from app.config import settings
from app.database import get_database
from app.models.stripe_payment import StripePaymentCreate
from app.routes.auth import require_roles
from app.services.stripe_service import (
    _generate_qr_base64,
    create_payment_intent,
    verify_webhook,
)
from app.util import utcnow
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

router = APIRouter(prefix="/api/stripe", tags=["Stripe Payments"])


<<<<<<< HEAD
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
=======
# ─── Customer-facing: create intent ───────────────────────────────────────

@router.post("/create-payment-intent", status_code=201)
async def create_intent(payment: StripePaymentCreate):
    """Create a PaymentIntent + QR code. Amount comes from the order on file."""
    db = get_database()

    order = await db.orders.find_one({"order_id": payment.order_id})
    if not order and ObjectId.is_valid(payment.order_id):
        order = await db.orders.find_one({"_id": ObjectId(payment.order_id)})
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    if order.get("status") == "cancelled":
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "Order is cancelled; no payment can be created")

    if order.get("payment_status") == "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "Order is already paid")

    server_amount = float(order.get("total_price", 0.0))
    if server_amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order has no payable amount")

    try:
        result = await create_payment_intent(
            amount_dollars=server_amount,
            currency=payment.currency,
            order_id=order["order_id"],
            table_number=payment.table_number or order.get("table_number"),
            description=payment.description,
        )
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))
    except Exception as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))

    payment_record = {
        "payment_intent_id": result["payment_intent_id"],
        "payment_id": result["payment_intent_id"],
        "order_id": order["order_id"],
        "amount": server_amount,
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "currency": payment.currency,
        "method": "stripe",
        "status": "pending",
        "qr_code_data": result.get("payment_url", ""),
<<<<<<< HEAD
        "created_at": datetime.utcnow(),
=======
        "created_at": utcnow(),
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "completed_at": None,
        "simulated": result.get("simulated", False),
    }
    await db.payments.update_one(
<<<<<<< HEAD
        {"order_id": payment.order_id, "method": "stripe"},
=======
        {"order_id": order["order_id"], "method": "stripe"},
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        {"$set": payment_record},
        upsert=True,
    )

    return result


<<<<<<< HEAD
@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle incoming Stripe webhook events.
    On `payment_intent.succeeded` → marks order payment_status as 'paid'.

    Configure your webhook endpoint in Stripe Dashboard:
    URL: https://your-domain.com/api/stripe/webhook
    Events: payment_intent.succeeded, payment_intent.payment_failed
    """
=======
# ─── Webhook ──────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook(payload, sig_header)
<<<<<<< HEAD
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
=======
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    db = get_database()

    # Idempotency: every Stripe event_id is processed at most once.
    event_id = event.get("id")
    if event_id:
        seen = await db.stripe_events.update_one(
            {"_id": event_id},
            {"$setOnInsert": {"at": utcnow(), "type": event.get("type")}},
            upsert=True,
        )
        if seen.matched_count:
            return {"received": True, "duplicate": True, "type": event.get("type")}

    etype = event.get("type")
    now = utcnow()

    if etype == "payment_intent.succeeded":
        pi = event["data"]["object"]
        order_id = (pi.get("metadata") or {}).get("order_id")
        pi_id = pi.get("id")

        if order_id:
            # CAS: only mark paid if (a) not already paid AND (b) not cancelled.
            # Otherwise, deflect to the refund_queue — payment arrived for a
            # cancelled order and finance must reconcile / refund.
            result = await db.orders.update_one(
                {
                    "order_id": order_id,
                    "status": {"$ne": "cancelled"},
                    "payment_status": {"$ne": "paid"},
                },
                {"$set": {"payment_status": "paid", "updated_at": now}},
            )
            if result.modified_count == 0:
                # Distinguish "already paid" (benign duplicate) from "cancelled"
                # (needs refund). We only enqueue when the order is cancelled.
                order = await db.orders.find_one({"order_id": order_id})
                if order and order.get("status") == "cancelled":
                    await db.refund_queue.update_one(
                        {"payment_intent_id": pi_id},
                        {"$setOnInsert": {
                            "payment_intent_id": pi_id,
                            "order_id": order_id,
                            "amount": float(pi.get("amount", 0)) / 100.0,
                            "currency": pi.get("currency"),
                            "reason": "payment_succeeded_for_cancelled_order",
                            "status": "pending",
                            "queued_at": now,
                        }},
                        upsert=True,
                    )

        if pi_id:
            await db.payments.update_one(
                {"payment_intent_id": pi_id, "status": {"$ne": "completed"}},
                {"$set": {"status": "completed", "completed_at": now}},
            )

    elif etype == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        pi_id = pi.get("id")
        if pi_id:
            await db.payments.update_one(
                {"payment_intent_id": pi_id, "status": {"$ne": "completed"}},
                {"$set": {"status": "failed", "updated_at": now}},
            )

    return {"received": True, "type": etype}


# ─── Read ─────────────────────────────────────────────────────────────────

@router.get("/payment-status/{payment_intent_id}")
async def get_payment_status(payment_intent_id: str):
    db = get_database()
    payment = await db.payments.find_one({"payment_intent_id": payment_intent_id})
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    payment["_id"] = str(payment["_id"])
    return payment


<<<<<<< HEAD
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
=======
# ─── QR helper (auth-gated, length-capped) ────────────────────────────────

_MAX_QR_INPUT_LEN = 1024


@router.post("/generate-qr")
async def generate_qr(
    payload: dict = Body(...),
    _: dict = Depends(require_roles("admin", "manager", "server")),
):
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, str) or not data.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Field 'data' (string) is required")
    if len(data) > _MAX_QR_INPUT_LEN:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            f"data exceeds {_MAX_QR_INPUT_LEN} chars")
    try:
        qr_b64 = _generate_qr_base64(data)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return {"qr_code_base64": qr_b64, "data": data}


# ─── Dev simulator (only mounted outside production) ──────────────────────

if not settings.is_production:

    @router.get("/simulate", include_in_schema=False)
    async def simulate_payment(order_id: str, amount: float):
        """Dev-only simulated payment success page."""
        db = get_database()
        now = utcnow()
        # Same cancelled-order guard as the real webhook.
        await db.orders.update_one(
            {
                "order_id": order_id,
                "status": {"$ne": "cancelled"},
                "payment_status": {"$ne": "paid"},
            },
            {"$set": {"payment_status": "paid", "updated_at": now}},
        )
        await db.payments.update_one(
            {"order_id": order_id, "status": {"$ne": "completed"}},
            {"$set": {"status": "completed", "completed_at": now}},
        )
        return {
            "message": "Payment simulated successfully (development mode)",
            "order_id": order_id,
            "amount": amount,
            "status": "paid",
        }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
