from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.payment import PaymentCreate, PaymentConfirm, PaymentStatusEnum
from bson import ObjectId
from datetime import datetime
import uuid
import json

router = APIRouter(prefix="/api/payments", tags=["Payments"])


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
        "method": payment.method.value,
        "restaurant": "SAFE Table",
    })

    payment_dict = {
        "payment_id": payment_id,
        "order_id": payment.order_id,
        "amount": payment.amount,
        "method": payment.method.value,
        "status": PaymentStatusEnum.PENDING.value,
        "qr_code_data": qr_data,
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }

    result = await db.payments.insert_one(payment_dict)
    payment_dict["_id"] = str(result.inserted_id)

    return payment_dict


@router.post("/confirm")
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
    payment["_id"] = str(payment["_id"])
    return payment


@router.get("/order/{order_id}")
async def get_payment_by_order(order_id: str):
    """Get payment for a specific order."""
    db = get_database()
    payment = await db.payments.find_one({"order_id": order_id})
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this order")
    payment["_id"] = str(payment["_id"])
    return payment
