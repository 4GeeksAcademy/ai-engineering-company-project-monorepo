"""CRUD checks for /users: email + password only, hashed at rest, owner-only changes."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from auth import service as auth_service
from conftest import ALICE, BOB, CAROL, PASSWORD, headers_for, uuid_of
from main import app
from users import service as users_service

NEW = {"email": "nuevo@example.com", "password": "s3cret-pass!"}


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def login(client, email, password):
    return client.post("/auth/login", data={"username": email, "password": password})


# --- create ------------------------------------------------------------------


def test_create_stores_a_hash_and_a_uuid_and_the_user_can_log_in(client, users_db):
    created = client.post("/users", json={**NEW, "email": "  Nuevo@Example.COM "}, headers=headers_for(ALICE))
    assert created.status_code == 201
    body = created.json()
    assert set(body) == {"user_uuid", "email"} and body["email"] == "nuevo@example.com"
    assert "s3cret-pass!" not in created.text

    stored = users_db.get(doc_id=4)
    assert stored["user_uuid"] == body["user_uuid"]
    assert set(stored) == {"user_uuid", "email", "password_hash"}
    assert stored["password_hash"].startswith("$2") and NEW["password"] not in str(stored)
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
                          ("/api/users", {"email": "bad", "password": secret})]:
        response = client.post(path, json=payload, headers=headers_for(ALICE))
        assert response.status_code == 422 and secret not in response.text
    response = client.patch(f"/users/{uuid_of(ALICE)}", json={"password": secret, "current_password": PASSWORD},
                            headers=headers_for(ALICE))
    assert response.status_code == 422 and secret not in response.text and PASSWORD not in response.text


# --- read --------------------------------------------------------------------


def test_list_and_get_expose_only_uuid_and_email(client):
    h = headers_for(BOB)
    listing = client.get("/users", headers=h)
    assert {u["email"] for u in listing.json()} == {ALICE, BOB, CAROL}
    assert all(set(u) == {"user_uuid", "email"} for u in listing.json())
    assert "hash" not in listing.text and "$2" not in listing.text
    one = client.get(f"/api/users/{uuid_of(CAROL)}", headers=h)
    assert one.json() == {"user_uuid": str(uuid_of(CAROL)), "email": CAROL}
    assert client.get(f"/users/{uuid4()}", headers=h).status_code == 404
    assert client.get("/users/1", headers=h).status_code == 422  # ids are uuids


# --- update ------------------------------------------------------------------


def test_owner_changes_email_with_the_current_password(client):
    h = headers_for(ALICE)
    url = f"/users/{uuid_of(ALICE)}"
    res = client.patch(url, json={"email": "Alice.New@Example.com", "current_password": PASSWORD}, headers=h)
    assert res.status_code == 200
    assert res.json() == {"user_uuid": str(uuid_of(ALICE)), "email": "alice.new@example.com"}
    assert login(client, ALICE, PASSWORD).status_code == 401
    assert login(client, "alice.new@example.com", PASSWORD).status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 200  # same uuid, same session


def test_owner_changes_password_and_old_tokens_stop_working(client, users_db):
    old = headers_for(ALICE)
    users_db.update({"password_changed_at": 0}, lambda d: d["email"] == ALICE)  # baseline
    res = client.patch(f"/users/{uuid_of(ALICE)}", json={"password": "brand-new-pass", "current_password": PASSWORD}, headers=old)
    assert res.status_code == 200 and "brand-new-pass" not in res.text
    assert login(client, ALICE, PASSWORD).status_code == 401
    assert login(client, ALICE, "brand-new-pass").status_code == 200
    stored = next(d for d in users_db.all() if d["email"] == ALICE)
    assert stored["password_hash"].startswith("$2") and "brand-new-pass" not in str(stored)


def test_password_change_revokes_tokens_issued_before_it(client, users_db):
    old = headers_for(ALICE)
    users_db.update({"password_changed_at": 4102444800}, lambda d: d["email"] == ALICE)  # change "in the future"
    assert client.get("/auth/me", headers=old).status_code == 401


def test_update_needs_the_right_current_password(client):
    h, url = headers_for(ALICE), f"/users/{uuid_of(ALICE)}"
    assert client.patch(url, json={"password": "brand-new-pass"}, headers=h).status_code == 422
    wrong = client.patch(url, json={"password": "brand-new-pass", "current_password": "nope"}, headers=h)
    assert wrong.status_code == 400
    assert login(client, ALICE, PASSWORD).status_code == 200  # unchanged
    assert login(client, ALICE, "brand-new-pass").status_code == 401


def test_update_conflicts_and_validation(client):
    h, url = headers_for(ALICE), f"/users/{uuid_of(ALICE)}"
    assert client.patch(url, json={"email": BOB, "current_password": PASSWORD}, headers=h).status_code == 409
    assert client.patch(url, json={"email": ALICE, "current_password": PASSWORD}, headers=h).status_code == 200
    assert client.patch(url, json={}, headers=h).status_code == 200  # no-op
    for bad in ({"email": "nope", "current_password": PASSWORD}, {"password": "x", "current_password": PASSWORD},
                {"user_uuid": str(uuid4())}, {"role": "admin"}):
        assert client.patch(url, json=bad, headers=h).status_code == 422, bad


def test_nobody_can_change_someone_elses_account(client):
    url = f"/users/{uuid_of(BOB)}"
    res = client.patch(url, json={"password": "hijacked-pass", "current_password": PASSWORD}, headers=headers_for(ALICE))
    assert res.status_code == 403
    assert login(client, BOB, PASSWORD).status_code == 200
    assert client.patch(f"/users/{uuid4()}", json={}, headers=headers_for(ALICE)).status_code == 403


# --- delete ------------------------------------------------------------------


def test_owner_deletes_their_account_and_the_token_stops_working(client):
    h = headers_for(BOB)
    assert client.delete(f"/users/{uuid_of(BOB)}", headers=h).status_code == 204
    assert client.get(f"/users/{uuid_of(BOB)}", headers=headers_for(ALICE)).status_code == 404
    assert client.get("/auth/me", headers=h).status_code == 401
    assert login(client, BOB, PASSWORD).status_code == 401


def test_nobody_can_delete_someone_elses_account(client):
    assert client.delete(f"/users/{uuid_of(BOB)}", headers=headers_for(ALICE)).status_code == 403
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
