from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from passlib.hash import bcrypt
from pydantic import ValidationError

from models import User, UserRole


TEST_SECRET = "test-secret-key-with-at-least-32-bytes"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", TEST_SECRET)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "2")
    from main import create_app

    with TestClient(create_app(tmp_path / "auth.json")) as connection:
        yield connection


def register(client, email):
    response = client.post(
        "/users",
        json={"email": email, "password": "correct-horse-battery", "name": "TrackFlow User", "phone": "+1 555 0100"},
    )
    assert response.status_code == 201
    return response.json()


def login(client, email, password="correct-horse-battery"):
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_register_hashes_password_and_creates_linked_profile(client):
    user = register(client, "owner@example.com")
    stored_user = client.app.state.db.table("users").get(doc_id=user["id"])
    profile = client.get("/profiles/me", headers={"Authorization": f"Bearer {login(client, user['email'])}"})

    assert user["role"] == "user"
    assert set(user) == {"id", "email", "is_active", "role", "created_at"}
    assert "name" not in stored_user and "phone" not in stored_user and "address" not in stored_user
    assert stored_user["hashed_password"] != "correct-horse-battery"
    assert bcrypt.verify("correct-horse-battery", stored_user["hashed_password"])
    assert profile.status_code == 200
    assert profile.json()["user_id"] == user["id"]
    assert profile.json()["name"] == "TrackFlow User"
    assert profile.json()["phone"] == "+1 555 0100"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {login(client, user['email'])}"})
    assert me.status_code == 200
    assert me.json()["email"] == user["email"]
    assert me.json()["role"] == "user"
    assert me.json()["profile"]["user_id"] == user["id"]
    assert client.get("/users", headers={"Authorization": f"Bearer {login(client, user['email'])}"}).json()[0].keys() == user.keys()


def test_registration_role_is_fixed_and_invalid_roles_are_rejected(client):
    assert client.post(
        "/users", json={"email": "admin@example.com", "password": "correct-horse-battery", "role": "admin"}
    ).status_code == 422
    assert UserRole.user.value == "user"
    with pytest.raises(ValidationError):
        User.model_validate({
            "id": 1,
            "email": "invalid-role@example.com",
            "hashed_password": "hash",
            "is_active": True,
            "role": "root",
            "created_at": datetime.now(timezone.utc),
        })


def test_login_accepts_json_and_swagger_oauth_form(client):
    user = register(client, "oauth@example.com")
    wrong_password = client.post("/auth/login", json={"email": user["email"], "password": "wrong-password"})
    assert wrong_password.status_code == 401

    form_login = client.post(
        "/auth/login", data={"username": user["email"], "password": "correct-horse-battery"}
    )
    assert form_login.status_code == 200
    assert form_login.json()["token_type"] == "bearer"
    assert form_login.json()["expires_in"] == 120
    assert client.get("/docs").status_code == 200
    openapi = client.get("/openapi.json").json()
    assert "requestBody" in openapi["paths"]["/auth/login"]["post"]
    assert "OAuth2PasswordBearer" in openapi["components"]["securitySchemes"]
    assert "HTTPBearer" in openapi["components"]["securitySchemes"]


def test_all_sensitive_user_profile_auth_and_supplier_routes_require_a_token(client):
    supplier = {
        "name": "Test Carrier",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5,
        "currency": "USD",
        "status": "active",
    }
    protected_calls = [
        ("get", "/users", None),
        ("get", "/users/1", None),
        ("put", "/users/1", {"email": "new@example.com"}),
        ("delete", "/users/1", None),
        ("get", "/profiles/me", None),
        ("put", "/profiles/me", {"name": "New name"}),
        ("get", "/auth/me", None),
        ("get", "/suppliers", None),
        ("post", "/suppliers", supplier),
        ("get", "/suppliers/1", None),
        ("patch", "/suppliers/1/rate", {"rate_per_shipment": 6}),
        ("patch", "/suppliers/1/status", {"status": "suspended"}),
        ("delete", "/suppliers/1", None),
    ]

    for method, path, body in protected_calls:
        response = getattr(client, method)(path, json=body) if body is not None else getattr(client, method)(path)
        assert response.status_code == 401, f"{method.upper()} {path}: {response.status_code} {response.text}"


def test_missing_malformed_and_expired_tokens_return_401(client):
    user = register(client, "token@example.com")
    expired_token = jwt.encode(
        {"sub": str(user["id"]), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        TEST_SECRET,
        algorithm="HS256",
    )

    for token in ("not-a-jwt", expired_token):
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
    assert client.get("/auth/me").status_code == 401


def test_owner_admin_permissions_profile_update_and_cascade_delete(client):
    owner = register(client, "owner@example.com")
    other = register(client, "other@example.com")
    owner_token = login(client, owner["email"])
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    assert client.get(f"/users/{other['id']}", headers=owner_headers).status_code == 403
    assert client.put(
        f"/users/{other['id']}", json={"email": "stolen@example.com"}, headers=owner_headers
    ).status_code == 403
    assert client.delete(f"/users/{other['id']}", headers=owner_headers).status_code == 403
    assert client.put(f"/users/{owner['id']}", json={"role": "admin"}, headers=owner_headers).status_code == 403

    changed_profile = client.put(
        "/profiles/me", json={"name": "Updated Name", "address": "Zaragoza"}, headers=owner_headers
    )
    assert changed_profile.status_code == 200
    assert changed_profile.json()["name"] == "Updated Name"
    assert changed_profile.json()["address"] == "Zaragoza"

    changed_credentials = client.put(
        f"/users/{owner['id']}",
        json={"email": "renamed@example.com", "password": "new-correct-password"},
        headers=owner_headers,
    )
    assert changed_credentials.status_code == 200
    assert client.post(
        "/auth/login", json={"email": owner["email"], "password": "correct-horse-battery"}
    ).status_code == 401
    assert client.post(
        "/auth/login", json={"email": "renamed@example.com", "password": "new-correct-password"}
    ).status_code == 200

    client.app.state.db.table("users").update({"role": "admin"}, doc_ids=[owner["id"]])
    admin_headers = {
        "Authorization": f"Bearer {login(client, 'renamed@example.com', 'new-correct-password')}"
    }
    changed_role = client.put(f"/users/{other['id']}", json={"role": "manager"}, headers=admin_headers)
    assert changed_role.status_code == 200
    assert changed_role.json()["role"] == "manager"
    assert client.delete(f"/users/{other['id']}", headers=admin_headers).status_code == 204
    assert client.app.state.db.table("profiles").get(lambda item: item["user_id"] == other["id"]) is None
