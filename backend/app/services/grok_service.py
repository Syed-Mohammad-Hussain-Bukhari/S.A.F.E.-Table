import httpx, json, uuid
from datetime import datetime
from bson import ObjectId
from app.config import settings
from app.database import get_database

async def process_voice_order(transcript: str, language: str, table_number: int) -> dict:
    db = get_database()
    menu_items = []
    
    async for item in db.menu_items.find({}):
        qty = item.get("stock_quantity", 0)
        is_avail = item.get("is_available", True) and qty > 0
        menu_items.append({"id": str(item["_id"]), "name": item["name"], "price": item["price"], "stock": qty, "available": is_avail})

    menu_text = "\n".join(f"- {i['name']} (${i['price']}) [{'IN STOCK' if i['available'] else 'OUT OF STOCK'}]" for i in menu_items)

    system_prompt = f"""You are an ordering AI.
MENU:
{menu_text}
RULES:
1. ONLY order items that are IN STOCK.
2. If OUT OF STOCK, refuse and suggest an alternative.
Respond strictly in JSON:
{{"response_text": "...", "should_place_order": true, "extracted_items": [{{"name": "Item", "quantity": 1}}]}}"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            settings.GROK_API_URL,
            headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
            json={"model": "grok-3", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": transcript}]}
        )
        ai_response = json.loads(res.json()["choices"][0]["message"]["content"].strip("`\n").strip("json"))

    order_placed = False
    order_data = None

    if ai_response.get("should_place_order"):
        order_data = await _create_order(ai_response["extracted_items"], menu_items, table_number, db)
        if order_data:
            order_placed = True
            ai_response["response_text"] += f" Order placed as {order_data['order_id']}."

    return {
        "success": True,
        "response_text": ai_response.get("response_text"),
        "order_placed": order_placed,
        "order_id": order_data["order_id"] if order_data else None,
        "order_data": order_data
    }

async def _create_order(extracted: list, menu: list, table: int, db):
    order_items = []
    for ext in extracted:
        match = next((m for m in menu if m["name"].lower() in ext["name"].lower()), None)
        if not match: continue
        
        qty = ext.get("quantity", 1)
        upd = await db.menu_items.find_one_and_update(
            {"_id": ObjectId(match["id"]), "stock_quantity": {"$gte": qty}, "is_available": True},
            {"$inc": {"stock_quantity": -qty}}
        )
        if upd: order_items.append({"menu_item_id": match["id"], "name": match["name"], "price": match["price"], "quantity": qty})

    if not order_items: return None

    od = {
        "order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "table_number": table,
        "items": order_items,
        "total_price": sum(i["price"] * i["quantity"] for i in order_items),
        "status": "pending",
        "created_at": str(datetime.utcnow())
    }
    await db.orders.insert_one(od)
    return od