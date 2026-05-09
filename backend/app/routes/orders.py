<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.order import OrderCreate, OrderStatusUpdate, OrderStatus, PaymentStatus
from app.websockets.kitchen import manager
from bson import ObjectId
from datetime import datetime, timedelta
import uuid
=======
"""
Order routes — RBAC + customer-ticket-bound + CAS state machine + atomic stock.

Customer flow (POST / and reads):
  • Requires X-Customer-Ticket. The ticket's table_number is authoritative —
    the body's table_number is ignored. Client-supplied menu_item_id values
    are also ignored; items are re-resolved server-side by name.
  • Stock is reserved at creation via CAS $inc decrements. On any failure
    we roll back partial reservations.

Staff flow (PATCH /status, kitchen views):
  • RBAC via require_roles. Status transitions use compare-and-swap on the
    prior status to prevent lost-update races.
  • Cancellation refunds inventory exactly once for orders we actually
    decremented (pending/confirmed/preparing only).
"""
from datetime import timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.database import get_database
from app.models.order import OrderCreate, OrderStatus, OrderStatusUpdate, PaymentStatus
from app.routes.auth import (
    decode_token,
    require_customer_ticket,
    require_roles,
    verify_customer_ticket,
)
from app.util import utcnow
from app.websockets.kitchen import manager
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

router = APIRouter(prefix="/api/orders", tags=["Orders"])


<<<<<<< HEAD
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
=======
VALID_TRANSITIONS: dict[str, set[str]] = {
    OrderStatus.PENDING.value:    {OrderStatus.CONFIRMED.value, OrderStatus.CANCELLED.value},
    OrderStatus.CONFIRMED.value:  {OrderStatus.PREPARING.value, OrderStatus.CANCELLED.value},
    OrderStatus.PREPARING.value:  {OrderStatus.READY.value,     OrderStatus.CANCELLED.value},
    OrderStatus.READY.value:      {OrderStatus.COMPLETED.value},
    OrderStatus.COMPLETED.value:  set(),
    OrderStatus.CANCELLED.value:  set(),
}

# Only refund stock for cancellations that occur before the kitchen has
# committed ingredients (i.e. before READY/COMPLETED).
REFUNDABLE_FROM = {
    OrderStatus.PENDING.value,
    OrderStatus.CONFIRMED.value,
    OrderStatus.PREPARING.value,
}


def _generate_order_id() -> str:
    import uuid
    ts = hex(int(utcnow().timestamp()))[2:].upper()
    return f"ORD-{ts}-{uuid.uuid4().hex[:4].upper()}"


def _stringify_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def _serialize_dt(value) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


# ─── Stock reservation primitives ─────────────────────────────────────────

async def _reserve_stock(db, item_id: ObjectId, quantity: int) -> Optional[dict]:
    """Atomically reserve `quantity` of an item. Returns the pre-update doc on
    success, None when stock is insufficient or the item is unavailable."""
    return await db.menu_items.find_one_and_update(
        {
            "_id": item_id,
            "stock_quantity": {"$gte": quantity},
            "is_available": True,
        },
        {"$inc": {"stock_quantity": -quantity}},
    )


async def _release_stock(db, item_id: ObjectId, quantity: int) -> None:
    """Compensating $inc to put inventory back. Used for both rollback during
    creation and cancellation refunds. Idempotent at the operation level —
    callers must guarantee exactly-once invocation per (order, item)."""
    await db.menu_items.update_one(
        {"_id": item_id},
        {"$inc": {"stock_quantity": int(quantity)}},
    )


async def _refund_order_stock(db, order: dict) -> None:
    """Refund every line item that was successfully reserved at creation.

    Only items carrying a server-trusted `menu_item_id` (i.e., a real ObjectId
    that was inserted by `create_order`) are refunded — by construction we
    never wrote any other shape into the orders collection through this route.
    """
    for item in order.get("items", []):
        mid = item.get("menu_item_id")
        try:
            qty = int(item.get("quantity", 0))
        except (TypeError, ValueError):
            continue
        if not mid or qty <= 0 or not ObjectId.is_valid(mid):
            continue
        await _release_stock(db, ObjectId(mid), qty)


# ─── Customer-side: place order (ticket-bound) ────────────────────────────

