"""Password hashing and stateless JWT utilities."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.hash import bcrypt

from auth.settings import get_jwt_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a password using libpass's bcrypt-backed password API."""
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes for bcrypt")
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password without propagating malformed stored-hash errors."""
    if len(password.encode("utf-8")) > 72:
        return False
    try:
        return bcrypt.verify(password, hashed_password)
    except Exception:
        return False


def create_access_token(user_id: int) -> str:
    secret, expires_in_minutes = get_jwt_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_in_minutes)
    claims = {"sub": str(user_id), "iat": now, "exp": expires_at}
    return jwt.encode(claims, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the integer TinyDB user ID, rejecting invalid or expired JWTs."""
    try:
        secret, _ = get_jwt_settings()
        claims = jwt.decode(token, secret, algorithms=[ALGORITHM])
        subject = claims.get("sub")
        if not isinstance(subject, str):
            raise ValueError("JWT subject must be a string user ID")
        user_id = int(subject)
        if user_id <= 0:
            raise ValueError("JWT subject must be a positive user ID")
        return user_id
    except (JWTError, TypeError, ValueError) as exc:
        raise ValueError("Invalid authentication token") from exc
