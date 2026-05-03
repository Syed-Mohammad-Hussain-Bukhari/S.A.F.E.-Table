"""
Sales & Reporting Routes — for Admin and Manager Portals

Endpoints:
  GET /api/sales/summary           — summary stats (today/week/month)
  GET /api/sales/top-items         — top selling menu items
  GET /api/sales/revenue-chart     — daily revenue for last N days

Example Response (summary):
  {"period": "today", "total_orders": 24, "total_revenue": 1247.50, "average_order_value": 51.98, ...}
"""
from fastapi import APIRouter, HTTPException
from app.database import get_database
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.get("/summary")
async def sales_summary(period: str = "today"):
    """
    Get sales summary statistics.
    period: today | week | month

    Example: GET /api/sales/summary?period=week
    """
    db = get_database()
    now = datetime.utcnow()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="period must be 'today', 'week', or 'month'")

    # Aggregate order stats
    pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {
            "$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$total_price"},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                "cancelled": {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}},
            }
        }
    ]
    results = await db.orders.aggregate(pipeline).to_list(1)

    if not results:
        stats = {
            "total_orders": 0, "total_revenue": 0.0,
            "completed": 0, "cancelled": 0
        }
    else:
        stats = results[0]

    total_orders = stats.get("total_orders", 0)
    total_revenue = round(stats.get("total_revenue", 0.0), 2)
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    # Average rating in period
    rating_pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
    ]
    rating_result = await db.feedback.aggregate(rating_pipeline).to_list(1)
    avg_rating = round(rating_result[0]["avg"], 2) if rating_result else 0.0

    # Top category
    cat_pipeline = [
        {"$match": {"created_at": {"$gte": start}, "status": "completed"}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.category", "count": {"$sum": "$items.quantity"}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    cat_result = await db.orders.aggregate(cat_pipeline).to_list(1)
    top_category = cat_result[0]["_id"] if cat_result else None

    return {
        "period": period,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "average_order_value": avg_order_value,
        "completed_orders": stats.get("completed", 0),
        "cancelled_orders": stats.get("cancelled", 0),
        "average_rating": avg_rating,
        "top_category": top_category,
    }


@router.get("/top-items")
async def top_items(period: str = "month", limit: int = 10):
    """
    Get the top-selling menu items by quantity sold.
    period: today | week | month
    """
    db = get_database()
    now = datetime.utcnow()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    else:
        start = now - timedelta(days=30)

    pipeline = [
        {"$match": {"created_at": {"$gte": start}, "status": {"$ne": "cancelled"}}},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.name",
                "total_sold": {"$sum": "$items.quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            }
        },
        {"$sort": {"total_sold": -1}},
        {"$limit": limit},
    ]

    items = await db.orders.aggregate(pipeline).to_list(limit)

    # Enrich with category from menu_items
    result = []
    for item in items:
        menu_item = await db.menu_items.find_one({"name": item["_id"]})
        result.append({
            "name": item["_id"],
            "category": menu_item["category"] if menu_item else "Unknown",
            "total_sold": item["total_sold"],
            "total_revenue": round(item["total_revenue"], 2),
        })

    return {"items": result, "total": len(result), "period": period}


@router.get("/revenue-chart")
async def revenue_chart(days: int = 30):
    """
    Get daily revenue data for the last N days (default: 30).
    Used for chart/graph rendering in admin dashboard.

    Example: GET /api/sales/revenue-chart?days=7
    """
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 1 and 365")

    db = get_database()
    start = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "revenue": {"$sum": "$total_price"},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    raw_data = await db.orders.aggregate(pipeline).to_list(days)

    # Fill in missing days with zero values
    data_map = {d["_id"]: d for d in raw_data}
    chart_data = []
    total_revenue = 0.0
    total_orders = 0

    for i in range(days):
        date_str = (start + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        if date_str in data_map:
            rev = round(data_map[date_str]["revenue"], 2)
            ords = data_map[date_str]["orders"]
        else:
            rev = 0.0
            ords = 0
        chart_data.append({"date": date_str, "revenue": rev, "orders": ords})
        total_revenue += rev
        total_orders += ords

    return {
        "data": chart_data,
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "days": days,
    }
