"""Sessions over the API: what a token gets you, when it stops, and that who you are and what you may do are read
from the user store on every request, never from the token.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; every
HTTP call goes through ``async_client``. ``GET /auth/me`` is the probe for "is this a session, and whose".
The token mechanics themselves (claims, signature, expiry arithmetic) are unit-tested in ``test_token.py``.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from auth.security import create_access_token
from conftest import (
    ALICE,
    BOB,
    CAROL,
    FAR_FUTURE,
    PASSWORD,
    bearer,
    headers_for,
    jwt_payload,
    jwt_segment,
    signed_token,
    uuid_of,
)

pytestmark = pytest.mark.anyio

# Protected routes of the auth / users / profiles domains that need nothing but a session.
PROTECTED = ["/auth/me", "/users/directory", "/profiles/me", "/users"]


async def login_token(client, email: str = ALICE, password: str = PASSWORD) -> str:
    response = await client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, "the fixture user could not log in"
    return response.json()["access_token"]


async def me(client, token: str):
    return await client.get("/auth/me", headers=bearer(token))


def outcome(response) -> tuple:
    """Everything an outside observer learns from an answer: if two refusals have the same outcome, they are alike."""
    return response.status_code, response.json()


# --- HAPPY PATH ---------------------------------------------------------------------------------------


@pytest.mark.parametrize("email", [ALICE, BOB, CAROL])
async def test_a_login_token_opens_a_session_as_that_account_and_nobody_else(async_client, email):
    response = await me(async_client, await login_token(async_client, email))

    assert response.status_code == 200
    assert response.json()["id"] == str(uuid_of(email))


async def test_two_logins_give_two_independent_sessions_and_neither_cancels_the_other(async_client):
    first, second, third = await login_token(async_client), await login_token(async_client, BOB), await login_token(async_client)

    assert (await me(async_client, first)).json()["email"] == ALICE
    assert (await me(async_client, second)).json()["email"] == BOB
    assert (await me(async_client, third)).json()["email"] == ALICE
    assert (await me(async_client, first)).status_code == 200  # issuing a newer token did not retire the older one


# --- EDGE CASES --------------------------------------------------------------------------------------


async def test_a_session_works_until_the_configured_lifetime_and_not_after(async_client, clock, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1")
    token = await login_token(async_client)

    clock(55)
    assert (await me(async_client, token)).status_code == 200
    clock(65)
    assert (await me(async_client, token)).status_code == 401


@pytest.mark.parametrize("url", PROTECTED)
async def test_an_expired_token_is_refused_on_every_protected_route(async_client, url):
    expired = signed_token({"user_id": str(uuid_of(ALICE)), "exp": datetime.now(timezone.utc) - timedelta(seconds=1)})
    live = signed_token({"user_id": str(uuid_of(ALICE)), "exp": FAR_FUTURE})

    assert (await async_client.get(url, headers=bearer(live))).status_code != 401  # control: same claims, not expired
    assert (await async_client.get(url, headers=bearer(expired))).status_code == 401


async def test_a_role_change_applies_to_the_same_token_at_once_in_both_directions(async_client, users_db):
    token = await login_token(async_client, BOB)
    assert (await async_client.get("/users", headers=bearer(token))).status_code == 403  # an ordinary user

    users_db.update({"role": "admin"}, lambda doc: doc["email"] == BOB)
    assert (await async_client.get("/users", headers=bearer(token))).status_code == 200  # promoted: no new login needed
    assert (await me(async_client, token)).json()["role"] == "admin"

    users_db.update({"role": "user"}, lambda doc: doc["email"] == BOB)
    assert (await async_client.get("/users", headers=bearer(token))).status_code == 403  # demoted: just as immediate


@pytest.mark.parametrize("role", ["user", "manager"])
async def test_admin_only_routes_refuse_every_non_admin_role(async_client, users_db, role):
    """``manager`` is stored but has no extra powers: it must not slip through the admin-only check."""
    users_db.update({"role": role}, lambda doc: doc["email"] == BOB)
    token = await login_token(async_client, BOB)

    assert (await async_client.get("/users", headers=bearer(token))).status_code == 403
    assert (await async_client.get("/profiles", headers=bearer(token))).status_code == 403
    assert (await async_client.get(f"/users/{uuid_of(CAROL)}", headers=bearer(token))).status_code == 403
    assert (await async_client.get("/users/directory", headers=bearer(token))).status_code == 200  # open to any session
    assert (await async_client.get("/users", headers=bearer(await login_token(async_client, ALICE)))).status_code == 200


async def test_deactivating_an_account_switches_its_sessions_off_and_reactivating_it_back_on(async_client, users_db):
    token = await login_token(async_client, CAROL)
    assert (await me(async_client, token)).status_code == 200

    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)
    assert (await me(async_client, token)).status_code == 401
    assert (await async_client.get("/users/directory", headers=bearer(token))).status_code == 401

    users_db.update({"is_active": True}, lambda doc: doc["email"] == CAROL)
    assert (await me(async_client, token)).status_code == 200


async def test_a_token_is_only_read_from_the_authorization_header(async_client):
    token = create_access_token(uuid_of(ALICE))

    assert (await async_client.get("/auth/me", params={"access_token": token, "token": token})).status_code == 401
    assert (await async_client.get("/auth/me", headers={"Cookie": f"access_token={token}"})).status_code == 401
    assert (await async_client.get("/auth/me", headers={"X-Access-Token": token})).status_code == 401


async def test_an_enormous_token_is_refused_not_a_crash(async_client):
    assert (await me(async_client, "a" * 100_000)).status_code == 401
    assert (await me(async_client, ".".join(["a" * 5000] * 20))).status_code == 401


# --- FAILURE MODES -----------------------------------------------------------------------------------


async def test_every_reason_for_refusing_a_token_gets_the_same_answer(async_client, users_db):
    # Arrange: one token per way of being invalid
    users_db.remove(lambda doc: doc["email"] == BOB)
    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)
    head, payload, signature = create_access_token(uuid_of(ALICE)).split(".")
    tokens = {
        "garbage": "garbage",
        "expired": signed_token({"user_id": str(uuid_of(ALICE)), "exp": datetime.now(timezone.utc) - timedelta(hours=1)}),
        "wrong-key": signed_token({"user_id": str(uuid_of(ALICE)), "exp": FAR_FUTURE}, key="x" * 40),
        "tampered": f"{head}.{jwt_segment(jwt_payload(payload) | {'user_id': str(uuid_of(CAROL))})}.{signature}",
        "deleted-account": create_access_token(uuid_of(BOB)),
        "deactivated-account": create_access_token(uuid_of(CAROL)),
        "unknown-account": signed_token({"user_id": "0" * 32, "exp": FAR_FUTURE}),
        "no-account-claim": signed_token({"exp": FAR_FUTURE}),
    }

    # Act
    answers = {reason: outcome(await me(async_client, token)) for reason, token in tokens.items()}

    # Assert: always a refusal, and nothing in the answer says why (nothing to probe accounts or keys with)
    assert {status for status, _ in answers.values()} == {401}
    assert len({repr(answer) for answer in answers.values()}) == 1, answers


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Basic YWxpY2U6cGFzcw=="}], ids=["no-credentials", "another-scheme"])
async def test_a_request_without_a_bearer_token_is_not_a_session(async_client, headers):
    assert (await async_client.get("/auth/me", headers=headers)).status_code == 401


async def test_a_users_signature_cannot_be_moved_onto_another_users_claims(async_client):
    """Privilege escalation attempt: take BOB's valid token, swap in ALICE's (admin) id, keep the signature."""
    head, payload, signature = create_access_token(uuid_of(BOB)).split(".")
    forged = f"{head}.{jwt_segment(jwt_payload(payload) | {'user_id': str(uuid_of(ALICE))})}.{signature}"

    assert (await me(async_client, f"{head}.{payload}.{signature}")).json()["email"] == BOB  # control
    assert (await me(async_client, forged)).status_code == 401
    assert (await async_client.get("/users", headers=bearer(forged))).status_code == 401


@pytest.mark.parametrize("alg", ["none", "None", "NONE"])
async def test_an_unsigned_token_for_an_admin_is_refused(async_client, alg):
    payload = jwt_segment({"user_id": str(uuid_of(ALICE)), "exp": FAR_FUTURE})
    header = jwt_segment({"alg": alg, "typ": "JWT"})

    assert (await me(async_client, f"{header}.{payload}.")).status_code == 401
    assert (await me(async_client, f"{header}.{payload}")).status_code == 401


async def test_a_token_signed_with_the_right_key_but_another_algorithm_is_refused(async_client):
    token = signed_token({"user_id": str(uuid_of(ALICE)), "exp": FAR_FUTURE}, algorithm="HS512")

    assert (await me(async_client, token)).status_code == 401


async def test_a_deleted_account_loses_its_token_and_a_new_account_with_the_same_email_is_someone_else(async_client):
    """The token carries the account's uuid, not the email: registering the email again does not revive it."""
    token = await login_token(async_client, CAROL)
    assert (await async_client.delete(f"/users/{uuid_of(CAROL)}", headers=headers_for(ALICE))).status_code == 204
    assert (await me(async_client, token)).status_code == 401

    created = await async_client.post("/users", json={"email": CAROL, "password": "another-password"})

    assert created.status_code == 201 and created.json()["id"] != str(uuid_of(CAROL))
    assert (await me(async_client, token)).status_code == 401  # the old, dead identity stays dead
    assert (await me(async_client, await login_token(async_client, CAROL, "another-password"))).json()["id"] == created.json()["id"]


async def test_one_users_session_never_reaches_another_users_data(async_client):
    token = await login_token(async_client, BOB)

    assert (await async_client.get(f"/users/{uuid_of(CAROL)}", headers=bearer(token))).status_code == 403
    assert (await async_client.get(f"/profiles/{uuid_of(CAROL)}", headers=bearer(token))).status_code == 403
    assert (await async_client.get("/users", headers=bearer(token))).status_code == 403
