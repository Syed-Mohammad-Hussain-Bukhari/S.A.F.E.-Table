from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from app.models.admin import AdminCreate, AdminLogin, AdminResponse, TokenResponse, DashboardStats
from app.config import settings
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict):
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/register", status_code=201)
async def register_admin(admin: AdminCreate):
    """Register a new admin/kitchen staff account."""
    db = get_database()

    # Check if username exists
    existing = await db.admins.find_one({"username": admin.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    admin_dict = {
        "username": admin.username,
        "password_hash": pwd_context.hash(admin.password),
        "full_name": admin.full_name,
        "role": admin.role,
        "created_at": datetime.utcnow(),
    }

    result = await db.admins.insert_one(admin_dict)
    admin_dict["_id"] = str(result.inserted_id)
    del admin_dict["password_hash"]

    return admin_dict


@router.post("/login")
async def login(credentials: AdminLogin):
    """Login and get JWT token."""
    db = get_database()
    admin = await db.admins.find_one({"username": credentials.username})

    if not admin or not pwd_context.verify(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": admin["username"],
        "role": admin["role"],
    })

    return TokenResponse(
        access_token=token,
        role=admin["role"],
        full_name=admin["full_name"],
    )


@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get admin dashboard statistics."""
    db = get_database()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_orders_today = await db.orders.count_documents(
        {"created_at": {"$gte": today_start}}
    )
    active_orders = await db.orders.count_documents(
        {"status": {"$nin": ["completed", "cancelled"]}}
    )
    completed_today = await db.orders.count_documents(
        {"status": "completed", "updated_at": {"$gte": today_start}}
    )

    # Revenue today
    pipeline = [
        {"$match": {"created_at": {"$gte": today_start}, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}},
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = round(revenue_result[0]["total"], 2) if revenue_result else 0.0

    total_menu_items = await db.menu_items.count_documents({})

    # Average rating
    rating_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
    rating_result = await db.feedback.aggregate(rating_pipeline).to_list(1)
    avg_rating = round(rating_result[0]["avg"], 2) if rating_result else 0.0

    active_tables = await db.table_sessions.count_documents({"is_active": True})

    return DashboardStats(
        total_orders_today=total_orders_today,
        active_orders=active_orders,
        completed_orders_today=completed_today,
        total_revenue_today=total_revenue,
        total_menu_items=total_menu_items,
        average_rating=avg_rating,
        active_tables=active_tables,
    )


@router.get("/orders/history")
async def get_order_history(skip: int = 0, limit: int = 50, status: str = None):
    """Get order history with filtering (admin view)."""
    db = get_database()
    query = {}
    if status:
        query["status"] = status

    orders = []
    cursor = db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit)
    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    total = await db.orders.count_documents(query)
    return {"orders": orders, "total": total}
