from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


@dataclass(frozen=True, slots=True)
class User:
    id: str
    email: str
    hashed_password: str
    is_active: bool
    role: str = UserRole.USER.value
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        try:
            UserRole(self.role)
        except (TypeError, ValueError) as error:
            raise ValueError("role must be one of: admin, manager, user") from error

    def to_document(self) -> dict[str, str | bool]:
        return {
            "id": self.id,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "is_active": self.is_active,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_document(cls, document: Mapping[str, object]) -> "User":
        expected_fields = {
            "id",
            "email",
            "hashed_password",
            "is_active",
            "role",
            "created_at",
        }
        if document.keys() != expected_fields:
            raise ValueError("User document must contain exactly the supported fields")

        created_at = document["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if not isinstance(created_at, datetime):
            raise TypeError("created_at must be a datetime or ISO 8601 string")

        return cls(
            id=document["id"],
            email=document["email"],
            hashed_password=document["hashed_password"],
            is_active=document["is_active"],
            role=document["role"],
            created_at=created_at,
        )