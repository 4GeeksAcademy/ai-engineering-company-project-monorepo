"""Pydantic contracts for the users domain.

A user is credentials plus account state: ``id``, ``email``, ``hashed_password``,
``is_active``, ``role`` and ``created_at``. Display name and contact data are
not here: they belong to the Profile (``profiles`` domain). The password is
only ever an input — it is hashed before it reaches TinyDB and never comes back out.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, StringConstraints, field_validator

from profiles.fields import ADDRESS_MAX, NAME_MAX, PHONE_PATTERN

# bcrypt only looks at the first 72 bytes; refuse longer passwords instead of
# silently truncating them.
MAX_PASSWORD_BYTES = 72


def _normalize_email(value):
    return value.strip().casefold() if isinstance(value, str) else value


def _check_password_bytes(value: str | None) -> str | None:
    if value is not None and len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"password must be at most {MAX_PASSWORD_BYTES} bytes long")
    return value


# Emails are case-insensitive for our purposes: stored and compared lower-cased.
Email = Annotated[EmailStr, BeforeValidator(_normalize_email)]


class Role(StrEnum):
    """The only accepted values of ``User.role``; anything else is a ``422``.
    New users are ``user``. Only ``admin`` has extra powers today (see ``users.router``)."""

    admin = "admin"
    manager = "manager"
    user = "user"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(BaseModel):
    """The document stored in TinyDB (``users/db.json``). Never returned as is:
    the API answers with ``UserOut``, which leaves ``hashed_password`` out."""

    id: UUID = Field(default_factory=uuid4)
    email: Email
    hashed_password: str
    is_active: bool = True
    role: Role = Role.user
    created_at: datetime = Field(default_factory=_utcnow)


# Optional initial profile data. Stripped per field: a blanket ``str_strip_whitespace``
# would also strip the password.
_Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=NAME_MAX)]
_Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=PHONE_PATTERN)]
_Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=ADDRESS_MAX)]


class UserCreate(BaseModel):
    """Credentials, plus the optional initial profile (``name`` becomes the
    profile's ``name``). None of the profile fields is stored on User.
    ``role`` is deliberately absent: the API can't grant it at creation."""

    model_config = ConfigDict(extra="forbid")

    email: Email
    password: str = Field(min_length=8)
    name: _Name | None = None
    phone: _Phone | None = None
    address: _Address | None = None

    _password_fits = field_validator("password")(_check_password_bytes)


class UserUpdate(BaseModel):
    """Partial update (``PUT /users/{id}``): omitted fields are left untouched.

    Who may send what is decided by the router and the service, not here:
    ``role`` and ``is_active`` are admin-only, ``password`` is owner-only, and the owner must send
    ``current_password`` to change the email or the password, so a stolen
    session alone can't take over the account."""

    model_config = ConfigDict(extra="forbid")

    email: Email | None = None
    password: str | None = Field(default=None, min_length=8)
    role: Role | None = None
    is_active: bool | None = None
    current_password: str | None = None

    _password_fits = field_validator("password")(_check_password_bytes)

    @field_validator("email", "password", "role", "is_active")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("cannot be null")
        return value


class UserOut(BaseModel):
    """What the API ever returns about a user — never the password or its hash."""

    id: UUID
    email: EmailStr
    is_active: bool
    role: Role
    created_at: datetime


class SignUpOut(UserOut):
    """Answer of the public sign-up: the new (inactive) user and what happens next."""

    message: str


class DirectoryEntry(BaseModel):
    """One line of the user directory: just enough to show who is who. No email,
    role or contact data (those stay behind the owner-or-admin rules)."""

    user_id: UUID
    name: str
