"""
Staff Management Routes — Admin only
Create, list, update, and delete staff accounts.
Also handles approval requests.

Endpoints:
  GET    /api/staff               — list all staff
  POST   /api/staff               — create new staff member
  GET    /api/staff/{username}    — get staff by username
  PUT    /api/staff/{username}    — update staff details
  DELETE /api/staff/{username}    — delete staff
  GET    /api/staff/approvals/pending   — pending approval requests
  POST   /api/staff/approvals/{id}/approve  — approve request
  POST   /api/staff/approvals/{id}/reject   — reject request

Example Staff Roles: admin, manager, kitchen, server, cleaner
"""
from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.user import UserCreate, UserUpdate
from passlib.context import CryptContext
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/staff", tags=["Staff"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

VALID_ROLES = {"admin", "manager", "kitchen", "server", "cleaner"}


# ─── Helpers ──────────────────────────────────────────────────────────────

def _safe_user(user: dict) -> dict:
    """Remove sensitive fields before returning user data."""
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


# ─── Staff CRUD ───────────────────────────────────────────────────────────

@router.get("")
async def list_staff(role: str = None, active_only: bool = False):
    """
    List all staff members. Optionally filter by role or active status.

    Example: GET /api/staff?role=kitchen&active_only=true
    """
    db = get_database()
    query = {}
    if role:
        query["role"] = role
    if active_only:
        query["is_active"] = True

    staff = []
    cursor = db.users.find(query).sort("role", 1)
    async for user in cursor:
        staff.append(_safe_user(user))

    return {"staff": staff, "total": len(staff)}


@router.post("", status_code=201)
async def create_staff(user: UserCreate):
    """
    Create a new staff member.
    Roles: admin | manager | kitchen | server | cleaner

    Example:
        POST /api/staff
        {"username": "john_server", "password": "pass123", "full_name": "John Doe", "role": "server"}
    """
    if user.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
        )

    db = get_database()

    # Check uniqueness across both collections
    existing = await db.users.find_one({"username": user.username})
    if not existing:
        existing = await db.admins.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user_dict = {
        "username": user.username,
        "password_hash": pwd_context.hash(user.password),
        "full_name": user.full_name,
        "role": user.role,
        "email": user.email,
        "phone": user.phone,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    del user_dict["password_hash"]

    return user_dict


@router.get("/approvals/pending")
async def get_pending_approvals():
    """
    Get all pending staff approval requests (e.g. schedule change, leave requests).
    """
    db = get_database()
    approvals = []
    cursor = db.approvals.find({"status": "pending"}).sort("created_at", -1)
    async for approval in cursor:
        approval["_id"] = str(approval["_id"])
        approvals.append(approval)
    return {"approvals": approvals, "total": len(approvals)}


@router.post("/approvals/{approval_id}/approve")
async def approve_request(approval_id: str):
    """Approve a pending staff request."""
    db = get_database()
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status_code=400, detail="Invalid approval ID")

    result = await db.approvals.update_one(
        {"_id": ObjectId(approval_id), "status": "pending"},
        {"$set": {"status": "approved", "reviewed_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Approval request not found or already reviewed")

    updated = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.post("/approvals/{approval_id}/reject")
async def reject_request(approval_id: str, reason: str = ""):
    """Reject a pending staff request."""
    db = get_database()
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status_code=400, detail="Invalid approval ID")

    result = await db.approvals.update_one(
        {"_id": ObjectId(approval_id), "status": "pending"},
        {"$set": {"status": "rejected", "reason": reason, "reviewed_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Approval request not found or already reviewed")

    updated = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/{username}")
async def get_staff_by_username(username: str):
    """Get a single staff member by username."""
    db = get_database()
    user = await db.users.find_one({"username": username})
    if not user:
        user = await db.admins.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return _safe_user(user)


@router.put("/{username}")
async def update_staff(username: str, update: UserUpdate):
    """
    Update a staff member's details.

    Example:
        PUT /api/staff/john_server
        {"full_name": "John Smith", "is_active": false}
    """
    db = get_database()

    if update.role and update.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be: {', '.join(VALID_ROLES)}")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.utcnow()

    # Try users collection first
    result = await db.users.update_one({"username": username}, {"$set": update_data})
    if result.matched_count == 0:
        # Try admins collection
        result = await db.admins.update_one({"username": username}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")

    updated = await db.users.find_one({"username": username})
    if not updated:
        updated = await db.admins.find_one({"username": username})

    return _safe_user(updated)


@router.delete("/{username}")
async def delete_staff(username: str):
    """Delete a staff member. Admin accounts cannot be deleted."""
    db = get_database()

    user = await db.users.find_one({"username": username})
    if user and user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")

    result = await db.users.delete_one({"username": username})
    if result.deleted_count == 0:
        result = await db.admins.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return {"message": f"Staff member '{username}' deleted successfully"}
