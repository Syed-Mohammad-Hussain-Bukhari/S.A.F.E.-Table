<<<<<<< HEAD
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """Create MongoDB connection on application startup."""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    # Verify connection
    await client.admin.command("ping")
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")


async def close_mongo_connection():
    """Close MongoDB connection on application shutdown."""
    global client
    if client:
=======
"""MongoDB connection + index management.

Indexes are created once at startup. They cover every hot lookup path:
  - users.username           (unique)        ← login
  - orders.order_id          (unique)        ← every order GET / status PATCH
  - orders.{status,created_at}                ← kitchen + sales aggregations
  - orders.{table_number,created_at}          ← per-table history
  - payments.payment_id      (unique)        ← payment confirm
  - payments.payment_intent_id                ← Stripe webhook lookup
  - table_sessions.{session_id,table_number,is_active}  ← WS handshake
  - stripe_events._id (TTL)                   ← idempotency cache
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

from app.config import settings

client: AsyncIOMotorClient = None  # type: ignore[assignment]


async def connect_to_mongo() -> None:
    """Connect, ping, and ensure indexes exist."""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await client.admin.command("ping")
    await _ensure_indexes(client[settings.DATABASE_NAME])
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")


async def close_mongo_connection() -> None:
    global client
    if client is not None:
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        client.close()
        print("MongoDB connection closed")


def get_database():
<<<<<<< HEAD
    """Get the database instance."""
    return client[settings.DATABASE_NAME]
=======
    """Return the active database handle."""
    return client[settings.DATABASE_NAME]


async def _ensure_indexes(db) -> None:
    """Create all required indexes. Idempotent (safe to run on every boot)."""
    # Users — single source of truth post-merge.
    await db.users.create_index([("username", ASCENDING)], unique=True, name="uniq_username")
    await db.users.create_index([("role", ASCENDING)], name="by_role")

    # Orders — covers every hot read path.
    await db.orders.create_index([("order_id", ASCENDING)], unique=True, name="uniq_order_id")
    await db.orders.create_index(
        [("status", ASCENDING), ("created_at", DESCENDING)],
        name="status_created_at",
    )
    await db.orders.create_index(
        [("table_number", ASCENDING), ("created_at", DESCENDING)],
        name="table_created_at",
    )
    await db.orders.create_index(
        [("payment_status", ASCENDING), ("created_at", DESCENDING)],
        name="paystatus_created_at",
    )

    # Payments.
    await db.payments.create_index([("payment_id", ASCENDING)], unique=True, sparse=True,
                                    name="uniq_payment_id")
    await db.payments.create_index([("payment_intent_id", ASCENDING)], sparse=True,
                                    name="payment_intent_id")
    await db.payments.create_index([("order_id", ASCENDING)], name="by_order")

    # Menu items.
    await db.menu_items.create_index([("name", ASCENDING)], name="by_name")
    await db.menu_items.create_index([("category", ASCENDING)], name="by_category")

    # Table sessions — used by WS handshake and session lifecycle.
    await db.table_sessions.create_index(
        [("table_number", ASCENDING), ("is_active", ASCENDING)],
        name="table_active",
    )
    await db.table_sessions.create_index(
        [("session_id", ASCENDING)],
        unique=True,
        name="uniq_session_id",
    )

    # Stripe webhook idempotency — TTL keeps the collection bounded.
    await db.stripe_events.create_index(
        [("at", ASCENDING)],
        name="ttl_at",
        expireAfterSeconds=60 * 60 * 24 * 30,
    )

    # Refunds owed (e.g. payment succeeded after order was cancelled).
    await db.refund_queue.create_index(
        [("status", ASCENDING), ("queued_at", ASCENDING)],
        name="refund_queue_status",
    )
    await db.refund_queue.create_index(
        [("payment_intent_id", ASCENDING)],
        unique=True,
        sparse=True,
        name="refund_queue_uniq_pi",
    )

    # Approvals — admin/manager queue.
    await db.approvals.create_index(
        [("status", ASCENDING), ("created_at", DESCENDING)],
        name="approvals_status_created",
    )
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
