"""Authentication router — login & JWT issuance."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.models.schemas import ApiResponse
from app.models.user import LoginRequest, UserResponse
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse)
async def login(payload: LoginRequest):
    """Authenticate with email + password and receive a JWT bearer token."""
    doc = users_service.authenticate(payload.email, payload.password)
    if doc is None:
        raise HTTPException(
            status_code=401, detail="Incorrect email or password"
        )
    if not doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is inactive")

    user = users_service.get_user_by_id(doc.doc_id)
    token = create_access_token(subject=str(doc.doc_id), role=doc["role"])

    return ApiResponse(
        message="Login successful",
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": user,
        },
    )


# ── GET /auth/me ──────────────────────────────────────────
@router.get("/me", response_model=ApiResponse)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's identity (never their password hash)."""
    return ApiResponse(data=UserResponse.model_validate(current_user).model_dump())
