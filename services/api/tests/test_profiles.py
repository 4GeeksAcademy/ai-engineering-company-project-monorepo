"""Profile checks: one-to-one with User through user_id; name and contact data live here."""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from auth.security import create_access_token
from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from main import app
from profiles import service as profiles_service
from profiles.schemas import Profile
from users import service as users_service
from users.schemas import UserCreate

PROFILE_FIELDS = {"id", "user_id", "name", "contact_email", "phone", "address"}
NEW_USER = {"email": "nuevo.usuario@example.com", "password": "s3cret-pass!"}


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# --- created and deleted with the user -------------------------------------------


def test_creating_a_user_creates_exactly_one_profile_with_a_default_name(client, profiles_db):
    created = client.post("/users", json=NEW_USER, headers=headers_for(ALICE)).json()
    stored = [d for d in profiles_db.all() if d["user_id"] == created["id"]]
    assert len(profiles_db) == 4 and len(stored) == 1
    assert set(stored[0]) == PROFILE_FIELDS
    assert UUID(stored[0]["id"]) != UUID(created["id"])  # its own id, not the user's
    assert {k: stored[0][k] for k in ("user_id", "name", "contact_email", "phone", "address")} == {
        "user_id": created["id"], "name": "nuevo.usuario", "contact_email": None, "phone": None, "address": None,
    }
    assert client.get(f"/profiles/{created['id']}", headers=headers_for(ALICE)).json()["name"] == "nuevo.usuario"


def test_deleting_a_user_deletes_their_profile(client, profiles_db):
    created = client.post("/users", json=NEW_USER, headers=headers_for(ALICE)).json()
    own = {"Authorization": f"Bearer {create_access_token(created['id'])}"}
    assert len(profiles_db) == 4
    assert client.delete(f"/users/{created['id']}", headers=own).status_code == 204
    assert len(profiles_db) == 3 and created["id"] not in {d["user_id"] for d in profiles_db.all()}
    assert client.get(f"/profiles/{created['id']}", headers=headers_for(ALICE)).status_code == 404


def test_failed_profile_creation_leaves_no_user_behind(monkeypatch, users_db):
    def boom(*_, **__):
        raise RuntimeError("disk full")

    monkeypatch.setattr(profiles_service, "ensure_profile", boom)
    with pytest.raises(RuntimeError):
        users_service.create_user(UserCreate(**NEW_USER))
    assert len(users_db) == 3  # only the seeded users


def test_sync_gives_every_user_a_profile_and_drops_orphans(users_db, profiles_db):
    profiles_db.truncate()  # users whose profile is missing
    stranger = str(uuid4())
    profiles_db.insert(Profile(user_id=stranger, name="ghost").model_dump(mode="json"))
    users_service.sync_profiles()
    assert {d["user_id"] for d in profiles_db.all()} == {str(uuid_of(e)) for e in (ALICE, BOB, CAROL)}
    users_service.sync_profiles()  # idempotent
    assert len(profiles_db) == 3


def test_legacy_profile_documents_are_migrated_once(users_db, profiles_db):
    profiles_db.truncate()
    old = {"user_uuid": str(uuid_of(ALICE)), "display_name": "Alice", "contact_email": None, "phone": "+34 600 000 000"}
    profiles_db.insert(old)
    profiles_service.migrate_legacy_profiles()
    users_service.sync_profiles()  # must not duplicate the migrated profile
    assert len(profiles_db) == 3
    migrated = next(d for d in profiles_db.all() if d["user_id"] == str(uuid_of(ALICE)))
    assert set(migrated) == PROFILE_FIELDS
    assert (migrated["name"], migrated["phone"], migrated["address"]) == ("Alice", "+34 600 000 000", None)
    snapshot = profiles_db.all()
    profiles_service.migrate_legacy_profiles()  # idempotent
    assert profiles_db.all() == snapshot


# --- one-to-one -------------------------------------------------------------------


def test_repeated_reads_and_writes_never_create_a_second_profile(client, profiles_db):
    h = headers_for(ALICE)
    for _ in range(3):
        assert client.get("/profiles/me", headers=h).status_code == 200
        assert client.put("/profiles/me", json={}, headers=h).status_code == 200
    assert len(profiles_db) == 3
    assert len([d for d in profiles_db.all() if d["user_id"] == str(uuid_of(ALICE))]) == 1


