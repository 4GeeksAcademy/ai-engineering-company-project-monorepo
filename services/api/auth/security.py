"""Password hashing and JWT helpers. Pure functions, no I/O."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

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


def create_access_token(user_uuid: UUID | str) -> str:
    """Signed JWT (HS256, python-jose) with the minimum claims: ``user_id`` (the
    user's ``user_uuid`` stored in TinyDB) and ``exp``. Who the user is and
    whether they still exist is read from the store on every request, so
    deleting an account takes effect immediately instead of when the token
    expires. The uuid never changes, so editing the email keeps the session.

    Lifetime: ``ACCESS_TOKEN_EXPIRE_MINUTES`` (see ``core.config``).
    """
    expires = datetime.now(timezone.utc) + timedelta(minutes=get_access_token_expire_minutes())
    claims = {"user_id": str(user_uuid), "exp": expires}
    return jwt.encode(claims, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> UUID | None:
    """The ``user_id`` in a valid, unexpired, correctly signed token, or ``None``
    for anything else (bad signature, expired, wrong algorithm, no ``exp``,
    ``user_id`` missing or not a uuid)."""
    try:
        claims = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],  # pinned: never trust the header's alg
            options={"require_exp": True},
        )
        raw = claims["user_id"]
        return UUID(raw) if isinstance(raw, str) else None
    except (JWTError, KeyError, ValueError):
        return None
