"""Shared auth fixtures: an isolated user store with one user per role."""

from __future__ import annotations

import pytest
from tinydb import TinyDB

from auth import service as auth_service
from auth.security import create_access_token, hash_password

PASSWORD = "correct-horse-battery"
ROLES = ("consultant", "supervisor", "admin")

# bcrypt is deliberately slow: hash once per session, reuse in every test.
_PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture(autouse=True)
def auth_db(tmp_path, monkeypatch) -> TinyDB:
    """Fresh users (consultant / supervisor / admin) per test, never db.json."""
    database = TinyDB(tmp_path / "auth-db.json")
    for role in ROLES:
        database.insert(
            {"username": role, "password_hash": _PASSWORD_HASH, "role": role, "disabled": False}
        )
    monkeypatch.setattr(auth_service, "_db", database)
    yield database
    database.close()


def headers_for(username: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(username)}"}


@pytest.fixture()
def admin_headers() -> dict[str, str]:
    return headers_for("admin")
