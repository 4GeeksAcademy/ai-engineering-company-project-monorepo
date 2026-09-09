import logging

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from database import document_to_dict, profiles_table, users_table
from email_service import (
    EmailConfigurationError,
    EmailServiceError,
    send_password_reset_email,
)
from models import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChangeResponse,
    ProfileResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    UserWithProfileResponse,
)
from security import (
    create_access_token,
    get_current_user,
    hash_password,
    mark_reset_token_used,
    store_reset_token,
    validate_reset_token,
    verify_password,
)


logger = logging.getLogger("api.auth")


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(payload: LoginRequest):
    User = Query()

    user_docs = users_table.search(User.email == payload.email)

    if not user_docs:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_doc = user_docs[0]
    user_data = document_to_dict(user_doc)

    if not verify_password(payload.password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_data.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user_doc.doc_id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserWithProfileResponse,
)
def me(
    current_user: UserResponse = Depends(get_current_user),
):
    Profile = Query()
    profile_docs = profiles_table.search(Profile.user_id == current_user.id)
    profile = None
    if profile_docs:
        profile = ProfileResponse(**document_to_dict(profile_docs[0]))

    return UserWithProfileResponse(**current_user.model_dump(), profile=profile)


# ──────────────────────────────────────────────
# Password reset
# ──────────────────────────────────────────────


@router.post(
    "/forgot-password",
    response_model=PasswordChangeResponse,
)
def forgot_password(payload: ForgotPasswordRequest):
    """Request a password reset email.

    Always returns 200 to avoid user enumeration.
    Only sends an email if the account exists and is active.
    """
    User = Query()
    user_docs = users_table.search(User.email == payload.email)

    if user_docs:
        user_doc = document_to_dict(user_docs[0])

        if user_doc.get("is_active", False):
            token = store_reset_token(user_doc["id"])

            try:
                send_password_reset_email(payload.email, token)
            except (EmailConfigurationError, EmailServiceError):
                logger.warning(
                    "Failed to send password reset email to %s", payload.email
                )
                mark_reset_token_used(token)

    return PasswordChangeResponse(
        detail="If an account with that email exists, a password reset link has been sent.",
    )


@router.post(
    "/reset-password",
    response_model=PasswordChangeResponse,
)
def reset_password(payload: ResetPasswordRequest):
    """Reset a password using a valid reset token."""
    user_id = validate_reset_token(payload.token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_doc = users_table.get(doc_id=user_id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_data = document_to_dict(user_doc)

    if not user_data.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    new_hashed_password = hash_password(payload.new_password)
    users_table.update(
        {"hashed_password": new_hashed_password},
        doc_ids=[user_id],
    )

    mark_reset_token_used(payload.token)

    return PasswordChangeResponse(
        detail="Password has been reset successfully.",
    )


@router.post(
    "/change-password",
    response_model=PasswordChangeResponse,
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Change the password for the currently authenticated user."""
    user_doc = users_table.get(doc_id=current_user.id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user_data = document_to_dict(user_doc)

    if not verify_password(payload.current_password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    new_hashed_password = hash_password(payload.new_password)
    users_table.update(
        {"hashed_password": new_hashed_password},
        doc_ids=[current_user.id],
    )

    return PasswordChangeResponse(
        detail="Password changed successfully.",
    )