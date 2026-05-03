from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.order import OrderCreate, OrderStatusUpdate, OrderStatus, PaymentStatus
from app.websockets.kitchen import manager
from bson import ObjectId
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def generate_order_id():
    """Generate a human-readable order ID."""
    ts = hex(int(datetime.utcnow().timestamp()))[2:].upper()
    rand = uuid.uuid4().hex[:4].upper()
    return f"ORD-{ts}-{rand}"


@router.post("", status_code=201)
async def create_order(order: OrderCreate):
    """Create a new order from a table."""
    db = get_database()

    # Calculate total price
    total_price = sum(item.price * item.quantity for item in order.items)

    # Estimate ready time (max prep time among items + buffer)
    max_prep = 20  # default minutes
    for item in order.items:
        menu_item = await db.menu_items.find_one({"name": item.name})
        if menu_item and menu_item.get("prep_time_minutes", 15) > max_prep:
            max_prep = menu_item["prep_time_minutes"]

    order_dict = {
        "order_id": generate_order_id(),
        "table_number": order.table_number,
        "items": [item.model_dump() for item in order.items],
        "total_price": round(total_price, 2),
        "status": OrderStatus.PENDING.value,
        "payment_status": PaymentStatus.UNPAID.value,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "estimated_ready_time": datetime.utcnow() + timedelta(minutes=max_prep),
    }

    result = await db.orders.insert_one(order_dict)
    order_dict["_id"] = str(result.inserted_id)

    # Broadcast new order to kitchen via WebSocket
    broadcast_data = {
        "order_id": order_dict["order_id"],
        "table_number": order_dict["table_number"],
        "items": order_dict["items"],
        "total_price": order_dict["total_price"],
        "status": order_dict["status"],
        "order_source": "menu",
        "created_at": str(order_dict["created_at"]),
    }
    await manager.broadcast_new_order(broadcast_data)

    return order_dict


@router.get("/{order_id}")
async def get_order(order_id: str):
    """Get an order by its order_id (e.g., ORD-XXXX-YYYY)."""
    db = get_database()
    order = await db.orders.find_one({"order_id": order_id})

    if not order:
        # Try by MongoDB _id
        if ObjectId.is_valid(order_id):
            order = await db.orders.find_one({"_id": ObjectId(order_id)})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order["_id"] = str(order["_id"])
    return order


@router.get("/table/{table_number}")
async def get_table_orders(table_number: int):
    """Get all orders for a specific table."""
    db = get_database()
    orders = []
    cursor = db.orders.find({"table_number": table_number}).sort("created_at", -1)
    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return {"orders": orders, "total": len(orders)}


@router.get("/table/{table_number}/active")
async def get_active_table_orders(table_number: int):
    """Get active (non-completed) orders for a table."""
    db = get_database()
    orders = []
    cursor = db.orders.find({
        "table_number": table_number,
        "status": {"$nin": [OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value]}
    }).sort("created_at", -1)

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return {"orders": orders, "total": len(orders)}


@router.patch("/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    """Update the status of an order (used by kitchen/admin)."""
    db = get_database()

    # Find order
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        if ObjectId.is_valid(order_id):
            order = await db.orders.find_one({"_id": ObjectId(order_id)})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Validate status transition
    valid_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["preparing", "cancelled"],
        "preparing": ["ready", "cancelled"],
        "ready": ["completed"],
        "completed": [],
        "cancelled": [],
    }

    current = order["status"]
    new_status = status_update.status.value

    if new_status not in valid_transitions.get(current, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{new_status}'. "
                   f"Valid: {valid_transitions.get(current, [])}"
        )

    # Update
    update_filter = {"_id": order["_id"]}
    await db.orders.update_one(
        update_filter,
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )

    updated = await db.orders.find_one(update_filter)
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/kitchen/active", tags=["Kitchen"])
async def get_kitchen_active_orders():
    """Get all active orders for the kitchen dashboard."""
    db = get_database()
    orders = []
    cursor = db.orders.find({
        "status": {"$in": [
            OrderStatus.PENDING.value,
            OrderStatus.CONFIRMED.value,
            OrderStatus.PREPARING.value,
            OrderStatus.READY.value,
        ]}
    }).sort("created_at", 1)  # Oldest first for kitchen

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return {"orders": orders, "total": len(orders)}


@router.get("/kitchen/stats", tags=["Kitchen"])
async def get_kitchen_stats():
    """Get kitchen statistics."""
    db = get_database()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    pending = await db.orders.count_documents({"status": OrderStatus.PENDING.value})
    preparing = await db.orders.count_documents({"status": OrderStatus.PREPARING.value})
    ready = await db.orders.count_documents({"status": OrderStatus.READY.value})
    completed_today = await db.orders.count_documents({
        "status": OrderStatus.COMPLETED.value,
        "updated_at": {"$gte": today_start}
    })

    return {
        "pending": pending,
        "preparing": preparing,
        "ready": ready,
        "completed_today": completed_today,
    }
