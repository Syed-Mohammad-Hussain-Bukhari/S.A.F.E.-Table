from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.ambience import AmbienceUpdate
from bson import ObjectId

router = APIRouter(prefix="/api/ambience", tags=["Ambience"])


@router.get("/{table_number}")
async def get_ambience(table_number: int):
    """Get current ambience settings for a table."""
    db = get_database()
    settings = await db.ambience.find_one({"table_number": table_number})

    if not settings:
        # Return defaults
        return {
            "table_number": table_number,
            "brightness": 75,
            "color_mode": "warm",
            "preset": "default",
            "music_volume": 50,
        }

    settings["_id"] = str(settings["_id"])
    return settings


@router.put("/{table_number}")
async def update_ambience(table_number: int, update: AmbienceUpdate):
    """Update ambience settings for a table."""
    db = get_database()

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Upsert — create if doesn't exist
    result = await db.ambience.update_one(
        {"table_number": table_number},
        {
            "$set": update_data,
            "$setOnInsert": {"table_number": table_number},
        },
        upsert=True,
    )

    settings = await db.ambience.find_one({"table_number": table_number})
    settings["_id"] = str(settings["_id"])
    return settings


@router.post("/{table_number}/preset/{preset_name}")
async def apply_preset(table_number: int, preset_name: str):
    """Apply a predefined ambience preset."""
    presets = {
        "default": {"brightness": 75, "color_mode": "warm", "music_volume": 50},
        "romantic_dinner": {"brightness": 40, "color_mode": "romantic", "music_volume": 30},
        "family_gathering": {"brightness": 90, "color_mode": "warm", "music_volume": 60},
        "business_meeting": {"brightness": 85, "color_mode": "cool", "music_volume": 20},
        "celebration": {"brightness": 100, "color_mode": "energetic", "music_volume": 80},
    }

    if preset_name not in presets:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid preset. Available: {list(presets.keys())}"
        )

    preset_settings = presets[preset_name]
    preset_settings["preset"] = preset_name

    db = get_database()
    await db.ambience.update_one(
        {"table_number": table_number},
        {"$set": preset_settings, "$setOnInsert": {"table_number": table_number}},
        upsert=True,
    )

    result = await db.ambience.find_one({"table_number": table_number})
    result["_id"] = str(result["_id"])
    return result
