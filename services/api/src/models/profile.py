"""Profile models linked one-to-one with users in TinyDB."""

from __future__ import annotations

from pydantic import BaseModel

from src.models.user import TinyDBId


class Profile(BaseModel):
    """User profile record model stored in TinyDB."""

    id: TinyDBId
    user_id: TinyDBId
    name: str
    phone: str
    address: str
