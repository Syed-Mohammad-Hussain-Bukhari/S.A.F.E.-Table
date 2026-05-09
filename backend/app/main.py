<<<<<<< HEAD
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
=======
"""S.A.F.E Table API — entrypoint with hardened WebSockets and rate limiting."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import close_mongo_connection, connect_to_mongo, get_database
from app.routes.auth import decode_token, limiter
from app.websockets.kitchen import manager

# ─── Routers ──────────────────────────────────────────────────────────────
from app.routes.admin import router as admin_router
from app.routes.ambience import router as ambience_router
from app.routes.auth import router as auth_router
from app.routes.chatbot import router as chatbot_router
from app.routes.feedback import router as feedback_router
from app.routes.languages import router as languages_router
from app.routes.menu import router as menu_router
from app.routes.models3d import router as models3d_router
from app.routes.orders import router as orders_router
from app.routes.payments import router as payments_router
from app.routes.sales import router as sales_router
from app.routes.staff import router as staff_router
from app.routes.stripe_payments import router as stripe_router
from app.routes.tables import router as tables_router
from app.routes.tasks import router as tasks_router
from app.routes.voice import router as voice_router

KITCHEN_WS_ROLES = {"kitchen", "manager", "admin"}
ALLOWED_WS_ORIGINS = set(settings.cors_origins)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)


@asynccontextmanager
async def lifespan(app: FastAPI):
<<<<<<< HEAD
    """Application startup/shutdown events."""
=======
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    await connect_to_mongo()
    print("🚀 S.A.F.E Table API is starting up...")
    yield
    await close_mongo_connection()
    print("👋 S.A.F.E Table API is shutting down...")


app = FastAPI(
    title="S.A.F.E Table API",
<<<<<<< HEAD
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
=======
    description="Smart AI Fusion Experience Dining Table — Backend API",
    version="2.2.0",
    lifespan=lifespan,
)

# ─── Rate limiting (slowapi) ──────────────────────────────────────────────
# The limiter is defined in routes/auth.py so login can decorate itself; we
# wire the middleware + exception handler here.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ─── CORS ─────────────────────────────────────────────────────────────────
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
<<<<<<< HEAD
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
=======
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Customer-Ticket"],
)

for r in (
    auth_router, admin_router, staff_router,
    menu_router, orders_router, tables_router,
    payments_router, stripe_router,
    voice_router, chatbot_router, languages_router,
    feedback_router, ambience_router, models3d_router,
    sales_router, tasks_router,
):
    app.include_router(r)


# ─── WebSocket helpers ────────────────────────────────────────────────────

async def _close_with(websocket: WebSocket, code: int) -> None:
    try:
        await websocket.close(code=code)
    except RuntimeError:
        pass


async def _validate_origin(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if origin not in ALLOWED_WS_ORIGINS:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return False
    return True
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)


# ─── WebSocket Endpoints ──────────────────────────────────────────────────

@app.websocket("/ws/kitchen")
<<<<<<< HEAD
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
=======
async def websocket_kitchen(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """Kitchen real-time stream. Requires a staff JWT in ?token= and a
    role in {kitchen, manager, admin}. Inbound messages are drained but
    never acted upon — state changes go through the REST PATCH route."""
    if not await _validate_origin(websocket):
        return
    if not token:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = decode_token(token)
    except HTTPException:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return
    if payload.get("role") not in KITCHEN_WS_ROLES:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect_kitchen(websocket)
    try:
        while True:
            await websocket.receive_text()
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    except WebSocketDisconnect:
        manager.disconnect_kitchen(websocket)


@app.websocket("/ws/customer/{table_number}")
<<<<<<< HEAD
async def websocket_customer(websocket: WebSocket, table_number: int):
    """WebSocket endpoint for customer order tracking."""
    await manager.connect_customer(websocket, table_number)
    try:
        while True:
            await websocket.receive_text()  # Keep-alive
=======
async def websocket_customer(
    websocket: WebSocket,
    table_number: int,
    session_id: str | None = Query(default=None),
):
    """Customer table stream. (table_number, session_id) must match an
    active row in `table_sessions`."""
    if not await _validate_origin(websocket):
        return
    if not session_id or table_number < 1:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return

    db = get_database()
    sess = await db.table_sessions.find_one({
        "session_id": session_id,
        "table_number": table_number,
        "is_active": True,
    })
    if not sess:
        await _close_with(websocket, status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect_customer(websocket, table_number)
    try:
        while True:
            await websocket.receive_text()
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    except WebSocketDisconnect:
        manager.disconnect_customer(websocket, table_number)


<<<<<<< HEAD
# ─── Health Check ─────────────────────────────────────────────────────────
=======
# ─── Health ───────────────────────────────────────────────────────────────
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "S.A.F.E Table API",
<<<<<<< HEAD
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "menu", "orders", "voice", "payments", "stripe",
            "chatbot", "languages", "sales", "tasks", "staff", "auth",
        ],
=======
        "version": "2.2.0",
        "status": "running",
        "docs": "/docs",
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    }


@app.get("/health", tags=["Health"])
async def health_check():
    from app.database import client
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

<<<<<<< HEAD
=======
    stripe_ok = bool(settings.STRIPE_SECRET_KEY) and not settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {
        "status": "healthy",
        "database": db_status,
        "groq_api": "configured" if settings.GROQ_API_KEY else "not configured (using fallback)",
<<<<<<< HEAD
        "stripe": "configured" if not settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder") else "using simulated mode",
=======
        "stripe": "configured" if stripe_ok else "simulated",
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "heygen": "configured" if settings.HEYGEN_API_KEY else "not configured",
    }
