"""
<<<<<<< HEAD
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
=======
Staff Management Routes — admin only.

Single source of truth: the `users` collection. Legacy `admins` lookups removed
(run tools/migrate_admins_to_users.py before deploying).

Endpoints:
  GET    /api/staff                              — list (admin/manager)
  POST   /api/staff                              — create (admin)
  GET    /api/staff/{username}                   — get (admin/manager)
  PUT    /api/staff/{username}                   — update (admin)
  DELETE /api/staff/{username}                   — delete (admin)
  GET    /api/staff/approvals/pending            — list approvals (admin/manager)
  POST   /api/staff/approvals/{id}/approve       — approve (admin/manager)
  POST   /api/staff/approvals/{id}/reject        — reject (admin/manager)
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext

from app.database import get_database
from app.models.user import UserCreate, UserUpdate
from app.routes.auth import VALID_ROLES, require_roles
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

router = APIRouter(prefix="/api/staff", tags=["Staff"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

<<<<<<< HEAD
VALID_ROLES = {"admin", "manager", "kitchen", "server", "cleaner"}


# ─── Helpers ──────────────────────────────────────────────────────────────

def _safe_user(user: dict) -> dict:
    """Remove sensitive fields before returning user data."""
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
=======

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _safe_user(user: dict) -> dict:
    """Strip sensitive fields before returning a user document."""
    if not user:
        return user
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    user.pop("password_changed_at", None)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return user


# ─── Staff CRUD ───────────────────────────────────────────────────────────

@router.get("")
<<<<<<< HEAD
async def list_staff(role: str = None, active_only: bool = False):
    """
    List all staff members. Optionally filter by role or active status.

    Example: GET /api/staff?role=kitchen&active_only=true
    """
    db = get_database()
    query = {}
    if role:
=======
async def list_staff(
    role: str | None = None,
    active_only: bool = False,
    _: dict = Depends(require_roles("admin", "manager")),
):
    db = get_database()
    query: dict = {}
    if role:
        if role not in VALID_ROLES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                f"Invalid role filter. Valid: {sorted(VALID_ROLES)}")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        query["role"] = role
    if active_only:
        query["is_active"] = True

    staff = []
    cursor = db.users.find(query).sort("role", 1)
    async for user in cursor:
        staff.append(_safe_user(user))
<<<<<<< HEAD

=======
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {"staff": staff, "total": len(staff)}


@router.post("", status_code=201)
<<<<<<< HEAD
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

=======
async def create_staff(
    user: UserCreate,
    _: dict = Depends(require_roles("admin")),
):
    if user.role not in VALID_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"Invalid role. Must be one of: {sorted(VALID_ROLES)}")

    db = get_database()
    if await db.users.find_one({"username": user.username}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")

    now = _utcnow()
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    user_dict = {
        "username": user.username,
        "password_hash": pwd_context.hash(user.password),
        "full_name": user.full_name,
        "role": user.role,
        "email": user.email,
        "phone": user.phone,
        "is_active": True,
<<<<<<< HEAD
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
=======
        "created_at": now,
        "updated_at": now,
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    }

    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
<<<<<<< HEAD
    del user_dict["password_hash"]

    return user_dict


@router.get("/approvals/pending")
async def get_pending_approvals():
    """
    Get all pending staff approval requests (e.g. schedule change, leave requests).
    """
=======
    user_dict.pop("password_hash", None)
    return user_dict


# ─── Approvals — placed BEFORE /{username} so they aren't shadowed ────────

@router.get("/approvals/pending")
async def get_pending_approvals(
    _: dict = Depends(require_roles("admin", "manager")),
):
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    db = get_database()
    approvals = []
    cursor = db.approvals.find({"status": "pending"}).sort("created_at", -1)
    async for approval in cursor:
        approval["_id"] = str(approval["_id"])
<<<<<<< HEAD
=======
        approval.pop("password_hash", None)
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        approvals.append(approval)
    return {"approvals": approvals, "total": len(approvals)}


@router.post("/approvals/{approval_id}/approve")
<<<<<<< HEAD
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
=======
async def approve_request(
    approval_id: str,
    actor: dict = Depends(require_roles("admin", "manager")),
):
    """Approve a signup request. CAS-flips the approval row, then materializes
    a row in `users` from the approval payload so the new staff member can log in."""
    db = get_database()
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid approval ID")

    now = _utcnow()

    # CAS: only flip a row that is still pending.
    result = await db.approvals.update_one(
        {"_id": ObjectId(approval_id), "status": "pending"},
        {"$set": {
            "status": "approved",
            "reviewed_at": now,
            "reviewed_by": actor["username"],
        }},
    )
    if result.modified_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "Approval request not found or already reviewed")

    approval = await db.approvals.find_one({"_id": ObjectId(approval_id)})

    # Materialize the user iff the approval row carries a hashed password
    # (signup-generated approvals always do).
    if approval.get("password_hash") and approval.get("kind") == "signup":
        # Race against duplicate signups: index on users.username is unique.
        if await db.users.find_one({"username": approval["username"]}):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"User '{approval['username']}' already exists; approval marked but no user created."
            )
        await db.users.insert_one({
            "username":     approval["username"],
            "password_hash": approval["password_hash"],
            "full_name":    approval.get("full_name", approval["username"]),
            "role":         approval["role"],
            "email":        approval.get("email"),
            "phone":        approval.get("phone"),
            "is_active":    True,
            "created_at":   now,
            "updated_at":   now,
            "created_via":  "approval",
        })

    approval["_id"] = str(approval["_id"])
    approval.pop("password_hash", None)
    return approval


@router.post("/approvals/{approval_id}/reject")
async def reject_request(
    approval_id: str,
    reason: str = "",
    actor: dict = Depends(require_roles("admin", "manager")),
):
    db = get_database()
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid approval ID")

    result = await db.approvals.update_one(
        {"_id": ObjectId(approval_id), "status": "pending"},
        {"$set": {
            "status": "rejected",
            "reason": reason[:500],
            "reviewed_at": _utcnow(),
            "reviewed_by": actor["username"],
        }},
    )
    if result.modified_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "Approval request not found or already reviewed")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

    updated = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    updated["_id"] = str(updated["_id"])
    return updated


<<<<<<< HEAD
@router.get("/{username}")
async def get_staff_by_username(username: str):
    """Get a single staff member by username."""
    db = get_database()
    user = await db.users.find_one({"username": username})
    if not user:
        user = await db.admins.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
=======
# ─── Per-user routes ──────────────────────────────────────────────────────

@router.get("/{username}")
async def get_staff_by_username(
    username: str,
    _: dict = Depends(require_roles("admin", "manager")),
):
    db = get_database()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return _safe_user(user)


@router.put("/{username}")
<<<<<<< HEAD
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

=======
async def update_staff(
    username: str,
    update: UserUpdate,
    actor: dict = Depends(require_roles("admin")),
):
    db = get_database()

    if update.role is not None and update.role not in VALID_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"Invalid role. Must be: {sorted(VALID_ROLES)}")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    # Don't let an admin demote/lock themselves out by accident.
    if actor["username"] == username:
        if update_data.get("role") and update_data["role"] != "admin":
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Admins cannot demote themselves")
        if update_data.get("is_active") is False:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Admins cannot deactivate themselves")

    update_data["updated_at"] = _utcnow()

    result = await db.users.update_one({"username": username}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")

    updated = await db.users.find_one({"username": username})
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return _safe_user(updated)


@router.delete("/{username}")
<<<<<<< HEAD
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
=======
async def delete_staff(
    username: str,
    actor: dict = Depends(require_roles("admin")),
):
    if actor["username"] == username:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Admins cannot delete themselves")

    db = get_database()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")

    if user.get("role") == "admin":
        # Block removing the last remaining admin.
        admin_count = await db.users.count_documents({"role": "admin", "is_active": True})
        if admin_count <= 1:
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "Cannot delete the last active admin")

    result = await db.users.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

    return {"message": f"Staff member '{username}' deleted successfully"}
