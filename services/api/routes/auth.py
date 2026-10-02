"""Login and current-identity endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

import database
from auth.dependencies import get_current_user
from auth.recovery import create_reset_token, reset_expiry, reset_token_hash, send_reset_email
from auth.security import create_access_token, hash_password, verify_password
from models_auth import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ProfileResponse,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = database.get_user_by_email(str(payload.email).strip().lower())
    if user is None or not user.get("is_active") or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=create_access_token(int(user["id"])))


@router.get("/me", response_model=AuthMeResponse)
def get_me(current_user: dict = Depends(get_current_user)) -> AuthMeResponse:
    profile = database.get_profile_by_user_id(int(current_user["id"]))
    return AuthMeResponse.model_validate(
        {**current_user, "profile": ProfileResponse.model_validate(profile) if profile is not None else None}
    )


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    user = database.get_user_by_email(str(payload.email).strip().lower())
    if user is not None and user.get("is_active"):
        token = create_reset_token()
        database.create_password_reset_token(
            int(user["id"]), reset_token_hash(token), reset_expiry().isoformat()
        )
        try:
            send_reset_email(str(user["email"]), token)
        except Exception:
            database.invalidate_password_reset_tokens(int(user["id"]))
            # Do not log the recipient, provider response, token, or reset URL.
            logger.warning("Password recovery email delivery failed")
    return MessageResponse(message="If that address is registered, you'll receive a link shortly.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    now = datetime.now(timezone.utc)
    if not database.reset_password_with_token(
        reset_token_hash(payload.token), now.isoformat(), hash_password(payload.new_password)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return MessageResponse(message="Password reset successfully")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    user_id = int(current_user["id"])
    if not verify_password(payload.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    database.change_user_password(user_id, hash_password(payload.new_password))
    return MessageResponse(message="Password changed successfully")
