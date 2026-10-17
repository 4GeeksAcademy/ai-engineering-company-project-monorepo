"""Login (``POST /auth/login``): the business rules of starting a session.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP
call per test through ``async_client``. Outcomes are asserted on the domain (who a token belongs to, how long it
lasts, what the store looks like afterwards, whether two refusals can be told apart), not on the shape of the JSON.
The status code is used only as "accepted" / "refused".

The seeded users (alice = admin, bob and carol = users, all with ``PASSWORD``) and the isolated stores come from
``conftest.py``.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt

from auth import service as auth_service
from auth.security import decode_access_token
from conftest import ALICE, BOB, CAROL, PASSWORD, bearer, uuid_of
from core.config import JWT_ALGORITHM, get_jwt_secret
from main import app

pytestmark = pytest.mark.anyio


async def login(client, email: str = ALICE, password: str = PASSWORD, **extra):
    """The only HTTP call of this module: OAuth2 password flow, the form's ``username`` carries the email."""
    return await client.post("/auth/login", data={"username": email, "password": password, **extra})


def outcome(response) -> tuple:
    """Everything an outside observer learns from an answer: if two refusals have the same outcome, they are alike."""
    return response.status_code, response.json()


# --- HAPPY PATH ---------------------------------------------------------------------------------------


@pytest.mark.parametrize("email", [ALICE, BOB, CAROL])
async def test_valid_credentials_start_a_session_for_that_user_and_nobody_else(async_client, email):
    response = await login(async_client, email)

    assert response.status_code == 200
    assert decode_access_token(response.json()["access_token"]) == uuid_of(email)


async def test_the_session_lasts_as_long_as_the_configured_lifetime(async_client, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10")

    body = (await login(async_client)).json()

    # the lifetime announced to the client is the one actually signed into the token
    claims = jwt.decode(body["access_token"], get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    assert body["expires_in"] == 10 * 60
    assert claims["exp"] == pytest.approx(datetime.now(timezone.utc).timestamp() + 10 * 60, abs=5)


async def test_logging_in_changes_nothing_in_the_user_store(async_client, users_db):
    before = users_db.all()

    await login(async_client)

    assert users_db.all() == before  # no counters, no "last login", no rehash


async def test_the_oauth2_scope_field_cannot_widen_a_session(async_client):
    token = (await login(async_client, BOB, scope="admin superuser")).json()["access_token"]

    assert set(jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])) == {"user_id", "exp"}
    assert (await async_client.get("/users", headers=bearer(token))).status_code == 403  # still only a user


# --- EDGE CASES --------------------------------------------------------------------------------------


@pytest.mark.parametrize("spelling", [ALICE.upper(), f"  {ALICE}  ", "Alice@Example.COM", f"\t{ALICE}\n"])
async def test_the_email_is_matched_ignoring_case_and_surrounding_spaces(async_client, spelling):
    response = await login(async_client, spelling)

    assert response.status_code == 200
    assert decode_access_token(response.json()["access_token"]) == uuid_of(ALICE)


@pytest.mark.parametrize(
    "bad", ["alice", "alice@example", "alice@example.com.", "alice+tag@example.com", "xalice@example.com", "alice@example.org",
            "lice@example.com", "alice@@example.com", "alice @example.com"],
)
async def test_any_other_email_is_a_different_account(async_client, bad):
    assert (await login(async_client, bad)).status_code == 401


@pytest.mark.parametrize(
    "attempt",
    [PASSWORD.upper(), f" {PASSWORD}", f"{PASSWORD} ", PASSWORD[:-1], PASSWORD + "x"],
    ids=["case", "leading", "trailing", "prefix", "suffix"],
)
async def test_the_password_has_to_match_exactly(async_client, attempt):
    response = await login(async_client, ALICE, attempt)

    assert response.status_code == 401
    assert auth_service.authenticate(ALICE, attempt) is None


@pytest.mark.parametrize("form", [{}, {"username": ALICE}, {"password": PASSWORD}, {"username": "", "password": ""}])
async def test_a_login_without_both_credentials_never_yields_a_session(async_client, form):
    response = await async_client.post("/auth/login", data=form)

    assert not response.is_success
    assert "access_token" not in response.text


@pytest.mark.parametrize("username", ["   ", "\t", " " * 500])
async def test_a_blank_username_is_a_plain_failed_login(async_client, username):
    assert (await login(async_client, username)).status_code == 401


async def test_a_blank_password_is_a_plain_failed_login(async_client):
    assert (await login(async_client, ALICE, "   ")).status_code == 401