@router.post("", status_code=201)
async def create_order(
    order: OrderCreate,
    ticket: dict = Depends(require_customer_ticket),
):
    """Place an order from the customer's table.

    SERVER-SIDE TRUTH:
      • table_number is taken from the ticket; the body field is ignored.
      • For each line item, menu_item_id and price are looked up by name
        from the menu — the request's menu_item_id and price are ignored.
      • Stock is reserved atomically; partial reservations roll back.
    """
    db = get_database()

    # 1. Re-verify the underlying session is still alive. The ticket's signature
    #    only proves it was issued by staff; staff may have ended the session
    #    after ticket issuance (covers the "lost-and-found ticket" case).
    session = await db.table_sessions.find_one({
        "session_id": ticket["session_id"],
        "table_number": ticket["table_number"],
        "is_active": True,
    })
    if not session:
        raise HTTPException(status.HTTP_410_GONE,
                            "Your table session is no longer active")

    table_number = ticket["table_number"]

    if not order.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order must contain items")

    # 2. Resolve every item server-side by name (single $in query — no N+1).
    names = [item.name for item in order.items]
    menu_lookup: dict[str, dict] = {}
    async for m in db.menu_items.find({"name": {"$in": names}}):
        menu_lookup[m["name"]] = m

    max_prep = 20
    for item in order.items:
        m = menu_lookup.get(item.name)
        if not m:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                f"Unknown menu item: {item.name}")
        if not m.get("is_available", True):
            raise HTTPException(status.HTTP_409_CONFLICT,
                                f"'{item.name}' is currently unavailable")
        prep = int(m.get("prep_time_minutes", 15))
        if prep > max_prep:
            max_prep = prep

    # 3. CAS-reserve stock for every item. On insufficient stock, roll back
    #    every reservation we already made.
    reserved: list[dict] = []
    for item in order.items:
        m = menu_lookup[item.name]
        item_oid: ObjectId = m["_id"]
        ok = await _reserve_stock(db, item_oid, int(item.quantity))
        if not ok:
            for r in reserved:
                await _release_stock(db, r["item_oid"], r["quantity"])
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Insufficient stock for '{item.name}'",
            )
        reserved.append({
            "item_oid": item_oid,
            "name": m["name"],
            "price": float(m["price"]),
            "quantity": int(item.quantity),
            "special_instructions": item.special_instructions,
        })

    now = utcnow()
    order_items = [
        {
            "menu_item_id": str(r["item_oid"]),    # server-trusted
            "name": r["name"],                     # server-trusted
            "price": r["price"],                   # server-trusted
            "quantity": r["quantity"],
            "special_instructions": r["special_instructions"],
        }
        for r in reserved
    ]
    total_price = round(sum(i["price"] * i["quantity"] for i in order_items), 2)

    order_dict = {
        "order_id": _generate_order_id(),
        "table_number": table_number,
        "session_id": ticket["session_id"],
        "items": order_items,
        "total_price": total_price,
        "status": OrderStatus.PENDING.value,
        "payment_status": PaymentStatus.UNPAID.value,
        "created_at": now,
        "updated_at": now,
        "estimated_ready_time": now + timedelta(minutes=max_prep),
        "order_source": "menu",
    }

    try:
        result = await db.orders.insert_one(order_dict)
    except Exception:
        # If the insert itself fails, return the reservations to the menu.
        for r in reserved:
            await _release_stock(db, r["item_oid"], r["quantity"])
        raise

    order_dict["_id"] = str(result.inserted_id)

    await manager.broadcast_new_order({
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "order_id": order_dict["order_id"],
        "table_number": order_dict["table_number"],
        "items": order_dict["items"],
        "total_price": order_dict["total_price"],
        "status": order_dict["status"],
        "order_source": "menu",
<<<<<<< HEAD
        "created_at": str(order_dict["created_at"]),
    }
    await manager.broadcast_new_order(broadcast_data)
=======
        "created_at": _serialize_dt(order_dict["created_at"]),
    })
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

    return order_dict


<<<<<<< HEAD
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

=======
# ─── Read endpoints (staff JWT or customer ticket) ────────────────────────

def _authorize_for_table(
    table_number: int,
    authorization: str | None,
    x_customer_ticket: str | None,
) -> None:
    """Allow either a valid staff JWT or a customer ticket scoped to this table."""
    if authorization and authorization.lower().startswith("bearer "):
        try:
            decode_token(authorization.split(" ", 1)[1])
            return
        except HTTPException:
            pass
    if x_customer_ticket:
        try:
            payload = verify_customer_ticket(x_customer_ticket)
            if int(payload.get("table_number", -1)) == int(table_number):
                return
        except HTTPException:
            pass
    raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                        "Authentication required (staff token or customer ticket)")


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    authorization: str | None = Header(default=None),
    x_customer_ticket: str | None = Header(default=None, alias="X-Customer-Ticket"),
):
    db = get_database()
    order = await db.orders.find_one({"order_id": order_id})
    if not order and ObjectId.is_valid(order_id):
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    _authorize_for_table(order["table_number"], authorization, x_customer_ticket)
    return _stringify_id(order)


