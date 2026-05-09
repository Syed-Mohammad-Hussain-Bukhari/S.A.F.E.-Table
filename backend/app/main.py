from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.websockets.kitchen import manager

# ─── Original Routers ─────────────────────────────────────────────────────
from app.routes.menu import router as menu_router
from app.routes.orders import router as orders_router
from app.routes.voice import router as voice_router
from app.routes.payments import router as payments_router
from app.routes.tables import router as tables_router
from app.routes.feedback import router as feedback_router
from app.routes.ambience import router as ambience_router
from app.routes.admin import router as admin_router
from app.routes.models3d import router as models3d_router

# ─── New Routers ──────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.staff import router as staff_router
from app.routes.chatbot import router as chatbot_router
from app.routes.languages import router as languages_router
from app.routes.stripe_payments import router as stripe_router
from app.routes.sales import router as sales_router
from app.routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown events."""
    await connect_to_mongo()
    print("🚀 S.A.F.E Table API is starting up...")
    yield
    await close_mongo_connection()
    print("👋 S.A.F.E Table API is shutting down...")


app = FastAPI(
    title="S.A.F.E Table API",
    description=(
        "Smart AI Fusion Experience Dining Table — Backend API\n\n"
        "## Features\n"
        "- 🍽️ Menu & Orders management\n"
        "- 🎤 Voice ordering (Whisper → Groq → HeyGen)\n"
        "- 🤖 AI Chatbot & Personalization (SAGE)\n"
        "- 💳 QR Payments (Stripe)\n"
        "- 🌍 Multilingual support (EN, UR, DE)\n"
        "- 🌡️ Ambience control\n"
        "- 👥 Staff management (all roles)\n"
        "- 📊 Sales reporting\n"
        "- ✅ Task management (Server & Cleaner portals)\n"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Original Routers ────────────────────────────────────────────
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(voice_router)
app.include_router(payments_router)
app.include_router(tables_router)
app.include_router(feedback_router)
app.include_router(ambience_router)
app.include_router(admin_router)
app.include_router(models3d_router)

# ─── Register New Routers ─────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(staff_router)
app.include_router(chatbot_router)
app.include_router(languages_router)
app.include_router(stripe_router)
app.include_router(sales_router)
app.include_router(tasks_router)


# ─── WebSocket Endpoints ──────────────────────────────────────────────────

@app.websocket("/ws/kitchen")
async def websocket_kitchen(websocket: WebSocket):
    """WebSocket endpoint for kitchen dashboard real-time updates."""
    await manager.connect_kitchen(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            import json
            try:
                message = json.loads(data)
                if message.get("type") == "status_update":
                    await manager.broadcast_order_update(message.get("data", {}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect_kitchen(websocket)


@app.websocket("/ws/customer/{table_number}")
async def websocket_customer(websocket: WebSocket, table_number: int):
    """WebSocket endpoint for customer order tracking."""
    await manager.connect_customer(websocket, table_number)
    try:
        while True:
            await websocket.receive_text()  # Keep-alive
    except WebSocketDisconnect:
        manager.disconnect_customer(websocket, table_number)


# ─── Health Check ─────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "S.A.F.E Table API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "menu", "orders", "voice", "payments", "stripe",
            "chatbot", "languages", "sales", "tasks", "staff", "auth",
        ],
    }


@app.get("/health", tags=["Health"])
async def health_check():
    from app.database import client
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy",
        "database": db_status,
        "groq_api": "configured" if settings.GROQ_API_KEY else "not configured (using fallback)",
        "stripe": "configured" if not settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder") else "using simulated mode",
        "heygen": "configured" if settings.HEYGEN_API_KEY else "not configured",
    }
