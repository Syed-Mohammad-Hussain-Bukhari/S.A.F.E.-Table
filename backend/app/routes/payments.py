<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.payment import PaymentCreate, PaymentConfirm, PaymentStatusEnum
from bson import ObjectId
from datetime import datetime
import uuid
import json
=======
"""
Generic (non-Stripe) payment routes.

Confirmation uses CAS so two concurrent confirms cannot both flip an order
to paid. RBAC: confirmation requires server/manager/admin role; QR generation
is open to allow customer-side prompts (still requires order to exist).
"""
import json
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_database
from app.models.payment import PaymentConfirm, PaymentCreate, PaymentStatusEnum
from app.routes.auth import require_roles
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


<<<<<<< HEAD
@router.post("/generate-qr", status_code=201)
async def generate_qr_payment(payment: PaymentCreate):
    """Generate QR code data for payment."""
    db = get_database()

    # Verify order exists
    order = await db.orders.find_one({"order_id": payment.order_id})
    if not order:
        if ObjectId.is_valid(payment.order_id):
            order = await db.orders.find_one({"_id": ObjectId(payment.order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"

    # Create QR data payload
    qr_data = json.dumps({
        "payment_id": payment_id,
        "order_id": payment.order_id,
        "amount": payment.amount,
=======
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/generate-qr", status_code=201)
async def generate_qr_payment(payment: PaymentCreate):
    """Generate QR data for a pending payment. The amount is taken from the
    order on file, NOT from the request body — clients cannot under-pay."""
    db = get_database()

    order = await db.orders.find_one({"order_id": payment.order_id})
    if not order and ObjectId.is_valid(payment.order_id):
        order = await db.orders.find_one({"_id": ObjectId(payment.order_id)})
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    if order.get("payment_status") == "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "Order is already paid")

    # Server-trusted amount.
    server_amount = float(order.get("total_price", 0.0))
    if server_amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order has no payable amount")

    payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    qr_data = json.dumps({
        "payment_id": payment_id,
        "order_id": order["order_id"],
        "amount": server_amount,
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "method": payment.method.value,
        "restaurant": "SAFE Table",
    })

    payment_dict = {
        "payment_id": payment_id,
<<<<<<< HEAD
        "order_id": payment.order_id,
        "amount": payment.amount,
        "method": payment.method.value,
        "status": PaymentStatusEnum.PENDING.value,
        "qr_code_data": qr_data,
        "created_at": datetime.utcnow(),
=======
        "order_id": order["order_id"],
        "amount": server_amount,
        "method": payment.method.value,
        "status": PaymentStatusEnum.PENDING.value,
        "qr_code_data": qr_data,
        "created_at": _utcnow(),
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "completed_at": None,
    }

    result = await db.payments.insert_one(payment_dict)
    payment_dict["_id"] = str(result.inserted_id)
<<<<<<< HEAD

=======
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return payment_dict


@router.post("/confirm")
<<<<<<< HEAD
async def confirm_payment(confirm: PaymentConfirm):
    """Simulate payment confirmation (mark as paid)."""
    db = get_database()

    payment = await db.payments.find_one({"payment_id": confirm.payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] == PaymentStatusEnum.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Payment already completed")

    now = datetime.utcnow()
    await db.payments.update_one(
        {"payment_id": confirm.payment_id},
        {"$set": {"status": PaymentStatusEnum.COMPLETED.value, "completed_at": now}}
    )

    # Also update order payment status
    await db.orders.update_one(
        {"order_id": payment["order_id"]},
        {"$set": {"payment_status": "paid", "updated_at": now}}
    )

    updated = await db.payments.find_one({"payment_id": confirm.payment_id})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/{payment_id}")
async def get_payment(payment_id: str):
    """Get payment details."""
    db = get_database()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
=======
async def confirm_payment(
    confirm: PaymentConfirm,
    actor: dict = Depends(require_roles("server", "manager", "admin")),
):
    """Confirm a non-Stripe payment (e.g. cash, manual). CAS-protected."""
    db = get_database()
    now = _utcnow()

    # CAS: only flip pending → completed. Concurrent confirms or a re-submit
    # of an already-completed payment both yield modified_count == 0.
    result = await db.payments.update_one(
        {"payment_id": confirm.payment_id, "status": PaymentStatusEnum.PENDING.value},
        {"$set": {
            "status": PaymentStatusEnum.COMPLETED.value,
            "completed_at": now,
            "completed_by": actor["username"],
        }},
    )
    if result.modified_count == 0:
        # Distinguish "doesn't exist" from "already completed".
        existing = await db.payments.find_one({"payment_id": confirm.payment_id})
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Payment is in status '{existing['status']}', cannot confirm")

    payment = await db.payments.find_one({"payment_id": confirm.payment_id})

    # Mirror onto the order — also CAS so we don't clobber a refund-in-flight.
    await db.orders.update_one(
        {"order_id": payment["order_id"], "payment_status": {"$ne": "paid"}},
        {"$set": {"payment_status": "paid", "updated_at": now}},
    )

    payment["_id"] = str(payment["_id"])
    return payment


@router.get("/{payment_id}")
async def get_payment(
    payment_id: str,
    _: dict = Depends(require_roles("server", "manager", "admin", "kitchen")),
):
    db = get_database()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    payment["_id"] = str(payment["_id"])
    return payment


@router.get("/order/{order_id}")
<<<<<<< HEAD
async def get_payment_by_order(order_id: str):
    """Get payment for a specific order."""
    db = get_database()
    payment = await db.payments.find_one({"order_id": order_id})
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this order")
=======
async def get_payment_by_order(
    order_id: str,
    _: dict = Depends(require_roles("server", "manager", "admin", "kitchen")),
):
    db = get_database()
    payment = await db.payments.find_one({"order_id": order_id})
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No payment found for this order")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    payment["_id"] = str(payment["_id"])
    return payment
