"""Pydantic contracts for the users domain.

A user is just credentials: an email and a password. The password is only ever
an input here — it is hashed before it reaches TinyDB and never comes back out.
"""

from __future__ import annotations

from typing import Annotated, Self
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, field_validator, model_validator

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


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Email
    password: str = Field(min_length=8)

    _password_fits = field_validator("password")(_check_password_bytes)


class UserUpdate(BaseModel):
    """Partial update of your own credentials. Changing the email or the
    password requires ``current_password``, so a stolen session alone can't
    take over the account."""

    model_config = ConfigDict(extra="forbid")

    email: Email | None = None
    password: str | None = Field(default=None, min_length=8)
    current_password: str | None = None

    _password_fits = field_validator("password")(_check_password_bytes)

    @model_validator(mode="after")
    def current_password_required(self) -> Self:
        if (self.email is not None or self.password is not None) and not self.current_password:
            raise ValueError("current_password is required to change the email or the password")
        return self


class UserOut(BaseModel):
    """What the API ever returns about a user — never the password or its hash."""

    user_uuid: UUID
    email: EmailStr
