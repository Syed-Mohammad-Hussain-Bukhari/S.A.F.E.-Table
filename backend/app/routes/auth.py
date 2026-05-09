"""
<<<<<<< HEAD
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
=======
Auth Routes — Unified Authentication + Customer Ticket Issuance.

Two distinct token types live here:

  • STAFF JWT — issued at /api/auth/login, audience=`staff`, role ∈ VALID_ROLES.
    Validated by `decode_token` and `get_current_user`. Use `require_roles(...)`
    for endpoint-level RBAC.

  • CUSTOMER TICKET — issued only by authenticated staff (see routes/tables.py),
    audience=`customer`, carries (table_number, session_id). Validated by
    `verify_customer_ticket`; never grants staff privileges and never appears
    in VALID_ROLES.

Defence-in-depth: customer tickets and staff JWTs share signing key but are
distinguished by the `aud` claim, so neither can masquerade as the other.

Login is rate-limited (slowapi) at 5/minute per remote address.
"""
from datetime import timedelta
from typing import Callable

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.database import get_database
from app.models.user import PasswordChange, SignupRequest, UserLogin
from app.util import utcnow

router = APIRouter(prefix="/api/auth", tags=["Auth"])
security = HTTPBearer(auto_error=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
limiter = Limiter(key_func=get_remote_address)

VALID_ROLES = {"admin", "manager", "kitchen", "server", "cleaner"}
SIGNUP_ROLES = {"kitchen", "server", "cleaner", "manager"}  # admin must be created by admin

AUD_STAFF = "staff"
AUD_CUSTOMER = "customer"

# Customer tickets are sized for a long meal; the underlying table session
# remains the authoritative gate (is_active=False kills any in-flight ticket).
CUSTOMER_TICKET_TTL = timedelta(hours=4)


# ─── Staff token helpers ──────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """Mint a staff JWT. Always stamps iat, exp, aud=staff."""
    to_encode = data.copy()
    now = utcnow()
    to_encode["iat"] = int(now.timestamp())
    to_encode["exp"] = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["aud"] = AUD_STAFF
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode a STAFF JWT. Raises 401 on any failure (signature, expiry, aud)."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=AUD_STAFF,
        )
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if not payload.get("sub") or payload.get("role") not in VALID_ROLES:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Resolve the authenticated staff user (signature + DB checks + revocation)."""
    payload = decode_token(credentials.credentials)
    db = get_database()
    user = await db.users.find_one({"username": payload["sub"]})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer exists")
    if not user.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")

    pwd_changed = user.get("password_changed_at")
    iat = payload.get("iat")
    if pwd_changed and isinstance(iat, (int, float)):
        pwd_ts = pwd_changed.timestamp() if pwd_changed.tzinfo else \
                 pwd_changed.replace(tzinfo=utcnow().tzinfo).timestamp()
        if iat < pwd_ts:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                                "Token invalidated by password change")

    if user.get("role") != payload.get("role"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Role changed; please log in again")

    return {
        "username": user["username"],
        "role": user["role"],
        "full_name": user.get("full_name"),
        "_id": str(user["_id"]),
    }


def require_roles(*allowed_roles: str) -> Callable:
    """Dependency factory enforcing RBAC across staff endpoints."""
    allowed = set(allowed_roles)
    unknown = allowed - VALID_ROLES
    if unknown:
        raise RuntimeError(f"require_roles: unknown role(s) {unknown}")

    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN,
                                "Insufficient role for this action")
        return user

    return _dep


# ─── Customer Ticket helpers ──────────────────────────────────────────────

def create_customer_ticket(table_number: int, session_id: str) -> str:
    """Mint a short-lived customer ticket. Only staff routes should call this.

    Claims:
      sub             — synthetic identifier "table:<n>"
      table_number    — int
      session_id      — string from table_sessions.session_id
      iat / exp       — issued / expires
      aud             — AUD_CUSTOMER (so it can NEVER pass decode_token)
    """
    if table_number < 1:
        raise ValueError("table_number must be >= 1")
    if not isinstance(session_id, str) or not session_id:
        raise ValueError("session_id required")

    now = utcnow()
    claims = {
        "sub": f"table:{table_number}",
        "table_number": int(table_number),
        "session_id": session_id,
        "iat": int(now.timestamp()),
        "exp": now + CUSTOMER_TICKET_TTL,
        "aud": AUD_CUSTOMER,
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_customer_ticket(ticket: str) -> dict:
    """Validate a customer ticket and return its claims. Raises 401 on failure.

    Does NOT verify the underlying session is still active — callers MUST
    re-check `table_sessions` for is_active=True before mutating state.
    """
    if not ticket:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Customer ticket required")
    try:
        payload = jwt.decode(
            ticket, settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=AUD_CUSTOMER,
        )
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid or expired customer ticket")

    table_number = payload.get("table_number")
    session_id = payload.get("session_id")
    if not isinstance(table_number, int) or table_number < 1:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed customer ticket")
    if not isinstance(session_id, str) or not session_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed customer ticket")
    return payload


async def require_customer_ticket(
    x_customer_ticket: str | None = Header(default=None, alias="X-Customer-Ticket"),
) -> dict:
    """FastAPI dependency for header-based customer routes. Returns claims."""
    if not x_customer_ticket:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Missing X-Customer-Ticket header")
    return verify_customer_ticket(x_customer_ticket)


# ─── Timing-flat helper for the login miss path ───────────────────────────

# A constant bcrypt hash to use as a fallback when the user doesn't exist —
# this keeps the password-verify wall-clock roughly equal whether the user is
# real or not, mitigating user-enumeration via timing.
_DUMMY_BCRYPT_HASH = (
    "$2b$12$" + "C" * 22 + "/" + "D" * 30 + "."
)  # length 60; bcrypt verify reads the cost + salt and runs full rounds


def _flat_time_miss(submitted_password: str) -> None:
    """Run a constant-time hash check on user-miss to flatten timing.

    Prefers passlib's first-class `dummy_verify`; falls back to a manual
    bcrypt verify against a fixed hash on older passlib versions.
    """
    try:
        # passlib >= 1.7
        pwd_context.dummy_verify()
        return
    except AttributeError:
        pass
    try:
        pwd_context.verify(submitted_password, _DUMMY_BCRYPT_HASH)
    except Exception:
        # Even if verify raises (bad hash), the time spent is what matters.
        return
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.post("/login")
<<<<<<< HEAD
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

=======
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin):
    """Authenticate a staff member. Rate-limited to 5/min per source IP."""
    db = get_database()
    user = await db.users.find_one({"username": credentials.username})

    if not user:
        _flat_time_miss(credentials.password)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")

    if not pwd_context.verify(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")

    if not user.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")

    if user["role"] not in VALID_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account has no valid role")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
<<<<<<< HEAD
        "full_name": user["full_name"],
=======
        "full_name": user.get("full_name"),
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "username": user["username"],
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
<<<<<<< HEAD
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
=======
    db = get_database()
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
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


<<<<<<< HEAD
=======
@router.post("/signup", status_code=201)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest):
    """Public signup. Creates a row in `db.approvals` (NOT in `users`).
    Admin/manager must approve via /api/staff/approvals/{id}/approve before the
    user can log in.
    """
    if body.role not in SIGNUP_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"Invalid signup role. Allowed: {sorted(SIGNUP_ROLES)}")

    db = get_database()

    # Reject duplicates against both live users and pending approvals.
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    if await db.approvals.find_one({"username": body.username, "status": "pending"}):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "An approval request with that username is already pending")
    if body.email:
        if await db.users.find_one({"email": body.email}):
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    now = utcnow()
    approval_doc = {
        "kind": "signup",
        "status": "pending",
        "username": body.username,
        "full_name": body.full_name,
        "email": body.email,
        "phone": body.phone,
        "role": body.role,
        "password_hash": pwd_context.hash(body.password),
        "created_at": now,
    }
    result = await db.approvals.insert_one(approval_doc)
    return {
        "approval_id": str(result.inserted_id),
        "status": "pending",
        "message": "Signup submitted. Awaiting admin/manager approval.",
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout endpoint. Stateless JWT — the server doesn't keep sessions, but
    we expose this so the frontend can call it as part of a clean logout flow.
    Clients should drop the token after a successful response."""
    return {"message": "Logged out"}


>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
<<<<<<< HEAD
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

=======
    db = get_database()
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if not pwd_context.verify(body.current_password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")

    if pwd_context.verify(body.new_password, user["password_hash"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "New password must differ from the current one")

    now = utcnow()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": pwd_context.hash(body.new_password),
            "password_changed_at": now,
            "updated_at": now,
        }},
    )
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return {"message": "Password changed successfully"}
