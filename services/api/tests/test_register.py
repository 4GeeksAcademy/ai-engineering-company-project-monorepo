"""Sign-up (``POST /users``): the business rules of creating an account.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP
call per test through ``async_client``. Outcomes are asserted on the domain layer (``users_service``,
``auth_service``, the stores), not on the shape of the JSON; the status code is used only as "accepted" / "refused".
"""

from __future__ import annotations

import pytest

from auth import service as auth_service
from auth.security import verify_password
from conftest import ALICE, PASSWORD, headers_for, uuid_of
from users import service as users_service
from users.schemas import Role

pytestmark = pytest.mark.anyio

NEW = {"email": "nuevo@example.com", "password": "s3cret-pass!"}


async def register(client, **overrides):
    """The only HTTP call of this module (sign-up is public: no session needed)."""
    return await client.post("/users", json={**NEW, **overrides})


# --- HAPPY PATH ---------------------------------------------------------------------------------------


async def test_a_new_account_is_created_active_with_the_user_role_and_can_sign_in_at_once(async_client):
    response = await register(async_client)

    assert response.status_code == 201
    account = users_service.get_user_by_email(NEW["email"])
    assert account.is_active and account.role == Role.user
    assert auth_service.authenticate(NEW["email"], NEW["password"]) is not None  # no activation step


async def test_the_password_is_stored_only_as_a_bcrypt_hash(async_client):
    await register(async_client)

    stored = users_service.get_doc_by_email(NEW["email"])
    assert stored["hashed_password"].startswith("$2b$")
    assert NEW["password"] not in str(stored)
    assert verify_password(NEW["password"], stored["hashed_password"])


async def test_every_account_gets_exactly_one_profile_named_after_the_email_by_default(async_client, profiles_db):
    await register(async_client)

    assert len(profiles_db) == 4  # the three seeded ones plus the new one
    assert next(p for p in profiles_db.all() if p["name"] == "nuevo")


async def test_the_optional_profile_data_goes_to_the_profile_and_not_to_the_user(async_client, profiles_db):
    await register(async_client, name="Nueva Persona", phone="+34 600 000 000", address="Calle 1")

    profile = next(p for p in profiles_db.all() if p["name"] == "Nueva Persona")
    assert (profile["phone"], profile["address"]) == ("+34 600 000 000", "Calle 1")
    assert "name" not in users_service.get_doc_by_email(NEW["email"])


# --- EDGE CASES --------------------------------------------------------------------------------------


async def test_the_email_is_stored_trimmed_and_lower_cased(async_client):
    await register(async_client, email="  Nuevo@Example.COM ")

    assert users_service.get_doc_by_email("nuevo@example.com")["email"] == "nuevo@example.com"
    assert auth_service.authenticate("NUEVO@example.com", NEW["password"]) is not None


async def test_a_plus_tag_makes_a_different_email(async_client, users_db):
    response = await register(async_client, email="alice+news@example.com")

    assert response.status_code == 201
    assert len(users_db) == 4


@pytest.mark.parametrize(
    ("password", "accepted"),
    [
        ("1234567", False),
        ("12345678", True),
        ("x" * 72, True),
        ("x" * 73, False),
        ("é" * 36, True),
        ("é" * 37, False),
        ("x" * 71 + "é", False),
        ("pass\x00word1", False),  # bcrypt cannot hash a NUL byte: a refusal, never a server error
    ],
    ids=["7-chars", "8-chars", "72-bytes", "73-bytes", "72-bytes-multibyte", "74-bytes-multibyte", "73-bytes-mixed", "nul-byte"],
)
async def test_the_password_must_be_8_to_72_bytes_without_nul_bytes(async_client, users_db, password, accepted):
    response = await register(async_client, password=password)

    assert (response.status_code == 201) is accepted
    assert (auth_service.authenticate(NEW["email"], password) is not None) is accepted  # works, or was never created
    assert len(users_db) == (4 if accepted else 3)
    if accepted:
        assert auth_service.authenticate(NEW["email"], password + "!") is None  # no silent truncation either


