"""CRUD checks for /users: credentials and account state only, hashed at rest, owner-or-admin changes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from auth import service as auth_service
from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from main import app
from users import service as users_service
from users.schemas import UserCreate, UserUpdate

NEW = {"email": "nuevo@example.com", "password": "s3cret-pass!"}

PUBLIC_FIELDS = {"id", "email", "is_active", "role", "created_at"}


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def set_active(client, user_id, active):
    """An admin (ALICE) switches an account on or off."""
    return client.put(f"/users/{user_id}", json={"is_active": active}, headers=headers_for(ALICE))


def login(client, email, password):
    return client.post("/auth/login", data={"username": email, "password": password})


# --- create ------------------------------------------------------------------


def test_create_stores_a_hash_and_a_uuid_and_the_user_can_log_in(client, users_db):
    created = client.post("/users", json={**NEW, "email": "  Nuevo@Example.COM "}, headers=headers_for(ALICE))
    assert created.status_code == 201
    body = created.json()
    assert set(body) == PUBLIC_FIELDS | {"message"} and body["email"] == "nuevo@example.com"
    assert body["is_active"] is True and body["role"] == "user"  # active at once; the API can't grant a role
    assert "s3cret-pass!" not in created.text

    stored = users_db.get(doc_id=4)
    assert stored["id"] == body["id"]
    assert set(stored) == PUBLIC_FIELDS | {"hashed_password"}
    assert stored["hashed_password"].startswith("$2") and NEW["password"] not in str(stored)
    assert login(client, "NUEVO@example.com", NEW["password"]).status_code == 200


def test_create_rejects_duplicates_and_bad_input(client):
    h = headers_for(ALICE)
    assert client.post("/users", json={**NEW, "email": ALICE.upper()}, headers=h).status_code == 409
    for bad in ({"email": "not-an-email"}, {"email": ""}, {"password": "short"}, {"password": "é" * 40},
                {"role": "admin"}, {"username": "x"}):
        assert client.post("/users", json={**NEW, **bad}, headers=h).status_code == 422, bad
    assert client.post("/users", json={"email": NEW["email"]}, headers=h).status_code == 422
    assert len(client.get("/users", headers=h).json()) == 3


def test_validation_errors_never_echo_the_password(client):
    secret = "tiny"
    for path, payload in [("/users", {"email": NEW["email"], "password": secret}),
                          ("/users", {"email": "bad", "password": secret})]:
        response = client.post(path, json=payload, headers=headers_for(ALICE))
        assert response.status_code == 422 and secret not in response.text
    response = client.put(f"/users/{uuid_of(ALICE)}", json={"password": secret, "current_password": PASSWORD},
                            headers=headers_for(ALICE))
    assert response.status_code == 422 and secret not in response.text and PASSWORD not in response.text


# --- read --------------------------------------------------------------------


def test_admins_list_and_get_users_and_only_the_public_fields_show(client):
    h = headers_for(ALICE)
    listing = client.get("/users", headers=h)
    assert {u["email"] for u in listing.json()} == {ALICE, BOB, CAROL}
    assert all(set(u) == PUBLIC_FIELDS for u in listing.json())
    assert "hash" not in listing.text and "$2" not in listing.text
    one = client.get(f"/users/{uuid_of(CAROL)}", headers=h)
    assert one.json()["id"] == str(uuid_of(CAROL)) and one.json()["email"] == CAROL
    assert client.get(f"/users/{uuid4()}", headers=h).status_code == 404
    assert client.get("/users/1", headers=h).status_code == 422  # ids are uuids


def test_a_user_reads_only_their_own_account(client):
    h = headers_for(BOB)
    own = client.get(f"/users/{uuid_of(BOB)}", headers=h)
    assert own.status_code == 200 and set(own.json()) == PUBLIC_FIELDS
    for url in (f"/users/{uuid_of(CAROL)}", f"/users/{uuid_of(ALICE)}", f"/users/{uuid4()}", "/users"):
        res = client.get(url, headers=h)
        assert res.status_code == 403, url  # 403 (not 404) even for unknown ids: no probing for accounts
        assert CAROL not in res.text and ALICE not in res.text


# --- update ------------------------------------------------------------------


def test_owner_changes_email_with_the_current_password(client):
    h = headers_for(ALICE)
    url = f"/users/{uuid_of(ALICE)}"
    res = client.put(url, json={"email": "Alice.New@Example.com", "current_password": PASSWORD}, headers=h)
    assert res.status_code == 200
    assert res.json()["id"] == str(uuid_of(ALICE)) and res.json()["email"] == "alice.new@example.com"
    assert login(client, ALICE, PASSWORD).status_code == 401
    assert login(client, "alice.new@example.com", PASSWORD).status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 200  # same uuid, same session


def test_owner_changes_password(client, users_db):
    old = headers_for(ALICE)
    res = client.put(f"/users/{uuid_of(ALICE)}", json={"password": "brand-new-pass", "current_password": PASSWORD}, headers=old)
    assert res.status_code == 200 and "brand-new-pass" not in res.text
    assert login(client, ALICE, PASSWORD).status_code == 401
    assert login(client, ALICE, "brand-new-pass").status_code == 200
    stored = next(d for d in users_db.all() if d["email"] == ALICE)
    assert stored["hashed_password"].startswith("$2") and "brand-new-pass" not in str(stored)


def test_update_needs_the_right_current_password(client):
    h, url = headers_for(ALICE), f"/users/{uuid_of(ALICE)}"
    assert client.put(url, json={"password": "brand-new-pass"}, headers=h).status_code == 422
    wrong = client.put(url, json={"password": "brand-new-pass", "current_password": "nope"}, headers=h)
    assert wrong.status_code == 400
    assert login(client, ALICE, PASSWORD).status_code == 200  # unchanged
    assert login(client, ALICE, "brand-new-pass").status_code == 401


def test_update_conflicts_and_validation(client):
    h, url = headers_for(ALICE), f"/users/{uuid_of(ALICE)}"
    assert client.put(url, json={"email": BOB, "current_password": PASSWORD}, headers=h).status_code == 409
    assert client.put(url, json={"email": ALICE, "current_password": PASSWORD}, headers=h).status_code == 200
    assert client.put(url, json={}, headers=h).status_code == 200  # no-op
    for bad in ({"email": "nope", "current_password": PASSWORD}, {"password": "x", "current_password": PASSWORD},
                {"id": str(uuid4())}, {"is_active": None}, {"role": None}, {"email": None}, {"role": "root"}):
        assert client.put(url, json=bad, headers=h).status_code == 422, bad


def test_a_regular_user_cannot_change_someone_elses_account(client):
    url = f"/users/{uuid_of(CAROL)}"
    res = client.put(url, json={"email": "x@example.com", "current_password": PASSWORD}, headers=headers_for(BOB))
    assert res.status_code == 403
    assert login(client, CAROL, PASSWORD).status_code == 200
    assert client.put(f"/users/{uuid4()}", json={}, headers=headers_for(BOB)).status_code == 403


# --- delete ------------------------------------------------------------------


def test_owner_deletes_their_account_and_the_token_stops_working(client):
    h = headers_for(BOB)
    assert client.delete(f"/users/{uuid_of(BOB)}", headers=h).status_code == 204
    assert client.get(f"/users/{uuid_of(BOB)}", headers=headers_for(ALICE)).status_code == 404
    assert client.get("/auth/me", headers=h).status_code == 401
    assert login(client, BOB, PASSWORD).status_code == 401


def test_a_regular_user_cannot_delete_someone_elses_account(client):
    assert client.delete(f"/users/{uuid_of(CAROL)}", headers=headers_for(BOB)).status_code == 403
    assert len(client.get("/users", headers=headers_for(ALICE)).json()) == 3


def test_the_last_user_cannot_be_deleted(client, users_db):
    users_db.remove(lambda d: d["email"] in (BOB, CAROL))
    assert client.delete(f"/users/{uuid_of(ALICE)}", headers=headers_for(ALICE)).status_code == 409
    assert len(users_db) == 1


# --- bootstrap ---------------------------------------------------------------


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


# --- account state: is_active, role, created_at ----------------------------------


def test_new_sign_ups_are_active_users_with_a_creation_date(client, users_db):
    client.post("/users", json=NEW, headers=headers_for(ALICE))
    stored = users_db.get(doc_id=4)
    assert stored["is_active"] is True and stored["role"] == "user"
    created_at = datetime.fromisoformat(stored["created_at"])
    assert created_at.tzinfo is not None and abs(datetime.now(timezone.utc) - created_at) < timedelta(minutes=1)


def test_a_deactivated_user_cannot_log_in_and_loses_the_session(client, users_db):
    h = headers_for(BOB)
    assert client.get("/auth/me", headers=h).status_code == 200
    users_db.update({"is_active": False}, lambda d: d["email"] == BOB)
    assert client.get("/auth/me", headers=h).status_code == 401
    wrong = login(client, BOB, "wrong-password-1")
    inactive = login(client, BOB, PASSWORD)  # right password, inactive account: same answer as a wrong one
    assert inactive.status_code == 401 and inactive.json() == wrong.json()
    users_db.update({"is_active": True}, lambda d: d["email"] == BOB)
    assert login(client, BOB, PASSWORD).status_code == 200


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


# --- service layer ---------------------------------------------------------------


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


# --- POST with an initial profile --------------------------------------------------


def test_post_creates_the_linked_profile_with_the_initial_data(client, users_db, profiles_db):
    body = {**NEW, "name": "  Nuria Nuevo ", "phone": "+34 600 111 222", "address": " C/ Sol 3, Sevilla "}
    created = client.post("/users", json=body, headers=headers_for(BOB))
    assert created.status_code == 201
    assert set(created.json()) == PUBLIC_FIELDS | {"message"}  # the profile data is not part of User...
    stored = users_db.get(doc_id=4)
    assert set(stored) == PUBLIC_FIELDS | {"hashed_password"}  # ...nor stored in it
    profile = client.get(f"/profiles/{created.json()['id']}", headers=headers_for(ALICE)).json()
    assert profile == {
        "id": profile["id"], "user_id": created.json()["id"], "name": "Nuria Nuevo", "contact_email": None,
        "phone": "+34 600 111 222", "address": "C/ Sol 3, Sevilla",
    }
    assert len(profiles_db) == 4


def test_post_without_profile_data_still_creates_a_default_profile(client):
    created = client.post("/users", json=NEW, headers=headers_for(BOB)).json()
    profile = client.get(f"/profiles/{created['id']}", headers=headers_for(ALICE)).json()
    assert profile["name"] == "nuevo" and profile["phone"] is None and profile["address"] is None


@pytest.mark.parametrize("bad", [{"name": ""}, {"phone": "call me"}, {"address": "x" * 201}, {"role": "admin"}])
def test_post_rejects_bad_profile_data_and_creates_nothing(client, users_db, profiles_db, bad):
    assert client.post("/users", json={**NEW, **bad}, headers=headers_for(BOB)).status_code == 422
    assert len(users_db) == 3 and len(profiles_db) == 3


# --- PUT: owner or admin, role for admins only --------------------------------------


def test_an_admin_can_change_another_users_email_without_their_password(client):
    res = client.put(f"/users/{uuid_of(BOB)}", json={"email": "bob.new@example.com"}, headers=headers_for(ALICE))
    assert res.status_code == 200 and res.json()["email"] == "bob.new@example.com"
    assert login(client, "bob.new@example.com", PASSWORD).status_code == 200


def test_an_admin_editing_their_own_email_still_needs_their_password(client):
    url = f"/users/{uuid_of(ALICE)}"
    assert client.put(url, json={"email": "a2@example.com"}, headers=headers_for(ALICE)).status_code == 422
    ok = client.put(url, json={"email": "a2@example.com", "current_password": PASSWORD}, headers=headers_for(ALICE))
    assert ok.status_code == 200


def test_only_an_admin_can_change_a_role(client, users_db):
    url = f"/users/{uuid_of(BOB)}"
    assert client.put(url, json={"role": "admin"}, headers=headers_for(BOB)).status_code == 403  # not even their own
    assert client.put(url, json={"role": "admin"}, headers=headers_for(CAROL)).status_code == 403
    promoted = client.put(url, json={"role": "admin"}, headers=headers_for(ALICE))
    assert promoted.status_code == 200 and promoted.json()["role"] == "admin"
    assert users_db.get(lambda d: d["email"] == BOB)["role"] == "admin"
    # ...and the new admin can now act on others too
    assert client.put(f"/users/{uuid_of(CAROL)}", json={"email": "c2@example.com"}, headers=headers_for(BOB)).status_code == 200


def test_an_admin_cannot_change_someone_elses_password(client):
    res = client.put(f"/users/{uuid_of(BOB)}", json={"password": "hijacked-pass"}, headers=headers_for(ALICE))
    assert res.status_code == 403
    assert login(client, BOB, PASSWORD).status_code == 200


def test_put_answers_404_for_an_admin_targeting_a_missing_user(client):
    assert client.put(f"/users/{uuid4()}", json={"role": "user"}, headers=headers_for(ALICE)).status_code == 404


def test_the_last_admin_cannot_be_demoted_but_can_once_there_is_another(client):
    url = f"/users/{uuid_of(ALICE)}"
    assert client.put(url, json={"role": "user"}, headers=headers_for(ALICE)).status_code == 409
    client.put(f"/users/{uuid_of(BOB)}", json={"role": "admin"}, headers=headers_for(ALICE))
    assert client.put(url, json={"role": "user"}, headers=headers_for(ALICE)).json()["role"] == "user"


# --- DELETE: owner or admin, profile goes too ---------------------------------------


def test_an_admin_can_delete_another_user_and_their_profile(client, users_db, profiles_db):
    assert client.delete(f"/users/{uuid_of(CAROL)}", headers=headers_for(ALICE)).status_code == 204
    assert len(users_db) == 2 and len(profiles_db) == 2
    assert client.get(f"/profiles/{uuid_of(CAROL)}", headers=headers_for(ALICE)).status_code == 404
    assert client.delete(f"/users/{uuid_of(CAROL)}", headers=headers_for(ALICE)).status_code == 404


def test_the_last_admin_cannot_be_deleted(client, users_db):
    assert client.delete(f"/users/{uuid_of(ALICE)}", headers=headers_for(ALICE)).status_code == 409
    assert len(users_db) == 3


# --- public sign-up (POST /users) ---------------------------------------------------


def test_sign_up_needs_no_session_and_can_log_in_straight_away(client, users_db):
    email = "signup@example.com"
    res = client.post("/users", json={"email": email, "password": "s3cret-pass!", "name": "Sara"})
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "user" and body["is_active"] is True and "sign in now" in body["message"]
    assert "password" not in res.text and "hash" not in res.text
    assert len(users_db) == 4
    logged_in = login(client, email, "s3cret-pass!")
    assert logged_in.status_code == 200
    token = logged_in.json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert (me["email"], me["role"], me["profile"]["name"]) == (email, "user", "Sara")


def test_sign_up_cannot_grant_a_role_or_reuse_an_email(client, users_db):
    assert client.post("/users", json={**NEW, "role": "admin"}).status_code == 422
    assert client.post("/users", json={**NEW, "is_active": True}).status_code == 422
    assert client.post("/users", json={**NEW, "email": ALICE}).status_code == 409
    assert len(users_db) == 3


def test_only_an_admin_can_activate_or_deactivate_accounts(client):
    new = client.post("/users", json=NEW).json()
    url = f"/users/{new['id']}"
    for who in (BOB, CAROL):  # regular users can't switch anyone off
        assert client.put(url, json={"is_active": False}, headers=headers_for(who)).status_code == 403
    token = login(client, NEW["email"], NEW["password"]).json()["access_token"]
    mine = {"Authorization": f"Bearer {token}"}
    assert client.put(url, json={"is_active": False}, headers=mine).status_code == 403  # not even their own account
    off = set_active(client, new["id"], False)
    assert off.status_code == 200 and off.json()["is_active"] is False
    assert client.get("/auth/me", headers=mine).status_code == 401  # deactivating kills the session
    wrong = login(client, NEW["email"], "wrong-password-1")
    inactive = login(client, NEW["email"], NEW["password"])  # same 401 as a wrong password: reveals nothing
    assert inactive.status_code == 401 and inactive.json() == wrong.json()
    assert client.get("/users", headers=headers_for(ALICE)).json()  # and it is visible to admins in the listing
    assert set_active(client, new["id"], True).status_code == 200  # only an admin switches it back on
    assert login(client, NEW["email"], NEW["password"]).status_code == 200


def test_the_last_active_admin_cannot_be_deactivated_demoted_or_deleted(client, users_db):
    url = f"/users/{uuid_of(ALICE)}"
    assert client.put(url, json={"is_active": False}, headers=headers_for(ALICE)).status_code == 409
    assert client.put(url, json={"role": "user"}, headers=headers_for(ALICE)).status_code == 409
    assert client.delete(url, headers=headers_for(ALICE)).status_code == 409
    # a second admin that is inactive doesn't count as a spare
    client.put(f"/users/{uuid_of(BOB)}", json={"role": "admin", "is_active": False}, headers=headers_for(ALICE))
    assert users_db.get(lambda d: d["email"] == BOB)["role"] == "admin"
    assert client.put(url, json={"is_active": False}, headers=headers_for(ALICE)).status_code == 409
    client.put(f"/users/{uuid_of(BOB)}", json={"is_active": True}, headers=headers_for(ALICE))
    assert client.put(url, json={"is_active": False}, headers=headers_for(ALICE)).status_code == 200


def test_a_signed_up_user_gets_403_on_other_peoples_accounts_and_401_without_a_token(client):
    client.post("/users", json=NEW)
    token = login(client, NEW["email"], NEW["password"]).json()["access_token"]
    mine = {"Authorization": f"Bearer {token}"}
    other = f"/users/{uuid_of(ALICE)}"
    assert client.put(other, json={"email": "x@example.com", "current_password": NEW["password"]}, headers=mine).status_code == 403
    assert client.delete(other, headers=mine).status_code == 403
    assert client.put(other, json={"email": "x@example.com"}).status_code == 401
    assert client.get("/users").status_code == 401 and client.get(other).status_code == 401


# --- role values, hashing at rest ---------------------------------------------------


def test_role_accepts_only_admin_manager_or_user(client, users_db):
    url = f"/users/{uuid_of(BOB)}"
    for role in ("manager", "admin", "user"):
        res = client.put(url, json={"role": role}, headers=headers_for(ALICE))
        assert res.status_code == 200 and res.json()["role"] == role
        assert users_db.get(lambda d: d["email"] == BOB)["role"] == role
    for bad in ("root", "superuser", "Admin", "", "ADMIN", 1, ["admin"]):
        assert client.put(url, json={"role": bad}, headers=headers_for(ALICE)).status_code == 422, bad
    assert users_db.get(lambda d: d["email"] == BOB)["role"] == "user"  # nothing invalid was stored


def test_a_manager_has_no_admin_powers(client):
    client.put(f"/users/{uuid_of(BOB)}", json={"role": "manager"}, headers=headers_for(ALICE))
    h = headers_for(BOB)
    assert client.put(f"/users/{uuid_of(CAROL)}", json={"role": "manager"}, headers=h).status_code == 403
    assert client.put(f"/users/{uuid_of(CAROL)}", json={"email": "c@example.com"}, headers=h).status_code == 403
    assert client.delete(f"/users/{uuid_of(CAROL)}", headers=h).status_code == 403
    assert client.get("/auth/me", headers=h).json()["role"] == "manager"


def test_new_users_default_to_user_whatever_the_caller_sends(client, users_db):
    for extra in ({}, {"role": "manager"}, {"role": "admin"}):
        client.post("/users", json={**NEW, "email": f"n{len(extra)}{extra.get('role', '')}@example.com", **extra})
    assert [d["role"] for d in users_db.all()[3:]] == ["user"]  # only the request without a role was accepted


def test_the_password_never_reaches_the_database_in_plain_text(client, users_db):
    from pathlib import Path

    from passlib.hash import bcrypt

    secret = "very-secret-pass-77"
    client.post("/users", json={**NEW, "password": secret})
    stored = users_db.get(doc_id=4)
    assert stored["hashed_password"].startswith("$2b$") and bcrypt.verify(secret, stored["hashed_password"])
    assert "password" not in {k for k in stored if k != "hashed_password"}
    assert secret not in Path(users_db.storage._handle.name).read_text()  # not in the file either
    # a password change re-hashes with a fresh salt and keeps the plain text out too
    client.put(f"/users/{uuid_of(ALICE)}", json={"password": "another-secret-88", "current_password": PASSWORD},
               headers=headers_for(ALICE))
    text = Path(users_db.storage._handle.name).read_text()
    assert "another-secret-88" not in text and PASSWORD not in text


# --- user directory (GET /users/directory) -------------------------------------------


def test_any_session_gets_a_directory_with_only_id_and_name(client):
    for who in (BOB, ALICE):  # a regular user and an admin see the same thing
        res = client.get("/users/directory", headers=headers_for(who))
        assert res.status_code == 200
        assert res.json() == [{"user_id": str(uuid_of(e)), "name": e.split("@")[0]} for e in (ALICE, BOB, CAROL)]
    assert "@" not in res.text and "role" not in res.text and "hash" not in res.text


def test_directory_needs_a_token_and_is_not_parsed_as_a_user_id(client):
    assert client.get("/users/directory").status_code == 401
    assert client.get("/users/directory", headers=headers_for(BOB)).status_code == 200  # not a 422 uuid error
    assert client.get("/users/not-a-uuid", headers=headers_for(BOB)).status_code == 422  # /{user_id} still wants a uuid


def test_directory_shows_profile_names_sorted_and_hides_inactive_accounts(client, users_db):
    client.put("/profiles/me", json={"name": "Zoe"}, headers=headers_for(ALICE))
    client.put("/profiles/me", json={"name": "ana"}, headers=headers_for(CAROL))
    pat = client.post("/users", json={**NEW, "name": "Pat"}).json()  # a sign-up is listed at once
    names = [e["name"] for e in client.get("/users/directory", headers=headers_for(BOB)).json()]
    assert names == ["ana", "bob", "Pat", "Zoe"]  # case-insensitive order
    set_active(client, pat["id"], False)
    names = [e["name"] for e in client.get("/users/directory", headers=headers_for(BOB)).json()]
    assert "Pat" not in names
    users_db.update({"is_active": False}, lambda d: d["email"] == CAROL)
    assert "ana" not in [e["name"] for e in client.get("/users/directory", headers=headers_for(BOB)).json()]
