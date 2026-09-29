"""Pydantic contracts for the profiles domain.

A Profile is the public face of a user: the display name and the contact data.
None of it lives in ``User`` (which is only credentials). Profile and User are
one-to-one and share the same key, ``user_uuid``.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from users.schemas import Email

DISPLAY_NAME_MAX = 80
PHONE_PATTERN = r"^\+?[0-9 ()\-.]{6,20}$"


class ProfileUpdate(BaseModel):
    """Partial update of your own profile. Omitted fields are left untouched;
    an explicit ``null`` clears an optional field (but not the display name)."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    display_name: str | None = Field(default=None, min_length=1, max_length=DISPLAY_NAME_MAX)
    contact_email: Email | None = None
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)

    @field_validator("display_name")
    @classmethod
    def display_name_not_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("display_name cannot be cleared")
        return value


class ProfileOut(BaseModel):
    user_uuid: UUID
    display_name: str
    contact_email: EmailStr | None = None
    phone: str | None = None
