import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from bson import ObjectId
from app.config import settings
from app.database import get_database


def _parse_json_payload(content: str) -> Optional[Dict[str, Any]]:
    if not content:
        return None
    clean = content.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
    clean = clean.strip()
    if clean.lower().startswith("json"):
        clean = clean[4:].strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return None


async def _call_groq(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> str:
    if not settings.GROQ_API_KEY:
        return ""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            settings.GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

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

    raw_response = await _call_groq(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    ai_response = _parse_json_payload(raw_response)
    if not ai_response:
        ai_response = {
            "response_text": "Sorry, I couldn't understand the order. Could you repeat that?",
            "should_place_order": False,
            "extracted_items": [],
        }

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


def _fallback_sentiment(text: str) -> str:
    lower = text.lower()
    positive = ["love", "great", "amazing", "excellent", "delicious", "good", "nice"]
    negative = ["bad", "terrible", "awful", "poor", "cold", "slow", "hate", "worst"]
    if any(word in lower for word in positive):
        return "positive"
    if any(word in lower for word in negative):
        return "negative"
    return "neutral"


async def analyze_sentiment(text: str) -> str:
    if not text:
        return "neutral"

    if not settings.GROQ_API_KEY:
        return _fallback_sentiment(text)

    system_prompt = (
        "You are a sentiment classifier. "
        "Return only one word: positive, neutral, or negative."
    )
    raw = await _call_groq(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        temperature=0.0,
        max_tokens=10,
    )
    if raw:
        sentiment = raw.strip().lower().strip(".")
        if sentiment in {"positive", "neutral", "negative"}:
            return sentiment

    return _fallback_sentiment(text)


async def get_ai_recommendations(
    menu_items: List[Dict[str, Any]],
    order_history: List[str],
    preferences: Optional[str] = None,
) -> Dict[str, Any]:
    if not menu_items:
        return {
            "success": False,
            "summary": "Menu is unavailable right now.",
            "recommendations": [],
            "source": "fallback",
        }

    simplified_menu = [
        {
            "name": item.get("name"),
            "price": item.get("price"),
            "category": item.get("category"),
            "description": item.get("description"),
            "is_vegetarian": item.get("is_vegetarian", False),
        }
        for item in menu_items
    ]

    if settings.GROQ_API_KEY:
        system_prompt = (
            "You are a restaurant recommendation assistant. "
            "Use only items from the provided menu. "
            "Respond in JSON with: summary (string), "
            "recommendations (array of {name, reason})."
        )
        user_payload = {
            "menu": simplified_menu,
            "order_history": order_history[-10:],
            "preferences": preferences or "",
        }
        raw = await _call_groq(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            temperature=0.6,
            max_tokens=500,
        )
        parsed = _parse_json_payload(raw)
        if isinstance(parsed, dict):
            recs = parsed.get("recommendations") or []
            cleaned = []
            for rec in recs:
                if isinstance(rec, dict) and rec.get("name"):
                    cleaned.append({
                        "name": rec.get("name"),
                        "reason": rec.get("reason", ""),
                    })
            if cleaned:
                return {
                    "success": True,
                    "summary": parsed.get("summary", ""),
                    "recommendations": cleaned,
                    "source": "ai",
                }

    pref_lower = (preferences or "").lower()
    filtered = simplified_menu
    if "vegetarian" in pref_lower or "vegan" in pref_lower:
        filtered = [item for item in simplified_menu if item.get("is_vegetarian")]

    if order_history:
        history_lower = {name.lower() for name in order_history if name}
        filtered = [item for item in filtered if item.get("name", "").lower() not in history_lower]

    fallback_items = filtered[:3] if filtered else simplified_menu[:3]
    return {
        "success": True,
        "summary": "Here are a few menu picks you might enjoy.",
        "recommendations": [
            {"name": item.get("name"), "reason": "Popular choice."}
            for item in fallback_items
        ],
        "source": "fallback",
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