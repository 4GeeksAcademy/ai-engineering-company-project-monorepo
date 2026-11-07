"""Profile tests: /profiles/me reads and edits only the caller's own profile."""

from __future__ import annotations

import json

from conftest import login, register


def test_get_my_profile(anon_client):
    user = register(anon_client, "ana@nexova.example", name="Ana", phone="600")
    body = anon_client.get("/profiles/me", headers=login(anon_client, "ana@nexova.example")).json()
    assert set(body) == {"name", "phone", "address"}
    assert (body["name"], body["phone"], body["address"]) == ("Ana", "600", None)


def test_update_my_profile_changes_only_sent_fields(anon_client):
    register(anon_client, "ana@nexova.example", name="Ana", phone="600")
    headers = login(anon_client, "ana@nexova.example")
    before = anon_client.get("/profiles/me", headers=headers).json()
    response = anon_client.put("/profiles/me", json={"address": "Madrid"}, headers=headers)
    assert response.status_code == 200
    assert response.json() == {**before, "address": "Madrid"}
    assert anon_client.get("/auth/me", headers=headers).json()["profile"]["address"] == "Madrid"


def test_profile_update_cannot_change_owner_or_id(anon_client):
    register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    assert anon_client.put("/profiles/me", json={"user_id": "someone-else"}, headers=headers).status_code == 422
    assert anon_client.put("/profiles/me", json={"id": "other"}, headers=headers).status_code == 422


def test_each_user_only_sees_their_own_profile(anon_client):
    register(anon_client, "ana@nexova.example", name="Ana")
    register(anon_client, "bob@nexova.example", name="Bob")
    bob_headers = login(anon_client, "bob@nexova.example")
    anon_client.put("/profiles/me", json={"name": "Bobby"}, headers=bob_headers)
    assert anon_client.get("/profiles/me", headers=login(anon_client, "ana@nexova.example")).json()["name"] == "Ana"
    assert anon_client.get("/profiles/me", headers=bob_headers).json()["name"] == "Bobby"


def test_repeated_updates_keep_a_single_profile(anon_client, tmp_path):
    user = register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    for name in ("A", "B", "C"):
        anon_client.put("/profiles/me", json={"name": name}, headers=headers)
    profiles = json.loads((tmp_path / "users.json").read_text(encoding="utf-8"))["profiles"]
    assert [p["name"] for p in profiles.values() if p["user_id"] == user["id"]] == ["C"]


# --- service level ----------------------------------------------------------------------------------

import user_service  # noqa: E402
from user_models import ProfileUpdate  # noqa: E402


def test_update_profile_changes_only_the_fields_that_were_sent(repo, make_user):
    user = make_user(name="Ana", phone="1", address="Madrid")
    user_service.update_profile(repo, user.id, ProfileUpdate(phone="2"))
    profile = repo.get_profile(user.id)
    assert (profile.name, profile.phone, profile.address) == ("Ana", "2", "Madrid")


def test_explicit_null_clears_a_field_but_an_empty_update_changes_nothing(repo, make_user):
    user = make_user(name="Ana", phone="1")
    user_service.update_profile(repo, user.id, ProfileUpdate())
    assert repo.get_profile(user.id).name == "Ana"
    user_service.update_profile(repo, user.id, ProfileUpdate(name=None))
    assert repo.get_profile(user.id).name is None and repo.get_profile(user.id).phone == "1"


def test_update_profile_creates_a_missing_profile_once(repo, make_user):
    user = make_user()
    repo._profiles.truncate()
    user_service.update_profile(repo, user.id, ProfileUpdate(name="Ana"))
    user_service.update_profile(repo, user.id, ProfileUpdate(name="Ana B"))
    assert len(repo._profiles.all()) == 1 and repo.get_profile(user.id).name == "Ana B"


def test_update_only_touches_the_callers_profile(repo, make_user):
    ana, bob = make_user("ana@nexova.example", name="Ana"), make_user("bob@nexova.example", name="Bob")
    user_service.update_profile(repo, ana.id, ProfileUpdate(name="Changed"))
    assert repo.get_profile(bob.id).name == "Bob"


def test_profile_fields_over_200_characters_are_rejected():
    import pytest  # noqa: PLC0415
    from pydantic import ValidationError  # noqa: PLC0415

    with pytest.raises(ValidationError):
        ProfileUpdate(name="x" * 201)
