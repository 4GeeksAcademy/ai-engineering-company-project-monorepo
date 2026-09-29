from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Profile:
    id: str
    user_id: str
    name: str | None = None
    phone: str | None = None
    address: str | None = None

    def to_document(self) -> dict[str, str | None]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "address": self.address,
        }

    @classmethod
    def from_document(cls, document: Mapping[str, object]) -> "Profile":
        expected_fields = {"id", "user_id", "name", "phone", "address"}
        if document.keys() != expected_fields:
            raise ValueError("Profile document must contain exactly the supported fields")

        return cls(
            id=document["id"],
            user_id=document["user_id"],
            name=document["name"],
            phone=document["phone"],
            address=document["address"],
        )