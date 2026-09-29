"""Profile checks: one-to-one with User, display name and contact data live here."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from main import app
from profiles import service as profiles_service
from users import service as users_service
from users.schemas import UserCreate

NEW_USER = {"email": "nuevo.usuario@example.com", "password": "s3cret-pass!"}


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# --- created and deleted with the user -------------------------------------------


def test_creating_a_user_creates_exactly_one_profile_with_a_default_name(client, profiles_db):
    created = client.post("/users", json=NEW_USER, headers=headers_for(ALICE)).json()
    stored = [d for d in profiles_db.all() if d["user_uuid"] == created["user_uuid"]]
    assert len(profiles_db) == 4 and len(stored) == 1
    assert stored[0] == {
        "user_uuid": created["user_uuid"],
        "display_name": "nuevo.usuario",
        "contact_email": None,
        "phone": None,
    }
    assert client.get(f"/profiles/{created['user_uuid']}", headers=headers_for(BOB)).json()["display_name"] == "nuevo.usuario"


def test_deleting_a_user_deletes_their_profile(client, profiles_db):
    created = client.post("/users", json=NEW_USER, headers=headers_for(ALICE)).json()
    from auth.security import create_access_token

    own = {"Authorization": f"Bearer {create_access_token(created['user_uuid'])}"}
    assert len(profiles_db) == 4
    assert client.delete(f"/users/{created['user_uuid']}", headers=own).status_code == 204
    assert len(profiles_db) == 3 and created["user_uuid"] not in {d["user_uuid"] for d in profiles_db.all()}
    assert client.get(f"/profiles/{created['user_uuid']}", headers=headers_for(ALICE)).status_code == 404


def test_failed_profile_creation_leaves_no_user_behind(monkeypatch, users_db):
    def boom(*_):
        raise RuntimeError("disk full")

    monkeypatch.setattr(profiles_service, "ensure_profile", boom)
    with pytest.raises(RuntimeError):
        users_service.create_user(UserCreate(**NEW_USER))
    assert len(users_db) == 3  # only the seeded users


def test_sync_gives_every_user_a_profile_and_drops_orphans(users_db, profiles_db):
    profiles_db.truncate()  # users that predate the profiles module
    stranger = str(uuid4())
    profiles_db.insert({"user_uuid": stranger, "display_name": "ghost", "contact_email": None, "phone": None})
    users_service.sync_profiles()
    assert {d["user_uuid"] for d in profiles_db.all()} == {str(uuid_of(e)) for e in (ALICE, BOB, CAROL)}
    users_service.sync_profiles()  # idempotent
    assert len(profiles_db) == 3


# --- one-to-one -------------------------------------------------------------------


def test_repeated_reads_never_create_a_second_profile(client, profiles_db):
    h = headers_for(ALICE)
    for _ in range(3):
        assert client.get("/profiles/me", headers=h).status_code == 200
        assert client.patch(f"/profiles/{uuid_of(ALICE)}", json={}, headers=h).status_code == 200
    assert len(profiles_db) == 3
    assert len([d for d in profiles_db.all() if d["user_uuid"] == str(uuid_of(ALICE))]) == 1


def test_a_missing_profile_is_recreated_for_its_owner_and_never_duplicated(client, profiles_db):
    profiles_db.remove(lambda d: d["user_uuid"] == str(uuid_of(ALICE)))
    assert client.get(f"/profiles/{uuid_of(ALICE)}", headers=headers_for(BOB)).status_code == 404
    h = headers_for(ALICE)
    assert client.get("/profiles/me", headers=h).json()["display_name"] == "alice"
    profiles_db.remove(lambda d: d["user_uuid"] == str(uuid_of(ALICE)))
    res = client.patch(f"/profiles/{uuid_of(ALICE)}", json={"display_name": "Alice"}, headers=h)
    assert res.status_code == 200 and res.json()["display_name"] == "Alice"
    assert len([d for d in profiles_db.all() if d["user_uuid"] == str(uuid_of(ALICE))]) == 1


def test_profile_and_user_share_the_key_but_not_the_data(client, users_db, profiles_db):
    client.patch(f"/profiles/{uuid_of(ALICE)}", json={"display_name": "Alice A.", "phone": "+34 600 000 000"},
                 headers=headers_for(ALICE))
    user = next(d for d in users_db.all() if d["email"] == ALICE)
    profile = next(d for d in profiles_db.all() if d["user_uuid"] == user["user_uuid"])
    assert user["user_uuid"] == profile["user_uuid"]
    assert set(user) == {"user_uuid", "email", "password_hash"}  # nothing profile-like in User
    assert "password_hash" not in profile and "email" not in profile
    assert client.get(f"/users/{uuid_of(ALICE)}", headers=headers_for(ALICE)).json() == {
        "user_uuid": str(uuid_of(ALICE)), "email": ALICE}  # ... and none in the User API either
    assert client.get("/auth/me", headers=headers_for(ALICE)).json().keys() == {"user_uuid", "email"}


# --- read -------------------------------------------------------------------------


def test_read_own_and_others_profiles(client):
    h = headers_for(BOB)
    me = client.get("/profiles/me", headers=h).json()
    assert me == {"user_uuid": str(uuid_of(BOB)), "display_name": "bob", "contact_email": None, "phone": None}
    assert client.get(f"/api/profiles/{uuid_of(ALICE)}", headers=h).json()["display_name"] == "alice"
    names = {p["display_name"] for p in client.get("/profiles", headers=h).json()}
    assert {"bob", "carol"} <= names
    assert client.get(f"/profiles/{uuid4()}", headers=h).status_code == 404
    assert client.get("/profiles/1", headers=h).status_code == 422


# --- update -----------------------------------------------------------------------


def test_owner_edits_display_name_and_contact_data(client):
    h, url = headers_for(ALICE), f"/profiles/{uuid_of(ALICE)}"
    res = client.patch(url, json={"display_name": "  Alice Álvarez ", "contact_email": "Alice.Work@Example.COM",
                                  "phone": "+34 600 123 456"}, headers=h)
    assert res.status_code == 200
    assert res.json() == {"user_uuid": str(uuid_of(ALICE)), "display_name": "Alice Álvarez",
                          "contact_email": "alice.work@example.com", "phone": "+34 600 123 456"}
    assert client.get(url, headers=headers_for(BOB)).json() == res.json()
    # partial update leaves the rest alone; explicit null clears an optional field
    assert client.patch(url, json={"phone": None}, headers=h).json()["contact_email"] == "alice.work@example.com"
    cleared = client.patch(url, json={"phone": None, "contact_email": None}, headers=h).json()
    assert cleared["phone"] is None and cleared["contact_email"] is None and cleared["display_name"] == "Alice Álvarez"


def test_profile_changes_do_not_touch_the_login_credentials(client):
    client.patch(f"/profiles/{uuid_of(ALICE)}", json={"display_name": "Otro", "contact_email": "otro@example.com"},
                 headers=headers_for(ALICE))
    ok = client.post("/auth/login", data={"username": ALICE, "password": PASSWORD})
    assert ok.status_code == 200
    assert client.post("/auth/login", data={"username": "otro@example.com", "password": PASSWORD}).status_code == 401


def test_nobody_edits_someone_elses_profile(client):
    res = client.patch(f"/profiles/{uuid_of(BOB)}", json={"display_name": "Hacked"}, headers=headers_for(ALICE))
    assert res.status_code == 403
    assert client.get(f"/profiles/{uuid_of(BOB)}", headers=headers_for(BOB)).json()["display_name"] == "bob"
    assert client.patch(f"/profiles/{uuid4()}", json={}, headers=headers_for(ALICE)).status_code == 403


@pytest.mark.parametrize(
    "bad",
    [
        {"display_name": ""}, {"display_name": "   "}, {"display_name": None}, {"display_name": "x" * 81},
        {"contact_email": "not-an-email"}, {"phone": "call me"}, {"phone": "12"},
        {"user_uuid": str(uuid4())}, {"email": "x@example.com"}, {"password": "whatever-123"},
    ],
)
def test_update_validation(client, bad):
    res = client.patch(f"/profiles/{uuid_of(ALICE)}", json=bad, headers=headers_for(ALICE))
    assert res.status_code == 422


def test_there_is_no_way_to_create_or_delete_a_profile_directly(client):
    h = headers_for(ALICE)
    assert client.post("/profiles", json={"display_name": "x"}, headers=h).status_code == 405
    assert client.delete(f"/profiles/{uuid_of(ALICE)}", headers=h).status_code == 405


def test_profile_service_persists_in_tinydb(tmp_path, monkeypatch):
    path = tmp_path / "p.json"
    monkeypatch.setattr(profiles_service, "_db", TinyDB(path))
    user_uuid = uuid4()
    profiles_service.ensure_profile(user_uuid, "zoe@example.com")
    profiles_service._db.close()
    reopened = TinyDB(path)
    assert reopened.all()[0]["display_name"] == "zoe"
    reopened.close()
