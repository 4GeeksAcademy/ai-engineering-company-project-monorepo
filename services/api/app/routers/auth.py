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
    LoginData,
    LoginRequest,
    ResetPasswordRequest,
    UserResponse,
    UserUpdate,
)
from app.services import password_resets, users as users_service
from app.services.email import EmailDeliveryError, send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse[LoginData])
async def login(payload: LoginRequest):
    """Authenticate with email + password and receive a JWT bearer token.

    Returns only the token — no user/email in the body (see
    docs/serialization-audit.md). Callers that need identity call
    GET /auth/me separately, same as this app's own AppShell already does.
    """
    doc = users_service.authenticate(payload.email, payload.password)
    if doc is None:
        raise HTTPException(
            status_code=401, detail="Incorrect email or password"
        )
    if not doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is inactive")

    token = create_access_token(subject=str(doc["id"]), role=doc["role"])

    return ApiResponse(
        message="Login successful",
        data=LoginData(access_token=token, token_type="bearer"),
    )


# ── GET /auth/me ──────────────────────────────────────────
@router.get("/me", response_model=ApiResponse[UserResponse])
async def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's identity (never their password hash)."""
    return ApiResponse(data=UserResponse.model_validate(current_user))


@router.post("/forgot-password", response_model=ApiResponse[None])
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
        except EmailDeliveryError:
            # Log by user id, never the raw exception/email/token — the
            # response below stays identical either way (anti-enumeration).
            logger.exception("Unable to send password reset email for user_id=%s", user["id"])

    return ApiResponse(
        message="If an account exists for that email, a reset link has been sent."
    )


@router.post("/reset-password", response_model=ApiResponse[None])
async def reset_password(payload: ResetPasswordRequest):
    """Set a new password using an unexpired, one-time reset token."""
    if not password_resets.consume_token(payload.token, payload.new_password):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    return ApiResponse(message="Password reset successfully")


@router.post("/change-password", response_model=ApiResponse[None])
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
