"""Account management (``/users``): listing, the directory, and reading, changing and deleting an account. Signing up
(``POST /users``) has its own module, ``test_register.py``.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP call per
test through ``async_client``, acting as one of the seeded users (alice = the only admin, bob and carol = users, all with
``PASSWORD``). Outcomes are asserted on the stores and on the domain (``users_service``, ``auth_service``): who may do what, what
is kept, what is refused, and what never changes. The status code is used only as "accepted" / "refused", except where the
distinction is the rule itself (a refusal for lack of permission is not a "not found").

Who may do what: reading, changing or deleting an account is for its owner or an admin; listing every account is for admins
only; the directory is for any session; only an admin changes a role or switches an account on or off; only the owner changes
their own password, and changing the email or the password needs the current password.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from auth import service as auth_service
from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from users import service as users_service

pytestmark = pytest.mark.anyio

NEW_PASSWORD = "a-brand-new-password"


async def act(client, method: str, path: str, *, as_: str = ALICE, json: dict | None = None):
    """The only HTTP call of this module: ``method path`` as the session of ``as_``."""
    return await client.request(method, path, json=json, headers=headers_for(as_))


def account(email: str) -> str:
    return f"/users/{uuid_of(email)}"


# --- HAPPY PATH ---------------------------------------------------------------------------------------


async def test_an_admin_lists_every_account(async_client):
    response = await act(async_client, "GET", "/users")

    assert response.status_code == 200
    assert {user["email"] for user in response.json()} == {ALICE, BOB, CAROL}


async def test_any_session_gets_the_directory_of_active_accounts_in_name_order(async_client):
    response = await act(async_client, "GET", "/users/directory", as_=CAROL)  # a plain user

    assert response.status_code == 200
    assert [entry["name"] for entry in response.json()] == ["alice", "bob", "carol"]
    assert {entry["user_id"] for entry in response.json()} == {str(uuid_of(e)) for e in (ALICE, BOB, CAROL)}


async def test_an_account_reads_its_own_data_and_an_admin_reads_anyones(async_client):
    own = await act(async_client, "GET", account(BOB), as_=BOB)
    others = await act(async_client, "GET", account(CAROL), as_=ALICE)

    assert (own.status_code, own.json()["email"]) == (200, BOB)
    assert (others.status_code, others.json()["email"]) == (200, CAROL)


async def test_the_owner_changes_their_email_with_the_current_password_and_the_session_survives(async_client):
    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"email": "bob.new@example.com", "current_password": PASSWORD})

    assert response.status_code == 200
    assert users_service.get_doc_by_email(BOB) is None
    assert users_service.get_doc_by_email("bob.new@example.com")["id"] == str(uuid_of(BOB))  # the same account, a new address
    assert auth_service.authenticate("bob.new@example.com", PASSWORD) is not None
    assert (await act(async_client, "GET", "/auth/me", as_=BOB)).status_code == 200  # the token it already had still works


async def test_the_owner_changes_their_password_and_only_the_new_one_logs_in(async_client):
    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"password": NEW_PASSWORD, "current_password": PASSWORD})

    assert response.status_code == 200
    assert auth_service.authenticate(BOB, NEW_PASSWORD) is not None
    assert auth_service.authenticate(BOB, PASSWORD) is None
    assert users_service.get_doc_by_email(BOB)["hashed_password"].startswith("$2b$")


async def test_an_admin_changes_another_accounts_role_and_switches_it_off_and_on(async_client):
    await act(async_client, "PUT", account(BOB), json={"role": "manager"})
    assert users_service.get_user(uuid_of(BOB)).role == "manager"

    await act(async_client, "PUT", account(BOB), json={"is_active": False})
    assert auth_service.authenticate(BOB, PASSWORD) is None  # switched off: it cannot log in

    await act(async_client, "PUT", account(BOB), json={"is_active": True})
    assert auth_service.authenticate(BOB, PASSWORD) is not None


async def test_an_account_deletes_itself_and_the_session_dies_with_it(async_client, users_db, profiles_db):
    response = await act(async_client, "DELETE", account(BOB), as_=BOB)

    assert response.status_code == 204
    assert users_service.get_doc_by_email(BOB) is None and len(users_db) == 2
    assert all(p["user_id"] != str(uuid_of(BOB)) for p in profiles_db.all())  # the profile goes with the account
    assert (await act(async_client, "GET", "/auth/me", as_=BOB)).status_code == 401


async def test_an_admin_deletes_another_account_and_its_profile(async_client, users_db, profiles_db):
    response = await act(async_client, "DELETE", account(CAROL))

    assert response.status_code == 204
    assert users_service.get_doc_by_email(CAROL) is None and len(users_db) == 2
    assert all(p["user_id"] != str(uuid_of(CAROL)) for p in profiles_db.all())


# --- EDGE CASES --------------------------------------------------------------------------------------


async def test_the_admin_list_includes_deactivated_accounts_but_the_directory_does_not(async_client, users_db):
    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)

    listed = {user["email"] for user in (await act(async_client, "GET", "/users")).json()}
    directory = {entry["name"] for entry in (await act(async_client, "GET", "/users/directory", as_=BOB)).json()}

    assert CAROL in listed
    assert directory == {"alice", "bob"}


async def test_the_directory_is_in_alphabetical_order_whatever_the_capitals(async_client, profiles_db):
    for email, name in ((ALICE, "zoe"), (BOB, "ana"), (CAROL, "Bruno")):  # a plain sort would put "Bruno" before "ana"
        profiles_db.update({"name": name}, lambda doc, e=email: doc["user_id"] == str(uuid_of(e)))

    names = [entry["name"] for entry in (await act(async_client, "GET", "/users/directory", as_=BOB)).json()]

    assert names == ["ana", "Bruno", "zoe"]


async def test_the_directory_reveals_nothing_but_who_is_who(async_client):
    text = (await act(async_client, "GET", "/users/directory", as_=BOB)).text

    assert not any(secret in text for secret in ("@", "$2b$", "hashed", "role", "is_active", "created_at"))


async def test_an_update_with_nothing_in_it_changes_nothing(async_client, users_db):
    before = users_db.all()

    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={})

    assert response.status_code == 200
    assert users_db.all() == before


async def test_a_new_email_is_stored_trimmed_and_lower_cased(async_client):
    await act(async_client, "PUT", account(BOB), as_=BOB, json={"email": "  Bob.Mixed@Example.COM ", "current_password": PASSWORD})

    assert users_service.get_doc_by_email("bob.mixed@example.com")["id"] == str(uuid_of(BOB))


async def test_sending_the_email_the_account_already_has_is_not_a_conflict(async_client):
    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"email": BOB.upper(), "current_password": PASSWORD})

    assert response.status_code == 200
    assert users_service.get_doc_by_email(BOB) is not None


async def test_an_admin_edits_another_accounts_email_without_knowing_its_password(async_client):
    response = await act(async_client, "PUT", account(BOB), json={"email": "bob.by.admin@example.com"})

    assert response.status_code == 200
    assert users_service.get_doc_by_email("bob.by.admin@example.com")["id"] == str(uuid_of(BOB))


async def test_an_admin_editing_their_own_email_still_needs_their_own_password(async_client, users_db):
    before = users_db.all()

    refused = await act(async_client, "PUT", account(ALICE), json={"email": "alice.new@example.com"})
    accepted = await act(async_client, "PUT", account(ALICE), json={"email": "alice.new@example.com", "current_password": PASSWORD})

    assert not refused.is_success and accepted.status_code == 200
    assert before != users_db.all()  # and only the second one changed something


async def test_the_last_admin_can_be_demoted_once_there_is_another_admin(async_client):
    await act(async_client, "PUT", account(BOB), json={"role": "admin"})

    response = await act(async_client, "PUT", account(ALICE), json={"role": "user"})

    assert response.status_code == 200
    assert users_service.get_user(uuid_of(ALICE)).role == "user"


async def test_the_email_of_a_deleted_account_can_be_registered_again_as_a_new_account(async_client):
    await act(async_client, "DELETE", account(CAROL))

    response = await async_client.post("/users", json={"email": CAROL, "password": "another-password"})

    assert response.status_code == 201
    assert response.json()["id"] != str(uuid_of(CAROL))  # the old identity does not come back


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize("role", ["user", "manager"])
async def test_listing_every_account_is_for_admins_only(async_client, users_db, role):
    users_db.update({"role": role}, lambda doc: doc["email"] == BOB)

    response = await act(async_client, "GET", "/users", as_=BOB)

    assert response.status_code == 403
    assert CAROL not in response.text  # nobody else's data came back with the refusal


async def test_an_account_cannot_read_another_and_the_answer_does_not_say_whether_it_exists(async_client):
    other = await act(async_client, "GET", account(CAROL), as_=BOB)
    unknown = await act(async_client, "GET", f"/users/{uuid4()}", as_=BOB)
    admin_unknown = await act(async_client, "GET", f"/users/{uuid4()}", as_=ALICE)

    assert (other.status_code, unknown.status_code) == (403, 403)  # no probing for accounts
    assert admin_unknown.status_code == 404  # an admin is allowed to know
    assert CAROL not in other.text


async def test_changing_the_email_or_the_password_needs_the_current_password(async_client, users_db):
    before = users_db.all()

    email = await act(async_client, "PUT", account(BOB), as_=BOB, json={"email": "bob.new@example.com"})
    password = await act(async_client, "PUT", account(BOB), as_=BOB, json={"password": NEW_PASSWORD})

    assert (email.status_code, password.status_code) == (422, 422)  # "missing", as opposed to "wrong" (400, below)
    assert users_db.all() == before


async def test_a_wrong_current_password_changes_nothing(async_client, users_db):
    before = users_db.all()

    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"password": NEW_PASSWORD, "current_password": "not-my-password"})

    assert response.status_code == 400  # "wrong", as opposed to "missing" (422, above)
    assert users_db.all() == before
    assert auth_service.authenticate(BOB, PASSWORD) is not None


@pytest.mark.parametrize("taken", [ALICE, ALICE.upper(), f"  {ALICE}  "], ids=["same", "upper", "padded"])
async def test_an_email_that_belongs_to_another_account_is_refused_in_any_spelling(async_client, users_db, taken):
    before = users_db.all()

    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"email": taken, "current_password": PASSWORD})

    assert response.status_code == 409
    assert users_db.all() == before


@pytest.mark.parametrize("change", [{"role": "admin"}, {"role": "manager"}, {"is_active": False}], ids=["admin", "manager", "off"])
async def test_only_an_admin_changes_a_role_or_switches_an_account_on_or_off(async_client, users_db, change):
    before = users_db.all()

    response = await act(async_client, "PUT", account(BOB), as_=BOB, json=change)  # bob tries it on himself

    assert response.status_code == 403
    assert users_db.all() == before


async def test_nobody_changes_someone_elses_password_not_even_an_admin(async_client):
    response = await act(async_client, "PUT", account(BOB), json={"password": NEW_PASSWORD, "current_password": PASSWORD})

    assert response.status_code == 403
    assert auth_service.authenticate(BOB, PASSWORD) is not None
    assert auth_service.authenticate(BOB, NEW_PASSWORD) is None


async def test_an_account_cannot_change_or_delete_another_unless_it_is_an_admin(async_client, users_db):
    before = users_db.all()

    changed = await act(async_client, "PUT", account(CAROL), as_=BOB, json={"email": "carol.hijacked@example.com"})
    deleted = await act(async_client, "DELETE", account(CAROL), as_=BOB)

    assert (changed.status_code, deleted.status_code) == (403, 403)
    assert users_db.all() == before


@pytest.mark.parametrize(
    "bad",
    [
        {"email": None},
        {"password": None},
        {"role": None},
        {"is_active": None},
        {"role": "root"},
        {"email": "not-an-email"},
        {"password": "short"},
        {"password": "x" * 73},
        {"password": "pass\x00word"},
        {"id": "00000000-0000-0000-0000-000000000000"},
        {"hashed_password": "x"},
        {"created_at": "2000-01-01T00:00:00Z"},
    ],
    ids=["null-email", "null-password", "null-role", "null-active", "bad-role", "bad-email", "short-password", "long-password",
         "nul-password", "client-id", "client-hash", "client-created"],
)
async def test_invalid_changes_never_reach_the_store(async_client, users_db, bad):
    before = users_db.all()

    response = await act(async_client, "PUT", account(ALICE), json={"current_password": PASSWORD, **bad})

    assert not response.is_success
    assert users_db.all() == before


@pytest.mark.parametrize(
    ("password", "accepted"),
    [("1234567", False), ("12345678", True), ("x" * 72, True), ("x" * 73, False), ("pass\x00word1", False)],
    ids=["7-chars", "8-chars", "72-bytes", "73-bytes", "nul-byte"],
)
async def test_a_new_password_must_be_8_to_72_bytes_without_nul_bytes(async_client, password, accepted):
    response = await act(async_client, "PUT", account(BOB), as_=BOB, json={"password": password, "current_password": PASSWORD})

    assert response.is_success is accepted
    assert (auth_service.authenticate(BOB, password) is not None) is accepted
    assert (auth_service.authenticate(BOB, PASSWORD) is not None) is not accepted  # the old one works exactly when nothing changed


async def test_a_manager_has_no_admin_powers_over_other_accounts(async_client, users_db):
    users_db.update({"role": "manager"}, lambda doc: doc["email"] == BOB)
    before = users_db.all()

    attempts = [
        await act(async_client, "PUT", account(CAROL), as_=BOB, json={"role": "manager"}),
        await act(async_client, "PUT", account(CAROL), as_=BOB, json={"email": "carol.hijacked@example.com"}),
        await act(async_client, "DELETE", account(CAROL), as_=BOB),
        await act(async_client, "GET", "/users", as_=BOB),
    ]

    assert [r.status_code for r in attempts] == [403, 403, 403, 403]
    assert users_db.all() == before


async def test_a_changed_password_never_reaches_the_users_file_in_plain_text(async_client, tmp_path):
    await act(async_client, "PUT", account(ALICE), json={"password": "another-secret-88", "current_password": PASSWORD})

    text = (tmp_path / "users-db.json").read_text()
    assert "another-secret-88" not in text and PASSWORD not in text  # re-hashed, and the old password is gone too


async def test_the_last_active_admin_cannot_be_demoted_switched_off_or_deleted(async_client, users_db):
    before = users_db.all()

    demoted = await act(async_client, "PUT", account(ALICE), json={"role": "user"})
    switched_off = await act(async_client, "PUT", account(ALICE), json={"is_active": False})
    deleted = await act(async_client, "DELETE", account(ALICE))

    assert (demoted.status_code, switched_off.status_code, deleted.status_code) == (409, 409, 409)
    assert users_db.all() == before  # the API can never lock itself out


async def test_the_last_remaining_account_cannot_be_deleted(async_client, users_db):
    await act(async_client, "DELETE", account(BOB))
    await act(async_client, "DELETE", account(CAROL))

    response = await act(async_client, "DELETE", account(ALICE))

    assert response.status_code == 409
    assert [doc["email"] for doc in users_db.all()] == [ALICE]


async def test_the_last_remaining_account_cannot_be_deleted_even_if_it_is_not_an_admin(async_client, users_db):
    users_db.remove(lambda doc: doc["email"] in (BOB, CAROL))
    users_db.update({"role": "user"}, lambda doc: doc["email"] == ALICE)  # a store left with one ordinary account

    response = await act(async_client, "DELETE", account(ALICE), as_=ALICE)

    assert response.status_code == 409
    assert [doc["email"] for doc in users_db.all()] == [ALICE]


async def test_an_unknown_account_is_not_found_for_an_admin_and_forbidden_for_everyone_else(async_client, users_db):
    before = users_db.all()
    ghost = f"/users/{uuid4()}"

    as_admin = [(await act(async_client, method, ghost, json=body)).status_code
                for method, body in (("GET", None), ("PUT", {"is_active": True}), ("DELETE", None))]
    as_user = [(await act(async_client, method, ghost, as_=BOB, json=body)).status_code
               for method, body in (("GET", None), ("PUT", {"is_active": True}), ("DELETE", None))]

    assert as_admin == [404, 404, 404]
    assert as_user == [403, 403, 403]
    assert users_db.all() == before


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [("GET", "/users", None), ("GET", "/users/directory", None), ("GET", f"/users/{uuid4()}", None),
     ("PUT", f"/users/{uuid4()}", {"is_active": False}), ("DELETE", f"/users/{uuid4()}", None)],
    ids=["list", "directory", "read", "update", "delete"],
)
async def test_every_account_route_needs_a_session_and_changes_nothing_without_one(async_client, users_db, method, path, body):
    before = users_db.all()

    response = await async_client.request(method, path, json=body)

    assert response.status_code == 401
    assert users_db.all() == before
