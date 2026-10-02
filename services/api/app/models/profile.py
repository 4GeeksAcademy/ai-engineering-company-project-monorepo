"""Profile domain model — linked one-to-one to User via ``user_id``.

Holds the display name and contact fields that must NOT live on the User
document. The ``user_id`` is the foreign key to the user's ``id`` and is
enforced unique by the service layer (one profile per user).
"""

from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    """Public profile representation."""

    id: int
    user_id: int
    name: str | None = None
    phone: str | None = None
    address: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    """Partial update payload for PUT /profiles/me.

    Only the fields present in the request are changed; ``None`` clears a
    field. Only the profile owner (from the JWT) may update their profile.
    """

    name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
