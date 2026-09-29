"""Password hashing and JWT helpers. Pure functions, no I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from core.config import JWT_ALGORITHM, get_access_token_expire_minutes, get_jwt_secret


@dataclass(frozen=True)
class TokenData:
    user_uuid: UUID
    issued_at: int  # unix seconds


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:  # e.g. password longer than bcrypt's 72-byte limit
        return False


def create_access_token(user_uuid: UUID | str) -> str:
    """Signed JWT for a user. It carries the user's ``user_uuid`` (the id stored
    in TinyDB) and timing, nothing else: who the user is and whether they still
    exist is read from the store on every request, so deleting an account
    takes effect immediately instead of when the token expires. ``sub`` repeats
    the same value for standard JWT consumers. The uuid is immutable, so
    changing an email keeps the session valid.
    """
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_uuid),
        "user_uuid": str(user_uuid),
        "iat": now,
        "exp": now + timedelta(minutes=get_access_token_expire_minutes()),
    }
    return jwt.encode(claims, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> TokenData | None:
    """Identity in a valid, unexpired token, or ``None`` for anything else."""
    try:
        claims = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],  # pinned: never trust the header's alg
            options={"require_sub": True, "require_exp": True, "require_iat": True},
        )
        raw_uuid, issued_at = claims["user_uuid"], claims["iat"]
        if claims["sub"] != raw_uuid or not isinstance(raw_uuid, str) or not isinstance(issued_at, int):
            return None
        return TokenData(user_uuid=UUID(raw_uuid), issued_at=issued_at)
    except (JWTError, KeyError, ValueError):
        return None
