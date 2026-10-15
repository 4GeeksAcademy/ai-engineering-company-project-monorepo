from datetime import datetime, timedelta, timezone
import secrets

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from services.api.main import app
from services.api.auth import storage


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTH_DB_PATH", str(tmp_path / "auth.json"))
    monkeypatch.setenv("SUPPLIERS_DB_PATH", str(tmp_path / "suppliers.json"))
    monkeypatch.setenv("JWT_SECRET_KEY", secrets.token_urlsafe(48))
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

    with TestClient(app) as c:
        yield c


def register(client, email):
    return client.post("/users", json={
        "email": email,
        "password": "ClaveSegura123!",
        "name": "Usuario Test",
    })


def login(client, email):
    response = client.post("/auth/login", data={
        "username": email,
        "password": "ClaveSegura123!",
    })
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_registration_and_profile(client):
    response = register(client, "ana@example.com")
    assert response.status_code == 201
    assert response.json()["role"] == "user"
    assert "hashed_password" not in response.json()
    assert "password" not in response.json()

    user = storage.get_user_by_email("ana@example.com")
    assert user["hashed_password"] != "ClaveSegura123!"

    headers = login(client, "ana@example.com")

    assert client.get("/auth/me", headers=headers).status_code == 200

    profile = client.get("/profiles/me", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["name"] == "Usuario Test"

    updated = client.put("/profiles/me", headers=headers, json={
        "name": "Ana Actualizada"
    })
    assert updated.status_code == 200
    assert updated.json()["name"] == "Ana Actualizada"


def test_permissions(client):
    ana = register(client, "ana@example.com").json()
    bob = register(client, "bob@example.com").json()
    headers = login(client, "ana@example.com")

    assert client.get("/users", headers=headers).status_code == 403
    assert client.get(f"/users/{bob['id']}", headers=headers).status_code == 403
    assert client.delete(f"/users/{bob['id']}", headers=headers).status_code == 403

    assert client.get(f"/users/{ana['id']}", headers=headers).status_code == 200

    invalid_role = client.put(
        f"/users/{ana['id']}",
        headers=headers,
        json={"role": "superadmin"},
    )
    assert invalid_role.status_code == 422


def test_invalid_and_expired_tokens(client, monkeypatch):
    user = register(client, "ana@example.com").json()

    assert client.get("/profiles/me").status_code == 401
    assert client.get(
        "/profiles/me",
        headers={"Authorization": "Bearer invalid-token"},
    ).status_code == 401

    expired = jwt.encode(
        {
            "sub": str(user["id"]),
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        __import__("os").environ["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

    assert client.get(
        "/profiles/me",
        headers={"Authorization": f"Bearer {expired}"},
    ).status_code == 401