async def test_the_password_is_kept_exactly_as_typed_including_spaces(async_client):
    password = "  spaced pass phrase  "
    await register(async_client, password=password)

    assert auth_service.authenticate(NEW["email"], password) is not None
    assert auth_service.authenticate(NEW["email"], password.strip()) is None


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"email": NEW["email"]},
        {"password": NEW["password"]},
        {"email": "", "password": NEW["password"]},
        {"email": "   ", "password": NEW["password"]},
        {"email": NEW["email"], "password": ""},
        {"email": None, "password": NEW["password"]},
        {"email": NEW["email"], "password": None},
    ],
    ids=["nothing", "no-password", "no-email", "empty-email", "blank-email", "empty-password", "null-email", "null-password"],
)
async def test_missing_or_empty_credentials_are_refused_and_nothing_is_created(async_client, users_db, profiles_db, body):
    response = await async_client.post("/users", json=body)

    assert not response.is_success
    assert (len(users_db), len(profiles_db)) == (3, 3)


@pytest.mark.parametrize(
    "email",
    ["plainaddress", "@example.com", "alice@", "alice@@example.com", "alice@example", "alice example@example.com",
     "alice@exam ple.com", "a@" + "b" * 300 + ".com", "alice@example..com", ".alice@example.com", "alice\x00@example.com",
     "alice@example.com,bob@example.com", "alice@example.com;bob@example.com"],
)
async def test_a_malformed_email_is_refused_and_nothing_is_created(async_client, users_db, email):
    response = await register(async_client, email=email)

    assert not response.is_success
    assert len(users_db) == 3


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "email",
    [
        ALICE,
        ALICE.upper(),
        f"  {ALICE}  ",
        f"\t{ALICE}\n",
        "<alice@example.com>",
        "Mallory <alice@example.com>",
        '"Alice" <ALICE@example.com>',
    ],
    ids=["same", "upper", "padded", "whitespace-chars", "angle-brackets", "display-name", "quoted-display-name"],
)
async def test_an_email_that_is_already_registered_is_refused_in_any_spelling(async_client, users_db, profiles_db, email):
    response = await register(async_client, email=email)

    assert response.status_code == 409
    assert (len(users_db), len(profiles_db)) == (3, 3)  # neither a second account nor an orphan profile


async def test_a_refused_duplicate_cannot_be_used_to_take_over_the_existing_account(async_client):
    before = users_service.get_doc_by_email(ALICE)

    await register(async_client, email=ALICE, password="attacker-chosen-password")

    assert users_service.get_doc_by_email(ALICE) == before  # hash untouched
    assert auth_service.authenticate(ALICE, PASSWORD) is not None
    assert auth_service.authenticate(ALICE, "attacker-chosen-password") is None


async def test_registering_twice_leaves_one_account_and_the_first_password_wins(async_client, users_db, profiles_db):
    first = await register(async_client)
    second = await register(async_client, password="a-different-password")

    assert (first.status_code, second.status_code) == (201, 409)
    assert (len(users_db), len(profiles_db)) == (4, 4)
    assert auth_service.authenticate(NEW["email"], NEW["password"]) is not None
    assert auth_service.authenticate(NEW["email"], "a-different-password") is None


async def test_a_duplicate_is_refused_before_its_profile_data_is_used(async_client, profiles_db):
    await register(async_client, email=ALICE, name="Mallory", phone="+34 600 000 000")

    assert all(p["name"] != "Mallory" for p in profiles_db.all())


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("role", "admin"),
        ("is_active", False),
        ("id", "00000000-0000-0000-0000-000000000000"),
        ("hashed_password", "x"),
        ("created_at", "2000-01-01T00:00:00Z"),
        ("current_password", "x"),
    ],
)
async def test_sign_up_cannot_set_privileged_or_internal_state(async_client, users_db, field, value):
    response = await register(async_client, **{field: value})

    assert not response.is_success
    assert len(users_db) == 3  # not even a harmless "user" account was created from a tampered request


async def test_a_refused_sign_up_never_echoes_the_password_back(async_client):
    secret = "tiny"  # too short on purpose

    for payload in ({"email": "bad", "password": secret}, {"email": NEW["email"], "password": secret}, {"password": secret}):
        response = await async_client.post("/users", json=payload)
        assert not response.is_success
        assert secret not in response.text


async def test_a_nul_byte_in_a_new_password_is_refused_and_keeps_the_old_one(async_client):
    response = await async_client.put(
        f"/users/{uuid_of(ALICE)}",
        json={"password": "new\x00password", "current_password": PASSWORD},
        headers=headers_for(ALICE),
    )

    assert not response.is_success and "new\x00password" not in response.text
    assert auth_service.authenticate(ALICE, PASSWORD) is not None  # unchanged
