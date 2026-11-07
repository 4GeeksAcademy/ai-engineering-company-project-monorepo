"""Pydantic models for users, profiles and auth tokens.

Users and profiles live only in TinyDB. Other modules reference a user by its
TinyDB `id` (a uuid4 string) as `user_uuid`. `hashed_password` exists only on
the internal `User` model; every response model leaves it out.
Response models list each exposed attribute explicitly.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

# Emails are compared case-insensitively, so they are stored lowercased.
Email = Annotated[EmailStr, AfterValidator(str.lower)]


def _not_blank(password: str) -> str:
    if not password.strip():
        raise ValueError("password must not be blank")
    return password


def _fits_bcrypt(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("password must be at most 72 bytes")
    return password


Password = Annotated[str, Field(min_length=8), AfterValidator(_not_blank), AfterValidator(_fits_bcrypt)]
OptionalText = Annotated[str | None, Field(default=None, max_length=200)]


class Role(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class ProfileFields(BaseModel):
    name: OptionalText
    phone: OptionalText
    address: OptionalText


class UserCreate(ProfileFields):
    """Public sign-up payload. `role` is not accepted: new users are always `user`."""

    model_config = ConfigDict(extra="forbid")

    email: Email
    password: Password


class UserUpdate(BaseModel):
    """Fields a user (or an admin) may change. Only an admin may send `role`."""

    model_config = ConfigDict(extra="forbid")

    email: Email | None = None
    password: Password | None = None
    role: Role | None = None


class User(BaseModel):
    """User as stored in TinyDB. Internal only: never used as a response_model."""

    model_config = ConfigDict(extra="ignore")

    id: str
    email: EmailStr
    is_active: bool
    role: Role
    created_at: datetime
    hashed_password: str


class UserRegistered(BaseModel):
    """Answer to the public sign-up (POST /users). Echoes neither the email nor any credential."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    role: Role


class UserListItem(BaseModel):
    """Row of GET /users: enough to identify an account and its state."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    role: Role
    is_active: bool


class UserPublic(UserListItem):
    """Detail of one account (GET/PUT /users/{id}): the list row plus `created_at`. No password hash."""

    created_at: datetime


class ProfileUpdate(ProfileFields):
    model_config = ConfigDict(extra="forbid")


class Profile(ProfileFields):
    """Profile as stored. Internal only: `id` and `user_id` are server-side keys."""

    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str


class ProfilePublic(ProfileFields):
    """Profile as returned by GET/PUT /profiles/me: only the three editable fields."""

    model_config = ConfigDict(from_attributes=True)


class PasswordResetToken(BaseModel):
    """Server-side state of a reset link, so each one works only once. Internal only."""

    jti: str
    user_id: str
    expires_at: datetime
    used_at: datetime | None = None


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    new_password: Password


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str
    new_password: Password


class Message(BaseModel):
    detail: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Me(BaseModel):
    """Caller's own account (GET /auth/me). Echoing the email is intentional: the profile view needs it."""

    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    role: Role
    profile: ProfileFields | None