async def test_one_users_password_never_opens_another_account(async_client):
    await async_client.post("/users", json={"email": "dora@example.com", "password": "dora-own-password"})

    assert (await login(async_client, "dora@example.com", PASSWORD)).status_code == 401  # the seeded users' password
    assert (await login(async_client, ALICE, "dora-own-password")).status_code == 401
    assert (await login(async_client, "dora@example.com", "dora-own-password")).status_code == 200


@pytest.mark.parametrize(
    "username",
    ["' OR '1'='1", "alice@example.com' --", '{"$ne": null}', "$ne", "*", "%", ".*", "alice@example.com\x00", "a" * 10_000,
     "<script>alert(1)</script>"],
)
async def test_hostile_usernames_are_just_wrong_emails(async_client, username):
    assert (await login(async_client, username)).status_code == 401


@pytest.mark.parametrize("password", ["' OR '1'='1", "x" * 100, "x" * 100_000, "é" * 100, "pass\x00word", PASSWORD + "\x00"])
async def test_hostile_or_oversized_passwords_are_a_refusal_not_an_error(async_client, password):
    assert (await login(async_client, ALICE, password)).status_code == 401


# --- FAILURE MODES -----------------------------------------------------------------------------------


async def test_unknown_email_wrong_password_and_deactivated_account_look_exactly_alike(async_client, users_db):
    # Arrange: carol's account is switched off, her password is still the right one
    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)

    # Act
    unknown = outcome(await login(async_client, "ghost@example.com"))
    answers = [
        outcome(await login(async_client, ALICE, "wrong-password")),
        outcome(await login(async_client, CAROL)),  # right password, switched off
        outcome(await login(async_client, CAROL, "wrong-password")),
        outcome(await login(async_client, ALICE, "x" * 100)),
        outcome(await login(async_client, ALICE, "pass\x00word")),
    ]

    # Assert: no difference an attacker could use to learn which accounts exist or are switched off
    assert unknown[0] == 401
    assert all(answer == unknown for answer in answers)
    assert auth_service.authenticate(CAROL, PASSWORD) is None


async def test_an_unknown_email_still_pays_for_a_password_check(async_client, monkeypatch):
    # Arrange: spy on the bcrypt verification
    checked_against: list[str] = []
    real_verify = auth_service.verify_password

    def spy(password, hashed):
        checked_against.append(hashed)
        return real_verify(password, hashed)

    monkeypatch.setattr(auth_service, "verify_password", spy)

    # Act
    await login(async_client, "ghost@example.com")
    unknown_checks = list(checked_against)
    checked_against.clear()
    await login(async_client, ALICE, "wrong-password")

    # Assert: same work as for a real account, so response time does not reveal which emails are registered
    assert len(unknown_checks) == 1 and unknown_checks[0].startswith("$2b$")
    assert len(checked_against) == 1


async def test_a_refusal_never_names_the_account_or_the_reason(async_client, users_db):
    users_db.update({"is_active": False}, lambda doc: doc["email"] == BOB)

    for email, password in (("ghost@example.com", PASSWORD), (ALICE, "nope"), (BOB, PASSWORD)):
        text = (await login(async_client, email, password)).text.lower()
        assert not any(word in text for word in ("inactive", "disabled", "not found", "exist"))
        assert email not in text


async def test_a_refused_login_leaves_no_trace_in_the_store(async_client, users_db):
    before = users_db.all()

    await login(async_client, ALICE, "wrong-password")
    await login(async_client, "ghost@example.com")

    assert users_db.all() == before


async def test_validation_errors_never_echo_the_password_back(async_client):
    secret = "S3cr3t-Value-That-Must-Not-Leak"

    for form in ({"password": secret}, {"username": "", "password": secret}):
        response = await async_client.post("/auth/login", data=form)
        assert not response.is_success
        assert secret not in response.text


async def test_a_deactivated_account_is_refused_until_it_is_reactivated(async_client, users_db):
    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)
    assert (await login(async_client, CAROL)).status_code == 401

    users_db.update({"is_active": True}, lambda doc: doc["email"] == CAROL)

    assert (await login(async_client, CAROL)).status_code == 200


async def test_a_deleted_account_can_no_longer_log_in(async_client, users_db):
    assert (await login(async_client, CAROL)).status_code == 200
    users_db.remove(lambda doc: doc["email"] == CAROL)

    assert (await login(async_client, CAROL)).status_code == 401


async def test_a_misconfigured_token_lifetime_never_yields_a_token(monkeypatch):
    """A bad ACCESS_TOKEN_EXPIRE_MINUTES must fail the login, not silently issue tokens that never expire."""
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "0")

    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://testserver") as client:
        response = await login(client)

    assert not response.is_success
    assert "access_token" not in response.text
