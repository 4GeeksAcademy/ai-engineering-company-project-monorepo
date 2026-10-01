from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import database
from main import app


@pytest.fixture

def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATA_DIR", tmp_path)
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "healthcore.json")
    monkeypatch.setenv("SECRET_KEY", "test-secret-that-is-only-used-by-tests-0123456789")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    with TestClient(app) as test_client:
        yield test_client


def register(client: TestClient, email: str = "user@example.com", **kwargs) -> dict:
    payload = {"email": email, "password": "Correct-Horse-42", "name": "Test User", **kwargs}
    response = client.post("/users", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str = "user@example.com") -> str:
    response = client.post("/auth/login", json={"email": email, "password": "Correct-Horse-42"})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client: TestClient) -> dict[str, str]:
    user = register(client, "admin@example.com")
    database.update_user(user["id"], {"role": "admin"})
    return auth_headers(login(client, "admin@example.com"))