def test_a_missing_profile_is_recreated_for_its_owner_and_never_duplicated(client, profiles_db):
    profiles_db.remove(lambda d: d["user_id"] == str(uuid_of(ALICE)))
    assert client.get(f"/profiles/{uuid_of(ALICE)}", headers=headers_for(ALICE)).status_code == 404  # own, but gone
    h = headers_for(ALICE)
    assert client.get("/profiles/me", headers=h).json()["name"] == "alice"
    profiles_db.remove(lambda d: d["user_id"] == str(uuid_of(ALICE)))
    res = client.put("/profiles/me", json={"name": "Alice"}, headers=h)
    assert res.status_code == 200 and res.json()["name"] == "Alice"
    assert len([d for d in profiles_db.all() if d["user_id"] == str(uuid_of(ALICE))]) == 1


def test_profile_and_user_are_linked_by_user_id_but_do_not_share_data(client, users_db, profiles_db):
    client.put("/profiles/me", json={"name": "Alice A.", "phone": "+34 600 000 000"}, headers=headers_for(ALICE))
    user = next(d for d in users_db.all() if d["email"] == ALICE)
    profile = next(d for d in profiles_db.all() if d["user_id"] == user["id"])
    assert user["id"] == profile["user_id"] and profile["id"] != user["id"]
    assert set(user) == {"id", "email", "hashed_password", "is_active", "role", "created_at"}  # nothing profile-like in User
    assert "hashed_password" not in profile and "email" not in profile
    public = {"id", "email", "is_active", "role", "created_at"}  # ... and none in the User API either
    assert client.get(f"/users/{uuid_of(ALICE)}", headers=headers_for(ALICE)).json().keys() == public
    assert client.get("/auth/me", headers=headers_for(ALICE)).json().keys() == public | {"profile"}


# --- read -------------------------------------------------------------------------


def test_read_own_profile_and_admins_read_others(client):
    h = headers_for(BOB)
    me = client.get("/profiles/me", headers=h).json()
    assert set(me) == PROFILE_FIELDS and me["user_id"] == str(uuid_of(BOB))
    assert (me["name"], me["contact_email"], me["phone"], me["address"]) == ("bob", None, None, None)
    assert client.get("/profiles/me", headers=h).json() == me
    assert client.get(f"/profiles/{uuid_of(BOB)}", headers=h).json() == me  # by id, own
    admin = headers_for(ALICE)  # admins can read any profile and list them all
    assert client.get(f"/profiles/{uuid_of(BOB)}", headers=admin).json() == me
    assert {"alice", "bob", "carol"} <= {p["name"] for p in client.get("/profiles", headers=admin).json()}
    assert client.get(f"/profiles/{uuid4()}", headers=admin).status_code == 404
    assert client.get("/profiles/1", headers=admin).status_code == 422


def test_a_user_gets_403_reading_or_listing_other_peoples_profiles(client):
    h = headers_for(BOB)
    for url in (f"/profiles/{uuid_of(ALICE)}", f"/profiles/{uuid_of(CAROL)}", f"/profiles/{uuid4()}", "/profiles"):
        res = client.get(url, headers=h)
        assert res.status_code == 403, url  # also for an id that doesn't exist: nothing to probe
        assert "alice" not in res.text and "carol" not in res.text


# --- update: PUT /profiles/me -------------------------------------------------------


