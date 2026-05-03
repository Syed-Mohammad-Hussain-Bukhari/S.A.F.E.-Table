from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.menu import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from bson import ObjectId
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/menu", tags=["Menu"])


@router.get("")
async def get_menu_items(category: Optional[str] = None, available_only: bool = True):
    """Get all menu items, optionally filtered by category."""
    db = get_database()
    query = {}
    if category:
        query["category"] = category
    if available_only:
        query["is_available"] = True

    items = []
    cursor = db.menu_items.find(query).sort("category", 1)
    async for item in cursor:
        item["_id"] = str(item["_id"])
        items.append(item)

    return {"items": items, "total": len(items)}


@router.get("/categories")
async def get_categories():
    """Get all unique menu categories."""
    db = get_database()
    categories = await db.menu_items.distinct("category")
    return {"categories": categories}


@router.get("/{item_id}")
async def get_menu_item(item_id: str):
    """Get a single menu item by ID."""
    db = get_database()
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")

    item = await db.menu_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item["_id"] = str(item["_id"])
    return item


@router.post("", status_code=201)
async def create_menu_item(item: MenuItemCreate):
    """Create a new menu item (admin)."""
    db = get_database()
    item_dict = item.model_dump()
    item_dict["created_at"] = datetime.utcnow()
    item_dict["updated_at"] = datetime.utcnow()

    result = await db.menu_items.insert_one(item_dict)
    item_dict["_id"] = str(result.inserted_id)

    return item_dict


@router.put("/{item_id}")
async def update_menu_item(item_id: str, item: MenuItemUpdate):
    """Update an existing menu item (admin)."""
    db = get_database()
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")

    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    result = await db.menu_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")

    updated = await db.menu_items.find_one({"_id": ObjectId(item_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{item_id}")
async def delete_menu_item(item_id: str):
    """Delete a menu item (admin)."""
    db = get_database()
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")

    result = await db.menu_items.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")

    return {"message": "Menu item deleted successfully"}
