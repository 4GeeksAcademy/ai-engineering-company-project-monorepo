"""Pydantic contracts for the auth domain: internal users, roles and tokens."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

# bcrypt only looks at the first 72 bytes; refuse longer passwords instead of
# silently truncating them.
MAX_PASSWORD_BYTES = 72


class Role(str, Enum):
    """Internal roles (docs/ARCHITECTURE_PROPOSAL.md, "Autenticación interna")."""

    CONSULTANT = "consultant"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(pattern=r"^[a-z0-9_.-]{3,32}$")
    password: str = Field(min_length=8)
    role: Role

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value):
        return value.strip().casefold() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(f"password must be at most {MAX_PASSWORD_BYTES} bytes long")
        return value


class UserOut(BaseModel):
    """What the API ever returns about a user — never the password hash."""

    username: str
    role: Role
    disabled: bool = False


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
