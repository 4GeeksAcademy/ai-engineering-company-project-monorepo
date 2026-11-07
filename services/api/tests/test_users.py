"""User tests: sign-up rules, hidden password hash, and owner/admin checks."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from conftest import PASSWORD, login, register
from security import verify_password


def _make_admin(client, user_id: str) -> None:
    client.app.state.user_repository.update_user(user_id, {"role": "admin"})


def test_register_does_not_echo_the_email_or_any_credential(anon_client):
    body = register(anon_client, "ana@nexova.example", name="Ana")
    assert set(body) == {"id", "role"}
    assert body["role"] == "user"


def test_user_detail_exposes_the_documented_fields_only(anon_client):
    user = register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    body = anon_client.get(f"/users/{user['id']}", headers=headers).json()
    assert set(body) == {"id", "email", "is_active", "role", "created_at"}
    assert body["is_active"] is True
    assert datetime.fromisoformat(body["created_at"]).utcoffset() == UTC.utcoffset(None)


def test_password_is_stored_hashed(anon_client, tmp_path):
    user = register(anon_client, "ana@nexova.example")
    stored = anon_client.app.state.user_repository.get_user(user["id"])
    assert stored.hashed_password != PASSWORD
    assert verify_password(PASSWORD, stored.hashed_password)
    assert PASSWORD not in (tmp_path / "users.json").read_text(encoding="utf-8")


def test_register_creates_the_linked_profile(anon_client, tmp_path):
    user = register(anon_client, "ana@nexova.example", name="Ana", phone="600", address="Madrid")
    profiles = json.loads((tmp_path / "users.json").read_text(encoding="utf-8"))["profiles"]
    assert [p for p in profiles.values() if p["user_id"] == user["id"]][0]["name"] == "Ana"


def test_duplicate_email_is_409(anon_client):
    register(anon_client, "ana@nexova.example")
    response = anon_client.post("/users", json={"email": "ANA@nexova.example", "password": PASSWORD})
    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"email": "x@nexova.example", "password": PASSWORD, "role": "admin"}, id="role-admin"),
        pytest.param({"email": "x@nexova.example", "password": PASSWORD, "role": "manager"}, id="role-manager"),
        pytest.param({"email": "not-an-email", "password": PASSWORD}, id="bad-email"),
        pytest.param({"email": "x@nexova.example", "password": "short"}, id="short-password"),
        pytest.param({"email": "x@nexova.example"}, id="missing-password"),
    ],
)
def test_register_rejects_invalid_payload(anon_client, payload):
    assert anon_client.post("/users", json=payload).status_code == 422


@pytest.mark.parametrize(
    ("method", "path"),
    [("GET", "/users"), ("GET", "/users/x"), ("PUT", "/users/x"), ("DELETE", "/users/x"), ("GET", "/profiles/me"), ("PUT", "/profiles/me")],
)
def test_user_routes_require_a_token(anon_client, method, path):
    assert anon_client.request(method, path, json={}).status_code == 401


def test_list_and_get_users_never_expose_the_hash(auth_client):
    users = auth_client.get("/users").json()
    assert len(users) == 1
    assert set(users[0]) == {"id", "email", "role", "is_active"}
    detail = auth_client.get(f"/users/{users[0]['id']}").json()
    assert detail == {**users[0], "created_at": detail["created_at"]}
    assert auth_client.get("/users/unknown").status_code == 404


def test_user_updates_own_email_and_password(anon_client):
    user = register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    response = anon_client.put(
        f"/users/{user['id']}", json={"email": "ana.new@nexova.example", "password": "new-password-1"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["email"] == "ana.new@nexova.example"
    login(anon_client, "ana.new@nexova.example", "new-password-1")
    assert anon_client.post("/auth/login", data={"username": "ana.new@nexova.example", "password": PASSWORD}).status_code == 401


def test_update_to_an_email_in_use_is_409(anon_client):
    user = register(anon_client, "ana@nexova.example")
    register(anon_client, "bob@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    assert anon_client.put(f"/users/{user['id']}", json={"email": "bob@nexova.example"}, headers=headers).status_code == 409


def test_user_cannot_change_own_role(anon_client):
    user = register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    assert anon_client.put(f"/users/{user['id']}", json={"role": "admin"}, headers=headers).status_code == 403
    assert anon_client.get(f"/users/{user['id']}", headers=headers).json()["role"] == "user"


def test_role_rejects_unknown_values(anon_client):
    admin = register(anon_client, "admin@nexova.example")
    _make_admin(anon_client, admin["id"])
    headers = login(anon_client, "admin@nexova.example")
    assert anon_client.put(f"/users/{admin['id']}", json={"role": "superuser"}, headers=headers).status_code == 422


@pytest.mark.parametrize(
    ("method", "payload"),
    [("PUT", {"email": "hacked@nexova.example"}), ("PUT", {"password": "hacked-pass-1"}), ("DELETE", None)],
)
def test_user_a_cannot_modify_user_b(anon_client, method, payload):
    register(anon_client, "ana@nexova.example")
    bob = register(anon_client, "bob@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    assert anon_client.request(method, f"/users/{bob['id']}", json=payload, headers=headers).status_code == 403
    after = anon_client.get(f"/users/{bob['id']}", headers=headers).json()
    assert after["id"] == bob["id"] and after["email"] == "bob@nexova.example" and after["role"] == "user"


def test_admin_can_update_role_and_delete_other_users(anon_client):
    admin = register(anon_client, "admin@nexova.example")
    _make_admin(anon_client, admin["id"])
    bob = register(anon_client, "bob@nexova.example")
    headers = login(anon_client, "admin@nexova.example")
    assert anon_client.put(f"/users/{bob['id']}", json={"role": "manager"}, headers=headers).json()["role"] == "manager"
    assert anon_client.delete(f"/users/{bob['id']}", headers=headers).status_code == 204
    assert anon_client.get(f"/users/{bob['id']}", headers=headers).status_code == 404
    assert anon_client.delete(f"/users/{bob['id']}", headers=headers).status_code == 404


def test_delete_removes_the_profile_too(anon_client, tmp_path):
    user = register(anon_client, "ana@nexova.example", name="Ana")
    headers = login(anon_client, "ana@nexova.example")
    assert anon_client.delete(f"/users/{user['id']}", headers=headers).status_code == 204
    data = json.loads((tmp_path / "users.json").read_text(encoding="utf-8"))
    assert data["users"] == {} and data["profiles"] == {}


# --- service level: user_service / repository decisions -----------------------------------------

import user_service  # noqa: E402
from database import EmailAlreadyRegistered  # noqa: E402
from user_models import Role, UserUpdate  # noqa: E402


def test_update_user_with_no_fields_changes_nothing(repo, user):
    assert user_service.update_user(repo, user.id, UserUpdate()) == repo.get_user(user.id)


def test_update_user_hashes_a_new_password(repo, user):
    user_service.update_user(repo, user.id, UserUpdate(password="new-password-1"))
    stored = repo.get_user(user.id)
    assert stored.hashed_password != "new-password-1"
    assert verify_password("new-password-1", stored.hashed_password)


def test_update_user_to_an_email_taken_by_another_raises(repo, user, make_user):
    other = make_user("other@nexova.example")
    with pytest.raises(EmailAlreadyRegistered):
        user_service.update_user(repo, user.id, UserUpdate(email=other.email))
    assert repo.get_user(user.id).email == user.email


def test_update_user_may_resubmit_its_own_email_in_other_case(repo, user):
    updated = user_service.update_user(repo, user.id, UserUpdate(email=user.email.upper()))
    assert updated.email == user.email


def test_update_unknown_user_returns_none(repo):
    assert user_service.update_user(repo, "missing", UserUpdate(role=Role.ADMIN)) is None


def test_changing_the_password_through_update_spends_pending_reset_links(repo, user):
    from user_models import PasswordResetToken  # noqa: PLC0415

    repo.add_reset_token(PasswordResetToken(jti="pending", user_id=user.id, expires_at=datetime(2999, 1, 1, tzinfo=UTC)))
    user_service.update_user(repo, user.id, UserUpdate(password="new-password-1"))
    assert repo.get_reset_token("pending").used_at is not None


def test_delete_user_removes_user_and_profile_and_reports_missing_ids(repo, make_user):
    user = make_user("ana@nexova.example", name="Ana")
    assert user_service.delete_user(repo, user.id) is True
    assert repo.get_user(user.id) is None and repo.get_profile(user.id) is None
    assert user_service.delete_user(repo, user.id) is False


def test_delete_user_leaves_other_users_and_profiles_alone(repo, make_user):
    ana, bob = make_user("ana@nexova.example", name="Ana"), make_user("bob@nexova.example", name="Bob")
    user_service.delete_user(repo, ana.id)
    assert repo.get_user(bob.id) is not None and repo.get_profile(bob.id).name == "Bob"


def test_non_admin_gets_403_not_404_for_someone_elses_missing_id(anon_client):
    register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    # 403 before any lookup: a non-admin cannot probe which ids exist.
    assert anon_client.delete("/users/does-not-exist", headers=headers).status_code == 403


def test_admin_gets_404_for_a_missing_id(anon_client):
    admin = register(anon_client, "admin@nexova.example")
    _make_admin(anon_client, admin["id"])
    headers = login(anon_client, "admin@nexova.example")
    assert anon_client.put("/users/does-not-exist", json={"role": "user"}, headers=headers).status_code == 404


def test_manager_has_no_admin_powers(anon_client):
    manager, bob = register(anon_client, "mgr@nexova.example"), register(anon_client, "bob@nexova.example")
    anon_client.app.state.user_repository.update_user(manager["id"], {"role": "manager"})
    headers = login(anon_client, "mgr@nexova.example")
    assert anon_client.put(f"/users/{bob['id']}", json={"role": "admin"}, headers=headers).status_code == 403
    assert anon_client.delete(f"/users/{bob['id']}", headers=headers).status_code == 403


def test_admin_can_delete_themselves(anon_client):
    # Documented design limit: nothing prevents the last admin from removing the account.
    admin = register(anon_client, "admin@nexova.example")
    _make_admin(anon_client, admin["id"])
    headers = login(anon_client, "admin@nexova.example")
    assert anon_client.delete(f"/users/{admin['id']}", headers=headers).status_code == 204


def test_empty_update_body_is_a_no_op(anon_client):
    user = register(anon_client, "ana@nexova.example")
    headers = login(anon_client, "ana@nexova.example")
    before = anon_client.get(f"/users/{user['id']}", headers=headers).json()
    assert anon_client.put(f"/users/{user['id']}", json={}, headers=headers).json() == before
