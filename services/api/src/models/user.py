"""User models and enums for authentication data persisted in TinyDB."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field

TinyDBId = int | str


class UserRole(str, Enum):
    """Allowed authorization roles."""

    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class User(BaseModel):
    """User record model stored in TinyDB."""

    id: TinyDBId
    email: str = Field(min_length=3)
    hashed_password: str = Field(min_length=1)
    is_active: bool = True
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