def test_owner_edits_name_phone_address_and_contact_email(client):
    h = headers_for(ALICE)
    res = client.put("/profiles/me", json={"name": "  Alice Álvarez ", "contact_email": "Alice.Work@Example.COM",
                                           "phone": "+34 600 123 456", "address": " C/ Mayor 1, Madrid "}, headers=h)
    assert res.status_code == 200
    body = res.json()
    assert {k: v for k, v in body.items() if k != "id"} == {
        "user_id": str(uuid_of(ALICE)), "name": "Alice Álvarez", "contact_email": "alice.work@example.com",
        "phone": "+34 600 123 456", "address": "C/ Mayor 1, Madrid"}
    assert client.get(f"/profiles/{uuid_of(ALICE)}", headers=h).json() == body
    assert client.get(f"/profiles/{uuid_of(ALICE)}", headers=headers_for(BOB)).status_code == 403  # not Bob's business
    assert client.get("/profiles/me", headers=h).json() == body
    # the id and the link to the user never change
    again = client.put("/profiles/me", json={"name": "Alice"}, headers=h).json()
    assert (again["id"], again["user_id"]) == (body["id"], body["user_id"])
    # partial update leaves the rest alone; explicit null clears an optional field
    assert again["phone"] == "+34 600 123 456" and again["address"] == "C/ Mayor 1, Madrid"
    cleared = client.put("/profiles/me", json={"phone": None, "address": None}, headers=h).json()
    assert cleared["phone"] is None and cleared["address"] is None and cleared["name"] == "Alice"


def test_profile_changes_do_not_touch_the_login_credentials(client):
    client.put("/profiles/me", json={"name": "Otro", "contact_email": "otro@example.com"}, headers=headers_for(ALICE))
    ok = client.post("/auth/login", data={"username": ALICE, "password": PASSWORD})
    assert ok.status_code == 200
    assert client.post("/auth/login", data={"username": "otro@example.com", "password": PASSWORD}).status_code == 401


def test_only_the_owner_can_modify_a_profile(client):
    """PUT on someone else's profile is a 403 for everybody, admins included (ALICE)."""
    for who in (ALICE, CAROL):
        res = client.put(f"/profiles/{uuid_of(BOB)}", json={"name": "Hacked"}, headers=headers_for(who))
        assert res.status_code == 403, who
    assert client.put(f"/profiles/{uuid4()}", json={"name": "x"}, headers=headers_for(ALICE)).status_code == 403
    assert client.patch(f"/profiles/{uuid_of(BOB)}", json={"name": "x"}, headers=headers_for(ALICE)).status_code == 405
    assert client.get("/profiles/me", headers=headers_for(BOB)).json()["name"] == "bob"  # untouched
    assert client.get(f"/profiles/{uuid_of(BOB)}", headers=headers_for(ALICE)).json()["name"] == "bob"
    # the owner can use both spellings
    assert client.put(f"/profiles/{uuid_of(BOB)}", json={"name": "Bob B."}, headers=headers_for(BOB)).json()["name"] == "Bob B."
    assert client.put("/profiles/me", json={"name": "Bob C."}, headers=headers_for(BOB)).json()["name"] == "Bob C."
    # a body naming another owner is refused instead of being followed
    for other in ({"user_id": str(uuid_of(BOB))}, {"id": str(uuid4())}):
        assert client.put("/profiles/me", json=other, headers=headers_for(ALICE)).status_code == 422


@pytest.mark.parametrize(
    "bad",
    [
        {"name": ""}, {"name": "   "}, {"name": None}, {"name": "x" * 81},
        {"contact_email": "not-an-email"}, {"phone": "call me"}, {"phone": "12"}, {"address": ""}, {"address": "x" * 201},
        {"user_id": str(uuid4())}, {"email": "x@example.com"}, {"password": "whatever-123"},
    ],
)
def test_update_validation(client, bad):
    res = client.put("/profiles/me", json=bad, headers=headers_for(ALICE))
    assert res.status_code == 422


def test_there_is_no_way_to_create_or_delete_a_profile_directly(client):
    h = headers_for(ALICE)
    assert client.post("/profiles", json={"name": "x"}, headers=h).status_code == 405
    assert client.delete(f"/profiles/{uuid_of(ALICE)}", headers=h).status_code == 405
    assert client.delete("/profiles/me", headers=h).status_code == 405


def test_profile_service_persists_in_tinydb(tmp_path, monkeypatch):
    path = tmp_path / "p.json"
    monkeypatch.setattr(profiles_service, "_db", TinyDB(path))
    user_id = uuid4()
    profiles_service.ensure_profile(user_id, "zoe@example.com")
    profiles_service._db.close()
    reopened = TinyDB(path)
    assert reopened.all()[0]["name"] == "zoe" and reopened.all()[0]["user_id"] == str(user_id)
    reopened.close()
