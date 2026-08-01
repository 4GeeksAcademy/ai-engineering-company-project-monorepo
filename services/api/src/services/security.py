"""Security helpers for password hashing and verification."""

from __future__ import annotations

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MAX_BCRYPT_PASSWORD_BYTES = 72


class PasswordValidationError(ValueError):
    """Raised when a password does not meet backend security constraints."""


def _password_byte_length(password: str) -> int:
    return len(password.encode("utf-8"))


def validate_password(password: str) -> None:
    if not password:
        raise PasswordValidationError("Password must not be empty.")

    if _password_byte_length(password) > MAX_BCRYPT_PASSWORD_BYTES:
        raise PasswordValidationError(
            f"Password cannot exceed {MAX_BCRYPT_PASSWORD_BYTES} bytes."
        )


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt.

    The returned value is the only form that should be stored.
    """

    validate_password(password)
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored bcrypt hash."""

    if not password or not hashed_password:
        return False

    if _password_byte_length(password) > MAX_BCRYPT_PASSWORD_BYTES:
        return False

    return pwd_context.verify(password, hashed_password)
