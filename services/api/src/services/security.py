"""Security helpers for password hashing and verification."""

from __future__ import annotations

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt.

    The returned value is the only form that should be stored.
    """

    if not password:
        raise ValueError("Password must not be empty.")
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored bcrypt hash."""

    if not password or not hashed_password:
        return False
    return pwd_context.verify(password, hashed_password)
