from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.table import TableSessionCreate
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/tables", tags=["Tables"])


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
        "ended_at": None,
    }

    result = await db.table_sessions.insert_one(session_dict)
    session_dict["_id"] = str(result.inserted_id)

    return session_dict


@router.get("/{table_number}/session")
async def get_active_session(table_number: int):
    """Get the active session for a table."""
    db = get_database()
    session = await db.table_sessions.find_one(
        {"table_number": table_number, "is_active": True}
    )
    if not session:
        raise HTTPException(status_code=404, detail="No active session for this table")
    session["_id"] = str(session["_id"])
    return session


@router.post("/{table_number}/end-session")
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
    db = get_database()
    tables = []
    cursor = db.table_sessions.find({"is_active": True}).sort("table_number", 1)
    async for session in cursor:
        session["_id"] = str(session["_id"])
        tables.append(session)
    return {"active_tables": tables, "total": len(tables)}
