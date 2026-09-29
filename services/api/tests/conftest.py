"""Shared auth fixtures: an isolated user store with three users."""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from tinydb import TinyDB

from auth.security import create_access_token, hash_password
from profiles import service as profiles_service
from users import service as users_service

PASSWORD = "correct-horse-battery"
ALICE, BOB, CAROL = "alice@example.com", "bob@example.com", "carol@example.com"
UUIDS = {email: uuid4() for email in (ALICE, BOB, CAROL)}

# bcrypt is deliberately slow: hash once per session, reuse in every test.
_PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture(autouse=True)
def users_db(tmp_path, monkeypatch) -> TinyDB:
    """Fresh users (alice, bob, carol) per test, never the real users/db.json."""
    database = TinyDB(tmp_path / "users-db.json")
    for email, user_uuid in UUIDS.items():
        database.insert({"user_uuid": str(user_uuid), "email": email, "password_hash": _PASSWORD_HASH})
    monkeypatch.setattr(users_service, "_db", database)
    yield database
    database.close()


@pytest.fixture(autouse=True)
def profiles_db(tmp_path, monkeypatch) -> TinyDB:
    """One profile per seeded user, as the app has after startup (default name =
    the local part of the email)."""
    database = TinyDB(tmp_path / "profiles-db.json")
    for email, user_uuid in UUIDS.items():
        database.insert(
            {"user_uuid": str(user_uuid), "display_name": email.split("@")[0], "contact_email": None, "phone": None}
        )
    monkeypatch.setattr(profiles_service, "_db", database)
    yield database
    database.close()


def uuid_of(email: str) -> UUID:
    return UUIDS[email]


def headers_for(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(uuid_of(email))}"}


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return headers_for(ALICE)
