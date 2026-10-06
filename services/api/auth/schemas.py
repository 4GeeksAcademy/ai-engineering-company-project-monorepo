"""Pydantic contracts for the auth domain. Users live in ``users``."""

from __future__ import annotations

from pydantic import BaseModel

from profiles.schemas import Profile
from users.schemas import UserOut


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the token expires (ACCESS_TOKEN_EXPIRE_MINUTES * 60)


class MeOut(UserOut):
    """``GET /auth/me``: the session's user (``email``, ``role``, ...) and its linked
    Profile (``name`` and the contact data). Never the password or its hash."""

    profile: Profile