@router.get("/table/{table_number}")
async def get_table_orders(
    table_number: int,
    authorization: str | None = Header(default=None),
    x_customer_ticket: str | None = Header(default=None, alias="X-Customer-Ticket"),
):
    _authorize_for_table(table_number, authorization, x_customer_ticket)
    db = get_database()
    orders = []
    async for o in db.orders.find({"table_number": table_number}).sort("created_at", -1):
        orders.append(_stringify_id(o))
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {"orders": orders, "total": len(orders)}


@router.get("/table/{table_number}/active")
<<<<<<< HEAD
async def get_active_table_orders(table_number: int):
    """Get active (non-completed) orders for a table."""
=======
async def get_active_table_orders(
    table_number: int,
    authorization: str | None = Header(default=None),
    x_customer_ticket: str | None = Header(default=None, alias="X-Customer-Ticket"),
):
    _authorize_for_table(table_number, authorization, x_customer_ticket)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    db = get_database()
    orders = []
    cursor = db.orders.find({
        "table_number": table_number,
<<<<<<< HEAD
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
=======
        "status": {"$nin": [OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value]},
    }).sort("created_at", -1)
    async for o in cursor:
        orders.append(_stringify_id(o))
    return {"orders": orders, "total": len(orders)}


# ─── Status transitions (CAS-protected, RBAC-gated) ───────────────────────

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    actor: dict = Depends(require_roles("kitchen", "manager", "admin")),
):
    db = get_database()

    order = await db.orders.find_one({"order_id": order_id})
    if not order and ObjectId.is_valid(order_id):
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    current = order["status"]
    new_status = body.status.value

    if new_status == current:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Order is already in that status")

    allowed = VALID_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid transition '{current}' → '{new_status}'. "
            f"Allowed from '{current}': {sorted(allowed)}",
        )

    now = utcnow()

    # Compare-and-swap on the prior status. Concurrent writers see 409.
    result = await db.orders.update_one(
        {"_id": order["_id"], "status": current},
        {"$set": {
            "status": new_status,
            "updated_at": now,
            "status_updated_by": actor["username"],
        }},
    )
    if result.modified_count == 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Order status changed concurrently; refresh and retry.",
        )

    # Refund inventory for cancellations that occur before the kitchen
    # commits ingredients. Runs at most once because the CAS that brought us
    # here was a one-way door (cancelled has no outbound transitions).
    if new_status == OrderStatus.CANCELLED.value and current in REFUNDABLE_FROM:
        await _refund_order_stock(db, order)

    updated = await db.orders.find_one({"_id": order["_id"]})
    updated = _stringify_id(updated)

    await manager.broadcast_order_update({
        "order_id": updated["order_id"],
        "table_number": updated["table_number"],
        "status": updated["status"],
        "updated_at": _serialize_dt(updated.get("updated_at")),
    })

    return updated


# ─── Kitchen views (RBAC-gated) ───────────────────────────────────────────

@router.get("/kitchen/active", tags=["Kitchen"])
async def get_kitchen_active_orders(
    _: dict = Depends(require_roles("kitchen", "manager", "admin")),
):
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    db = get_database()
    orders = []
    cursor = db.orders.find({
        "status": {"$in": [
            OrderStatus.PENDING.value,
            OrderStatus.CONFIRMED.value,
            OrderStatus.PREPARING.value,
            OrderStatus.READY.value,
<<<<<<< HEAD
        ]}
    }).sort("created_at", 1)  # Oldest first for kitchen

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

=======
        ]},
    }).sort("created_at", 1)
    async for o in cursor:
        orders.append(_stringify_id(o))
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {"orders": orders, "total": len(orders)}


@router.get("/kitchen/stats", tags=["Kitchen"])
<<<<<<< HEAD
async def get_kitchen_stats():
    """Get kitchen statistics."""
    db = get_database()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

=======
async def get_kitchen_stats(
    _: dict = Depends(require_roles("kitchen", "manager", "admin")),
):
    db = get_database()
    today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    pending = await db.orders.count_documents({"status": OrderStatus.PENDING.value})
    preparing = await db.orders.count_documents({"status": OrderStatus.PREPARING.value})
    ready = await db.orders.count_documents({"status": OrderStatus.READY.value})
    completed_today = await db.orders.count_documents({
        "status": OrderStatus.COMPLETED.value,
<<<<<<< HEAD
        "updated_at": {"$gte": today_start}
    })

=======
        "updated_at": {"$gte": today_start},
    })
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {
        "pending": pending,
        "preparing": preparing,
        "ready": ready,
        "completed_today": completed_today,
    }
