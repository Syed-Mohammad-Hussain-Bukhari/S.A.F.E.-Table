<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.table import TableSessionCreate
from datetime import datetime
import uuid
=======
"""
Table Session Routes — staff-only (with dev-only customer bootstrap).

Sessions are the foundation of customer trust: only floor staff can open or
close one. When a session is opened, a short-lived signed CUSTOMER TICKET
(JWT, audience=customer) is returned alongside the raw session_id. The
customer's device uses the ticket — never the raw session_id — for all
downstream calls (orders, voice, table reads).

The /dev-session endpoint is mounted ONLY when ENV != production so the
customer-side demo can self-bootstrap a ticket without staff intervention.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import get_database
from app.models.table import TableSessionCreate
from app.routes.auth import (
    create_customer_ticket,
    require_customer_ticket,
    require_roles,
)
from app.util import utcnow
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

router = APIRouter(prefix="/api/tables", tags=["Tables"])


<<<<<<< HEAD
@router.post("/session", status_code=201)
async def create_session(session: TableSessionCreate):
    """Create a new dining session for a table."""
    db = get_database()

    # End any existing active session for this table
    await db.table_sessions.update_many(
        {"table_number": session.table_number, "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.utcnow()}}
    )

    session_dict = {
        "table_number": session.table_number,
        "session_id": f"SES-{uuid.uuid4().hex[:8].upper()}",
        "is_active": True,
        "language": session.language,
        "created_at": datetime.utcnow(),
=======
# ─── Staff endpoints ──────────────────────────────────────────────────────

@router.post("/session", status_code=201)
async def create_session(
    session: TableSessionCreate,
    actor: dict = Depends(require_roles("server", "manager", "admin")),
):
    """Open a new dining session for a table.

    Atomically closes any prior active session for the same table, then opens
    a new one and returns BOTH the session_id (server-internal) and a signed
    customer_ticket (handed to the customer)."""
    db = get_database()
    now = utcnow()

    await db.table_sessions.update_many(
        {"table_number": session.table_number, "is_active": True},
        {"$set": {"is_active": False, "ended_at": now, "ended_by": actor["username"]}},
    )

    session_id = f"SES-{uuid.uuid4().hex[:12].upper()}"
    session_dict = {
        "table_number": session.table_number,
        "session_id": session_id,
        "is_active": True,
        "language": session.language,
        "created_at": now,
        "created_by": actor["username"],
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "ended_at": None,
    }

    result = await db.table_sessions.insert_one(session_dict)
    session_dict["_id"] = str(result.inserted_id)

<<<<<<< HEAD
    return session_dict


@router.get("/{table_number}/session")
async def get_active_session(table_number: int):
    """Get the active session for a table."""
=======
    customer_ticket = create_customer_ticket(
        table_number=session.table_number,
        session_id=session_id,
    )

    return {
        **session_dict,
        "customer_ticket": customer_ticket,
        "ticket_type": "bearer",
    }


@router.get("/{table_number}/session")
async def get_active_session(
    table_number: int,
    _: dict = Depends(require_roles("server", "manager", "admin", "kitchen")),
):
    """Look up the active session for a table (staff view)."""
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    db = get_database()
    session = await db.table_sessions.find_one(
        {"table_number": table_number, "is_active": True}
    )
    if not session:
<<<<<<< HEAD
        raise HTTPException(status_code=404, detail="No active session for this table")
=======
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active session for this table")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    session["_id"] = str(session["_id"])
    return session


@router.post("/{table_number}/end-session")
<<<<<<< HEAD
async def end_session(table_number: int):
    """End the active session for a table."""
    db = get_database()
    result = await db.table_sessions.update_many(
        {"table_number": table_number, "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No active session to end")
    return {"message": f"Session ended for table {table_number}"}


@router.get("/active")
async def get_all_active_tables():
    """Get all tables with active sessions (admin/kitchen view)."""
=======
async def end_session(
    table_number: int,
    actor: dict = Depends(require_roles("server", "manager", "admin")),
):
    """Close the active session for a table. Outstanding customer tickets
    immediately become functionally useless because every downstream check
    re-validates `is_active=True` against the database."""
    db = get_database()
    result = await db.table_sessions.update_many(
        {"table_number": table_number, "is_active": True},
        {"$set": {"is_active": False, "ended_at": utcnow(), "ended_by": actor["username"]}},
    )
    if result.modified_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active session to end")
    return {"message": f"Session ended for table {table_number}",
            "closed_count": result.modified_count}


@router.get("/active")
async def get_all_active_tables(
    _: dict = Depends(require_roles("server", "manager", "admin", "kitchen")),
):
    """List all currently-active table sessions (staff view)."""
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    db = get_database()
    tables = []
    cursor = db.table_sessions.find({"is_active": True}).sort("table_number", 1)
    async for session in cursor:
        session["_id"] = str(session["_id"])
        tables.append(session)
    return {"active_tables": tables, "total": len(tables)}
<<<<<<< HEAD
=======


# ─── Dev-only customer bootstrap (no staff login required) ────────────────

if not settings.is_production:

    @router.post("/dev-session", status_code=201)
    async def dev_create_session(table_number: int, language: str = "en"):
        """DEV ONLY. Public endpoint that opens a session and returns a customer
        ticket. Mounted only when ENV != production. Use this from the customer
        demo flow so the kiosk can self-bootstrap without staff intervention.
        """
        if table_number < 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "table_number must be >= 1")

        db = get_database()
        now = utcnow()

        await db.table_sessions.update_many(
            {"table_number": table_number, "is_active": True},
            {"$set": {"is_active": False, "ended_at": now, "ended_by": "dev-session"}},
        )

        session_id = f"SES-{uuid.uuid4().hex[:12].upper()}"
        session_dict = {
            "table_number": table_number,
            "session_id": session_id,
            "is_active": True,
            "language": language,
            "created_at": now,
            "created_by": "dev-session",
            "ended_at": None,
        }
        result = await db.table_sessions.insert_one(session_dict)
        session_dict["_id"] = str(result.inserted_id)

        return {
            **session_dict,
            "customer_ticket": create_customer_ticket(table_number, session_id),
            "ticket_type": "bearer",
        }


# ─── Customer endpoint ────────────────────────────────────────────────────

@router.get("/me/session")
async def get_my_session(
    ticket: dict = Depends(require_customer_ticket),
):
    """Customer self-service: confirm the ticket maps to a still-live session.

    Useful for the customer app to detect "session ended by staff" without
    needing to attempt a write first.
    """
    db = get_database()
    sess = await db.table_sessions.find_one({
        "session_id": ticket["session_id"],
        "table_number": ticket["table_number"],
        "is_active": True,
    })
    if not sess:
        raise HTTPException(status.HTTP_410_GONE, "Session is no longer active")
    sess["_id"] = str(sess["_id"])
    return {
        "table_number": ticket["table_number"],
        "session_id": ticket["session_id"],
        "language": sess.get("language", "en"),
        "is_active": True,
    }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
