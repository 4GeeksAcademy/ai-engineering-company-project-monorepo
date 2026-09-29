"""Pydantic contracts for the auth domain. Users live in ``users``."""

from __future__ import annotations

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the token expires (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
