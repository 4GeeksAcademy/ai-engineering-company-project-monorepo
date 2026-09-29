"""Password hashing and JWT helpers. Pure functions, no I/O."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from core.config import JWT_ALGORITHM, get_access_token_expire_minutes, get_jwt_secret


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:  # e.g. password longer than bcrypt's 72-byte limit
        return False


def create_access_token(username: str) -> str:
    """Signed JWT for ``username``. Only identity and timing go in the token:
    the role is read from the user store on every request, so a demotion or a
    disabled account takes effect immediately instead of when the token expires.
    """
    now = datetime.now(timezone.utc)
    claims = {
        "sub": username,
        "iat": now,
        "exp": now + timedelta(minutes=get_access_token_expire_minutes()),
    }
    return jwt.encode(claims, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Username inside a valid, unexpired token, or ``None`` for anything else."""
    try:
        claims = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],  # pinned: never trust the header's alg
            options={"require_sub": True, "require_exp": True},
        )
    except JWTError:
        return None
    subject = claims.get("sub")
    return subject if isinstance(subject, str) and subject else None
