"""The session's own account (``GET /auth/me``): who the token says you are, with the profile that goes with the account.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP call per
test through ``async_client``. What is asserted is whose data comes back and how it follows the stores, not how the JSON is
shaped. How a token is judged (signature, expiry, forged claims) is tested once for every route in ``test_session.py`` and
``test_token.py``; here it is only the answer of this endpoint.
"""

from __future__ import annotations

import pytest

from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from users import service as users_service

pytestmark = pytest.mark.anyio


async def me(client, email: str = ALICE):
    return await client.get("/auth/me", headers=headers_for(email))


# --- HAPPY PATH ---------------------------------------------------------------------------------------


async def test_it_returns_the_account_of_the_session_with_its_profile(async_client):
    response = await me(async_client, ALICE)

    assert response.status_code == 200
    body = response.json()
    assert (body["id"], body["email"], body["role"]) == (str(uuid_of(ALICE)), ALICE, "admin")
    assert body["profile"]["user_id"] == body["id"] and body["profile"]["name"] == "alice"


@pytest.mark.parametrize(("email", "role"), [(ALICE, "admin"), (BOB, "user"), (CAROL, "user")])
async def test_every_account_sees_its_own_data_and_nobody_elses(async_client, email, role):
    body = (await me(async_client, email)).json()

    assert (body["id"], body["email"], body["role"]) == (str(uuid_of(email)), email, role)
    assert body["profile"]["user_id"] == str(uuid_of(email))


async def test_the_password_and_its_hash_are_never_part_of_the_answer(async_client, users_db):
    stored_hash = users_service.get_doc_by_email(BOB)["hashed_password"]

    text = (await me(async_client, BOB)).text

    assert stored_hash not in text and PASSWORD not in text
    assert "password" not in text.lower() and "$2b$" not in text


# --- EDGE CASES --------------------------------------------------------------------------------------


async def test_a_profile_edit_shows_up_in_the_next_answer(async_client):
    await async_client.put("/profiles/me", json={"name": "Bob B.", "phone": "+34 600 000 000"}, headers=headers_for(BOB))

    profile = (await me(async_client, BOB)).json()["profile"]

    assert (profile["name"], profile["phone"]) == ("Bob B.", "+34 600 000 000")


async def test_a_missing_profile_is_recreated_once_and_never_duplicated(async_client, profiles_db):
    profiles_db.remove(lambda doc: doc["user_id"] == str(uuid_of(BOB)))

    first = await me(async_client, BOB)
    second = await me(async_client, BOB)

    assert first.status_code == second.status_code == 200
    assert first.json()["profile"]["name"] == "bob"  # the default name: the email's local part
    assert len([p for p in profiles_db.all() if p["user_id"] == str(uuid_of(BOB))]) == 1


async def test_changing_the_email_keeps_the_session_and_shows_the_new_address(async_client, users_db):
    headers = headers_for(BOB)
    users_db.update({"email": "bob.new@example.com"}, lambda doc: doc["email"] == BOB)

    response = await async_client.get("/auth/me", headers=headers)  # the same token as before

    assert response.json()["email"] == "bob.new@example.com"
    assert response.json()["id"] == str(uuid_of(BOB))


async def test_the_role_is_read_from_the_store_every_time(async_client, users_db):
    assert (await me(async_client, BOB)).json()["role"] == "user"

    users_db.update({"role": "manager"}, lambda doc: doc["email"] == BOB)

    assert (await me(async_client, BOB)).json()["role"] == "manager"


# --- FAILURE MODES -----------------------------------------------------------------------------------


async def test_without_a_session_there_is_no_answer_and_no_data(async_client):
    response = await async_client.get("/auth/me")

    assert response.status_code == 401
    assert ALICE not in response.text and "profile" not in response.text


@pytest.mark.parametrize("token", ["garbage", "a.b.c", ""], ids=["garbage", "three-parts", "empty"])
async def test_a_token_that_is_not_one_gets_nothing(async_client, token):
    response = await async_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


async def test_a_deactivated_account_gets_nothing_with_a_token_it_already_had(async_client, users_db):
    headers = headers_for(CAROL)
    assert (await async_client.get("/auth/me", headers=headers)).status_code == 200

    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)

    assert (await async_client.get("/auth/me", headers=headers)).status_code == 401


async def test_a_deleted_account_gets_nothing_with_a_token_it_already_had(async_client, users_db):
    headers = headers_for(CAROL)
    users_db.remove(lambda doc: doc["email"] == CAROL)

    assert (await async_client.get("/auth/me", headers=headers)).status_code == 401
