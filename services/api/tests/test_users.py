"""Service-level checks of ``users.service``: the first-user bootstrap, the migration of documents written by older versions,
and the lookups.

The HTTP rules of the same domain (who may do what, sign-up, changing or deleting an account) are tested in ``test_register.py``,
``test_accounts.py`` and ``test_me.py`` with the three-level layout. This file keeps what only the service layer can show: what
happens at startup and to data an older version stored. (It used to also hold HTTP-level tests; they were retired once those
modules covered the same behaviour and more: see docs/testing-plan.md, section 12.)
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

import pytest
from tinydb import TinyDB

from auth import service as auth_service
from conftest import ALICE, BOB, uuid_of
from users import service as users_service
from users.schemas import UserCreate, UserUpdate

NEW = {"email": "nuevo@example.com", "password": "s3cret-pass!"}


def test_bootstrap_creates_the_first_user_only_on_an_empty_store(tmp_path, monkeypatch, users_db):
    monkeypatch.setenv("AUTH_INITIAL_EMAIL", "first@example.com")
    monkeypatch.setenv("AUTH_INITIAL_PASSWORD", "bootstrap-pass")
    users_service.bootstrap_first_user()  # store already has users: no-op
    assert len(users_db) == 3

    empty = TinyDB(tmp_path / "empty.json")
    monkeypatch.setattr(users_service, "_db", empty)
    users_service.bootstrap_first_user()
    assert auth_service.authenticate("first@example.com", "bootstrap-pass").email == "first@example.com"
    empty.close()


@pytest.mark.parametrize("missing", ["AUTH_INITIAL_EMAIL", "AUTH_INITIAL_PASSWORD"])
def test_bootstrap_without_full_credentials_creates_nobody(tmp_path, monkeypatch, missing):
    empty = TinyDB(tmp_path / "empty.json")
    monkeypatch.setattr(users_service, "_db", empty)
    monkeypatch.setenv("AUTH_INITIAL_EMAIL", "first@example.com")
    monkeypatch.setenv("AUTH_INITIAL_PASSWORD", "bootstrap-pass")
    monkeypatch.delenv(missing)
    users_service.bootstrap_first_user()
    assert len(empty) == 0
    empty.close()


def test_the_bootstrapped_first_user_is_an_admin(users_db, monkeypatch):
    users_db.truncate()
    monkeypatch.setenv("AUTH_INITIAL_EMAIL", "first@example.com")
    monkeypatch.setenv("AUTH_INITIAL_PASSWORD", "first-password-1")
    users_service.bootstrap_first_user()
    assert [d["role"] for d in users_db.all()] == ["admin"]


def test_legacy_documents_are_migrated_once(users_db):
    users_db.truncate()
    users_db.insert({"user_uuid": str(uuid4()), "email": "old1@example.com", "password_hash": "$2b$12$x"})
    users_db.insert({"user_uuid": str(uuid4()), "email": "old2@example.com", "password_hash": "$2b$12$y"})
    users_service.migrate_legacy_users()
    first, second = users_db.all()
    for doc in (first, second):
        assert set(doc) == {"id", "email", "hashed_password", "is_active", "role", "created_at"}
        assert doc["is_active"] is True and datetime.fromisoformat(doc["created_at"])
    assert (first["role"], second["role"]) == ("admin", "user")  # someone must be admin
    assert first["hashed_password"] == "$2b$12$x"
    snapshot = users_db.all()
    users_service.migrate_legacy_users()  # idempotent
    assert users_db.all() == snapshot


def test_service_lookup_by_email_is_case_insensitive_and_hides_the_hash():
    user = users_service.get_user_by_email("  ALICE@Example.com ")
    assert user.id == uuid_of(ALICE) and user.email == ALICE
    assert "hashed_password" not in user.model_dump()
    assert users_service.get_user(user.id) == user


def test_service_raises_not_found_for_unknown_id_or_email():
    with pytest.raises(users_service.UserNotFoundError, match="nobody@example.com"):
        users_service.get_user_by_email("Nobody@example.com")
    with pytest.raises(users_service.UserNotFoundError):
        users_service.get_user(uuid4())


def test_service_crud_round_trip():
    created = users_service.create_user(UserCreate(**NEW))
    assert users_service.get_user_by_email(NEW["email"]).id == created.id
    updated = users_service.update_user(
        created.id, UserUpdate(email="renamed@example.com", current_password=NEW["password"])
    )
    assert updated.id == created.id and users_service.get_user(created.id).email == "renamed@example.com"
    with pytest.raises(users_service.UserNotFoundError):
        users_service.get_user_by_email(NEW["email"])
    users_service.delete_user(created.id)
    with pytest.raises(users_service.UserNotFoundError):
        users_service.get_user(created.id)


def test_the_service_asks_for_the_current_password_unless_it_is_told_not_to():
    """The safe behaviour is the default: only a caller that has already decided (an admin editing someone else) skips the check."""
    bob = users_service.get_user_by_email(BOB)

    with pytest.raises(users_service.CurrentPasswordRequiredError):
        users_service.update_user(bob.id, UserUpdate(password="a-brand-new-password"))
    with pytest.raises(users_service.CurrentPasswordRequiredError):
        users_service.update_user(bob.id, UserUpdate(email="bob.new@example.com"))

    users_service.update_user(bob.id, UserUpdate(email="bob.by.admin@example.com"), check_password=False)
    assert users_service.get_doc_by_email("bob.by.admin@example.com")["id"] == str(bob.id)

