"""
router.py — Brasaland · Authentication endpoints

POST   /auth/login            Authenticate with email/password, return JWT
GET    /auth/me               Get current authenticated user + profile
POST   /auth/forgot-password  Request password reset email
POST   /auth/reset-password   Reset password with token
POST   /auth/change-password  Change password (authenticated)
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from app.database import password_resets_table, profiles_table, users_table

from .dependencies import get_current_user
from .email_service import send_reset_email
from .schemas import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ProfileOut,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from .service import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    validate_password_policy,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
_Q = Query()


def _should_expose_reset_link() -> bool:
    """Expose reset links during local development or when explicitly enabled."""
    if os.environ.get("AUTH_DEBUG_RESET_LINKS", "").lower() == "true":
        return True

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    host = urlparse(frontend_url).hostname or ""
    return host in {"localhost", "127.0.0.1"}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest) -> TokenResponse:
    """Authenticate a user by email and password. Returns a JWT access token."""
    user = users_table.get(_Q.email == data.email)

    if user is None or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    token = create_access_token(
        data={"sub": str(user.doc_id), "role": user["role"]}
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=AuthMeResponse)
def get_me(current_user: dict = Depends(get_current_user)) -> AuthMeResponse:
    """Return the authenticated user's credentials and linked profile."""
    user_out = UserOut(
        id=str(current_user.doc_id),
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
    )

    profile_doc = profiles_table.get(_Q.user_id == str(current_user.doc_id))
    profile_out = None
    if profile_doc:
        profile_out = ProfileOut(
            id=str(profile_doc.doc_id),
            user_id=profile_doc["user_id"],
            name=profile_doc.get("name"),
            phone=profile_doc.get("phone"),
            address=profile_doc.get("address"),
        )

    return AuthMeResponse(user=user_out, profile=profile_out)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
) -> MessageResponse:
    """Request a password reset email. Always returns the same response to prevent enumeration."""
    normalized_email = data.email.strip().lower()
    user = users_table.get(_Q.email == normalized_email)

    if user is not None:
        user_id = str(user.doc_id)

        # Invalidate any previous reset tokens for this user
        previous_tokens = password_resets_table.search(
            (_Q.user_id == user_id) & (_Q.purpose == "password_reset") & (_Q.used == False)
        )
        if previous_tokens:
            password_resets_table.update(
                {"used": True},
                (_Q.user_id == user_id) & (_Q.purpose == "password_reset") & (_Q.used == False),
            )

        # Generate new reset token
        reset_token = create_reset_token(user_id)
        payload = decode_reset_token(reset_token)
        jti = payload.get("jti", "") if payload else ""
        expires_at = datetime.fromtimestamp(
            payload.get("exp", 0), tz=timezone.utc
        ).isoformat() if payload else ""

        # Store token metadata in TinyDB
        password_resets_table.insert({
            "user_id": user_id,
            "jti": jti,
            "purpose": "password_reset",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "used": False,
        })

        delivery = await send_reset_email(normalized_email, reset_token)

        return MessageResponse(
            detail="Si el email existe, recibirás un enlace de recuperación.",
            debug_reset_link=delivery.reset_link if _should_expose_reset_link() else None,
        )

    # Always return the same message regardless of email existence
    return MessageResponse(
        detail="Si el email existe, recibirás un enlace de recuperación."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest) -> MessageResponse:
    """Reset password using a valid token."""
    # Decode and validate token
    payload = decode_reset_token(data.token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado",
        )

    # Verify purpose
    if payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado",
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado",
        )

    # Find token record in TinyDB
    token_doc = password_resets_table.get(
        (_Q.jti == jti) & (_Q.user_id == user_id) & (_Q.purpose == "password_reset")
    )

    if token_doc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o ya utilizado",
        )

    if token_doc.get("used", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o ya utilizado",
        )

    # Validate new password policy
    validate_password_policy(data.new_password)

    # Update password
    user = users_table.get(doc_id=int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado",
        )

    users_table.update(
        {"hashed_password": hash_password(data.new_password)},
        doc_ids=[int(user_id)],
    )

    # Mark token as used
    password_resets_table.update(
        {"used": True},
        (_Q.jti == jti) & (_Q.user_id == user_id) & (_Q.purpose == "password_reset"),
    )

    return MessageResponse(detail="Contraseña actualizada correctamente.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    """Change password for authenticated user."""
    # Verify current password
    if not verify_password(data.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    # Check that new password is different
    if verify_password(data.new_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña no puede ser igual a la actual",
        )

    # Validate new password policy
    validate_password_policy(data.new_password)

    # Update password
    users_table.update(
        {"hashed_password": hash_password(data.new_password)},
        doc_ids=[current_user.doc_id],
    )

    return MessageResponse(detail="Contraseña cambiada correctamente.")
