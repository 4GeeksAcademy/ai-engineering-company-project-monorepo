"""Pydantic contracts for the profiles domain.

A Profile holds the person's name and contact data. None of it lives in
``User`` (which is only credentials and account state). Profile and User are
one-to-one: ``Profile.user_id`` is the ``User.id`` it belongs to.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from users.schemas import Email

from .fields import ADDRESS_MAX, NAME_MAX, PHONE_PATTERN


class Profile(BaseModel):
    """The document stored in TinyDB (``profiles/db.json``) and what the API returns.
    ``name`` is required; the rest is optional."""

    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    name: str
    contact_email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None


class ProfileUpdate(BaseModel):
    """``PUT /profiles/me``: partial update of your own profile. Omitted fields are
    left untouched; an explicit ``null`` clears an optional field (but not the name)."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX)
    contact_email: Email | None = None
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    address: str | None = Field(default=None, min_length=1, max_length=ADDRESS_MAX)

    @field_validator("name")
    @classmethod
    def name_not_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("name cannot be cleared")
        return value
