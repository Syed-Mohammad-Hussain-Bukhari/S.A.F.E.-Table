from fastapi import APIRouter

router = APIRouter(prefix="/api/models3d", tags=["3D Models"])

# Dummy 3D model data (placeholder until real models are developed)
DUMMY_MODELS = [
    {
        "id": "model_wagyu",
        "name": "Wagyu Steak",
        "model_url": "/static/models/wagyu_placeholder.glb",
        "thumbnail_url": "/static/thumbnails/wagyu.jpg",
        "category": "Main Course",
        "description": "3D model of premium Wagyu steak platter",
    },
    {
        "id": "model_risotto",
        "name": "Truffle Risotto",
        "model_url": "/static/models/risotto_placeholder.glb",
        "thumbnail_url": "/static/thumbnails/risotto.jpg",
        "category": "Main Course",
        "description": "3D model of truffle risotto bowl",
    },
    {
        "id": "model_salmon",
        "name": "Seared Salmon",
        "model_url": "/static/models/salmon_placeholder.glb",
        "thumbnail_url": "/static/thumbnails/salmon.jpg",
        "category": "Main Course",
        "description": "3D model of seared salmon dish",
    },
    {
        "id": "model_pasta",
        "name": "Penne Arrabbiata",
        "model_url": "/static/models/pasta_placeholder.glb",
        "thumbnail_url": "/static/thumbnails/pasta.jpg",
        "category": "Main Course",
        "description": "3D model of penne arrabbiata",
    },
    {
        "id": "model_tiramisu",
        "name": "Tiramisu",
        "model_url": "/static/models/tiramisu_placeholder.glb",
        "thumbnail_url": "/static/thumbnails/tiramisu.jpg",
        "category": "Desserts",
        "description": "3D model of classic tiramisu",
    },
]


@router.get("")
async def get_all_models():
    """Get all available 3D models (dummy placeholders)."""
    return {"models": DUMMY_MODELS, "total": len(DUMMY_MODELS)}


@router.get("/{model_id}")
async def get_model(model_id: str):
    """Get a specific 3D model by ID."""
    model = next((m for m in DUMMY_MODELS if m["id"] == model_id), None)
    if not model:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="3D model not found")
    return model


@router.get("/menu-item/{item_name}")
async def get_model_by_menu_item(item_name: str):
    """Get 3D model associated with a menu item name."""
    model = next(
        (m for m in DUMMY_MODELS if m["name"].lower() == item_name.lower()),
        None
    )
    if not model:
        return {"message": "No 3D model available for this item", "model": None}
    return model
