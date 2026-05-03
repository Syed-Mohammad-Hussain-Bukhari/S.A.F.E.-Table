"""
Auth Routes — Unified Authentication for all roles.
Roles: admin | manager | kitchen | server | cleaner

Endpoints:
  POST /api/auth/login         — login with username/password, get JWT
  GET  /api/auth/me            — get current user profile (requires token)
  POST /api/auth/change-password — change own password (requires token)

Example Request (login):
  POST /api/auth/login
  {"username": "admin", "password": "admin123"}

Example Response:
  {"access_token": "eyJ...", "token_type": "bearer", "role": "admin", "full_name": "System Admin", "username": "admin"}
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_database
from app.models.user import UserLogin, PasswordChange
from app.config import settings
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["Auth"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Token Helpers ────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """Create a JWT access token with expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode JWT token and return user info. Used as a FastAPI dependency."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.post("/login")
async def login(credentials: UserLogin):
    """
    Authenticate a user and return a JWT access token.
    Works for ALL roles: admin, manager, kitchen, server, cleaner.

    Example:
        POST /api/auth/login
        {"username": "admin", "password": "admin123"}
    """
    db = get_database()

    # Look up user in the `users` collection (unified)
    user = await db.users.find_one({"username": credentials.username})

    # Fallback: check legacy `admins` collection
    if not user:
        user = await db.admins.find_one({"username": credentials.username})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Check if account is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Verify password
    if not pwd_context.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create token
    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "full_name": user["full_name"],
        "username": user["username"],
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile from the database.
    Requires: Authorization: Bearer <token>
    """
    db = get_database()

    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        user = await db.admins.find_one({"username": current_user["username"]})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Return safe profile (no password hash)
    return {
        "_id": str(user["_id"]),
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "email": user.get("email"),
        "phone": user.get("phone"),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at"),
    }


@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
    """
    Change the authenticated user's password.
    Requires: Authorization: Bearer <token>
    """
    db = get_database()

    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        user = await db.admins.find_one({"username": current_user["username"]})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hash = pwd_context.hash(body.new_password)

    # Update in whichever collection the user exists in
    col = "users" if await db.users.find_one({"username": current_user["username"]}) else "admins"
    await db[col].update_one(
        {"username": current_user["username"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}},
    )

    return {"message": "Password changed successfully"}
