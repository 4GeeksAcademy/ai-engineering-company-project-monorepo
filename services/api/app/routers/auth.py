"""Authentication router: login, identity, and password lifecycle."""

import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.models.schemas import ApiResponse
from app.models.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    UserResponse,
    UserUpdate,
)
from app.services import password_resets, users as users_service
from app.services.email import send_password_reset_email

logger = logging.getLogger(__name__)

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


@router.post("/forgot-password", response_model=ApiResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    """Send a reset link while returning the same response for every email."""
    user = users_service.get_user_by_email(payload.email)

    if user is not None and user.get("is_active", True):
        token = password_resets.issue_token(user["id"])
        settings = get_settings()
        reset_url = (
            f"{settings.BACKOFFICE_URL.rstrip('/')}/reset-password?"
            f"{urlencode({'token': token})}"
        )
        try:
            send_password_reset_email(payload.email, reset_url)
        except Exception:
            logger.exception("Unable to send password reset email")

    return ApiResponse(
        message="If an account exists for that email, a reset link has been sent."
    )


@router.post("/reset-password", response_model=ApiResponse)
async def reset_password(payload: ResetPasswordRequest):
    """Set a new password using an unexpired, one-time reset token."""
    if not password_resets.consume_token(payload.token, payload.new_password):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    return ApiResponse(message="Password reset successfully")


@router.post("/change-password", response_model=ApiResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change the authenticated user's password after verifying the current one."""
    credentials = users_service.authenticate(
        current_user["email"],
        payload.current_password,
    )
    if credentials is None:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    users_service.update_user(
        current_user["id"],
        UserUpdate(password=payload.new_password),
    )
    return ApiResponse(message="Password changed successfully")
