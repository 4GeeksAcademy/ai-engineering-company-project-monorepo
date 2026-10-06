"""The ``create-user`` command (first user, account recovery): the one way to create an admin from outside the API.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert. Outcomes
are asserted on the domain (who exists, with which role, who can authenticate), not on what is printed, except that
a password must never be.
"""

from __future__ import annotations

import sys

import pytest

from auth import cli
from auth import service as auth_service
from conftest import ALICE, PASSWORD
from users import service as users_service

GOOD = "a-good-password"


def run(monkeypatch, *args: str, passwords: tuple[str, ...] = (GOOD, GOOD)) -> None:
    """Runs ``create-user`` with these arguments, typing ``passwords`` at the two hidden prompts."""
    monkeypatch.setattr(sys, "argv", ["create-user", *args])
    answers = iter(passwords)
    monkeypatch.setattr(cli.getpass, "getpass", lambda prompt="": next(answers))
    cli.main()


# --- HAPPY PATH ---------------------------------------------------------------------------------------


def test_creates_a_regular_user_that_can_authenticate_and_has_a_profile(monkeypatch, capsys, users_db, profiles_db):
    run(monkeypatch, "--email", "  New.User@Example.COM ")

    user = auth_service.authenticate("new.user@example.com", GOOD)
    assert user is not None and user.role == "user" and user.is_active
    assert (len(users_db), len(profiles_db)) == (4, 4)
    out = capsys.readouterr().out
    assert "new.user@example.com" in out and str(user.id) in out
    assert GOOD not in out  # the password is never printed


def test_role_admin_creates_an_admin(monkeypatch):
    run(monkeypatch, "--email", "boss@example.com", "--role", "admin")

    assert users_service.get_user_by_email("boss@example.com").role == "admin"


def test_the_password_is_stored_only_as_a_hash(monkeypatch, users_db):
    run(monkeypatch, "--email", "hashed@example.com")

    stored = next(d for d in users_db.all() if d["email"] == "hashed@example.com")
    assert stored["hashed_password"].startswith("$2b$") and GOOD not in str(stored)


# --- EDGE CASES --------------------------------------------------------------------------------------


@pytest.mark.parametrize("password", ["short", "", "1234567"], ids=["short", "empty", "7-chars"])
def test_a_password_under_the_minimum_is_refused_without_echoing_it(monkeypatch, users_db, password):
    with pytest.raises(SystemExit) as exc:
        run(monkeypatch, "--email", "weak@example.com", passwords=(password, password))

    assert "Invalid user" in str(exc.value)
    assert not password or password not in str(exc.value)
    assert len(users_db) == 3


@pytest.mark.parametrize("password", ["x" * 73, "pass\x00word1"], ids=["over-72-bytes", "nul-byte"])
def test_a_password_bcrypt_cannot_hash_is_refused_not_a_crash(monkeypatch, users_db, password):
    with pytest.raises(SystemExit, match="Invalid user"):
        run(monkeypatch, "--email", "long@example.com", passwords=(password, password))

    assert len(users_db) == 3


@pytest.mark.parametrize("email", ["not-an-email", "@example.com", "a@", "  "])
def test_a_malformed_email_is_refused(monkeypatch, users_db, email):
    with pytest.raises(SystemExit, match="Invalid user"):
        run(monkeypatch, "--email", email)

    assert len(users_db) == 3


# --- FAILURE MODES -----------------------------------------------------------------------------------


def test_mismatching_passwords_create_nobody(monkeypatch, users_db, profiles_db):
    with pytest.raises(SystemExit, match="do not match"):
        run(monkeypatch, "--email", "typo@example.com", passwords=(GOOD, GOOD + "x"))

    assert (len(users_db), len(profiles_db)) == (3, 3)


def test_an_existing_email_is_refused_and_its_password_is_left_alone(monkeypatch, users_db):
    before = users_db.all()

    with pytest.raises(SystemExit, match="already exists"):
        run(monkeypatch, "--email", ALICE.upper(), "--role", "admin", passwords=("hijack-password", "hijack-password"))

    assert users_db.all() == before
    assert auth_service.authenticate(ALICE, PASSWORD) is not None
    assert auth_service.authenticate(ALICE, "hijack-password") is None


def test_an_unknown_role_is_refused_by_the_argument_parser(monkeypatch, users_db):
    with pytest.raises(SystemExit) as exc:
        run(monkeypatch, "--email", "x@example.com", "--role", "root")

    assert exc.value.code == 2
    assert len(users_db) == 3


def test_the_email_is_required(monkeypatch, users_db):
    with pytest.raises(SystemExit) as exc:
        run(monkeypatch)

    assert exc.value.code == 2
    assert len(users_db) == 3
