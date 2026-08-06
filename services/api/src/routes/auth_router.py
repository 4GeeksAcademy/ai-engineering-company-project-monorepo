"""Authentication endpoints for JWT login and current-user inspection."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.models.profile import Profile
from src.models.user import User
from src.services.auth_service import create_access_token, get_current_user
from src.services.password_reset_service import (
    PasswordResetTokenError,
    issue_password_reset,
    reset_password_with_token,
)
from src.services.profile_service import get_profile_by_user_id
from src.services.security import PasswordValidationError, verify_password
from src.services.user_service import get_user_by_email, update_user_password

auth_router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    email: str
    role: str
    profile: Profile | None


class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@auth_router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)) -> MeResponse:
    profile = get_profile_by_user_id(current_user.id)
    return MeResponse(
        email=current_user.email,
        role=current_user.role.value,
        profile=profile,
    )


@auth_router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
    user = get_user_by_email(payload.email.strip())
    if user is not None:
        issue_password_reset(user)

    return ForgotPasswordResponse(
        message="If the email exists, reset instructions have been sent."
    )


@auth_router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict[str, str]:
    try:
        reset_password_with_token(payload.token.strip(), payload.new_password)
    except (PasswordResetTokenError, PasswordValidationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"message": "Password has been reset successfully."}


@auth_router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    try:
        updated_user = update_user_password(current_user.id, payload.new_password)
    except PasswordValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"message": "Password changed successfully."}
