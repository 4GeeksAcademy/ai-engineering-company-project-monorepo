"""Users router — registration and user management endpoints.

POST /users          register a user (public; role defaults to "user",
                     password hashed, optional profile fields create the
                     linked Profile in the same operation)
GET  /users          list all users               (protected)
GET  /users/{id}     get a single user            (protected)
PUT  /users/{id}     update credential fields     (protected, staff only:
                     manager or admin)
DELETE /users/{id}   delete user + linked profile (protected)
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user, require_staff
from app.models.schemas import ApiResponse
from app.models.user import UserCreate, UserUpdate
from app.services import users as users_service

router = APIRouter(prefix="/users", tags=["users"])


# ── POST /users ───────────────────────────────────────────
@router.post("/", response_model=ApiResponse, status_code=201)
async def register_user(payload: UserCreate):
    """Register a new user.

    The password is hashed before storage and the role defaults to
    "user". Optional profile fields (name, phone, address) create the
    linked Profile in the same operation.
    """
    try:
        user = users_service.create_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return ApiResponse(message="User registered successfully", data=user)


# ── GET /users ────────────────────────────────────────────
@router.get("/", response_model=ApiResponse)
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all users (requires authentication)."""
    users = users_service.list_users()
    return ApiResponse(
        message=f"Found {len(users)} user(s)",
        data=users,
    )


# ── GET /users/{user_id} ──────────────────────────────────
@router.get("/{user_id}", response_model=ApiResponse)
async def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """Get a single user by ID (requires authentication)."""
    user = users_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return ApiResponse(data=user)


# ── PUT /users/{user_id} ──────────────────────────────────
@router.put("/{user_id}", response_model=ApiResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: dict = Depends(require_staff),
):
    """Update credential fields (email, password, role, is_active).

    Only staff (manager or admin) may perform updates.
    """
    try:
        user = users_service.update_user(user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    return ApiResponse(message="User updated successfully", data=user)


# ── DELETE /users/{user_id} ───────────────────────────────
@router.delete("/{user_id}", response_model=ApiResponse)
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a user and its linked profile (requires authentication)."""
    if not users_service.delete_user(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return ApiResponse(message="User and linked profile deleted")
