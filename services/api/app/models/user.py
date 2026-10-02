"""User & Profile domain models.

The *User* document holds only credentials and authorization state
(id, email, hashed_password, is_active, role, created_at). Display name
and contact fields (name, phone, address) live on the linked *Profile*.
"""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

# Re-exported for convenience — the Profile model lives in app.models.profile
from app.models.profile import ProfileResponse  # noqa: F401


class UserRole(str, Enum):
    """Allowed roles. Any other value is rejected by validation."""

    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


# Roles allowed to manage other users (PUT /users/{id}).
STAFF_ROLES: set[str] = {UserRole.ADMIN.value, UserRole.MANAGER.value}

EMAIL_PATTERN = r"^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$"


class UserCreate(BaseModel):
    """Registration payload.

    ``role`` defaults to ``user`` — new registrations via POST /users
    default to the lowest role. Profile fields are optional and stored on
    the linked Profile, never on the User document.
    """

    email: str = Field(..., pattern=EMAIL_PATTERN)
    password: str = Field(..., min_length=1)
    role: UserRole = UserRole.USER
    # Optional initial profile fields (created as the linked Profile)
    name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "email": "jane.doe@example.com",
                    "password": "S3cure-Pass!",
                    "role": "user",
                    "name": "Jane Doe",
                    "phone": "+1 555 123 4567",
                    "address": "123 Main St, Springfield",
                }
            ]
        },
    )


class UserUpdate(BaseModel):
    """Credential fields updatable via PUT /users/{id} (staff only)."""

    email: str | None = Field(default=None, pattern=EMAIL_PATTERN)
    password: str | None = Field(default=None, min_length=1)
    role: UserRole | None = None
    is_active: bool | None = None

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "email": "jane.doe@example.com",
                    "role": "manager",
                    "is_active": True,
                }
            ]
        },
    )


class UserResponse(BaseModel):
    """Safe user representation — never exposes the hashed password."""

    id: int
    email: str
    is_active: bool
    role: UserRole
    created_at: str
    profile: ProfileResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_PATTERN)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
