"""
service.py — Brasaland · JWT token creation and verification
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded before reading env vars

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt

# --- JWT configuration ---
SECRET_KEY = os.environ.get(
    "SECRET_KEY", "brasa-land-dev-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# --- Password Reset configuration ---
PASSWORD_RESET_SECRET_KEY = os.environ.get(
    "PASSWORD_RESET_SECRET_KEY", "brasa-reset-dev-secret-change-in-production"
)
PASSWORD_RESET_EXPIRE_MINUTES = int(
    os.environ.get("PASSWORD_RESET_EXPIRE_MINUTES", "30")
)


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns the payload or None if invalid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def validate_password_policy(password: str) -> None:
    """Validate password meets security policy. Raises HTTP 422 if not."""
    errors: list[str] = []
    if len(password) < 6:
        errors.append("must be at least 6 characters")
    if not any(c.isupper() for c in password):
        errors.append("must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("must contain at least one digit")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Password {'; '.join(errors)}",
        )


def create_reset_token(user_id: str) -> str:
    """Create a signed JWT password reset token with unique jti."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "purpose": "password_reset",
        "iat": int(now.timestamp()),
        "exp": expire,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, PASSWORD_RESET_SECRET_KEY, algorithm=ALGORITHM)


def decode_reset_token(token: str) -> dict | None:
    """Decode and validate a password reset token. Returns payload or None."""
    try:
        payload = jwt.decode(
            token, PASSWORD_RESET_SECRET_KEY, algorithms=[ALGORITHM]
        )
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except JWTError:
        return None
