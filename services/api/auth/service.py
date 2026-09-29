"""Business logic for the auth domain: checking credentials at login."""

from __future__ import annotations

from users import service as users_service
from users.schemas import UserOut

from .security import hash_password, verify_password

# Verified against when the email doesn't exist, so a login attempt takes
# about the same time either way and can't be used to enumerate accounts.
_DUMMY_HASH = hash_password("not-a-real-password")


def authenticate(email: str, password: str) -> UserOut | None:
    """The user if the credentials are valid."""
    doc = users_service.get_doc_by_email(email)
    password_ok = verify_password(password, doc["password_hash"] if doc else _DUMMY_HASH)
    if doc is None or not password_ok:
        return None
    return UserOut(user_uuid=doc["user_uuid"], email=doc["email"])
