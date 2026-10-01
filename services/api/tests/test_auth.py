"""Tests for /auth/login (JWT issuance) and token-protected endpoints."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from pathlib import Path

from app.main import app
from app.models.user import UserUpdate
from app.services import users as users_service


TEST_DB = Path(__file__).parent / "_test_auth.json"


def _clean_test_db():
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture(autouse=True)
def _patch_db_path(monkeypatch):
    monkeypatch.setattr("app.services.users._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.profiles._DB_PATH", TEST_DB)
    _clean_test_db()
    yield
    _clean_test_db()


async def _register(client: AsyncClient, email: str, **overrides) -> dict:
    payload = {"email": email, "password": "secret123", **overrides}
    resp = await client.post("/api/v1/users/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success_returns_token_and_user(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["token_type"] == "bearer"
        assert isinstance(data["access_token"], str) and data["access_token"]
        assert data["user"]["email"] == "ana@test.com"
        assert data["user"]["role"] == "user"
        assert "hashed_password" not in data["user"]

    @pytest.mark.asyncio
    async def test_login_wrong_password(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "wrong-pass"},
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_unknown_email(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "ghost@test.com", "password": "secret123"},
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user_rejected(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            user = users_service.get_user_by_email("ana@test.com")
            users_service.update_user(user["id"], UserUpdate(is_active=False))

            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )

        assert resp.status_code == 401


class TestTokenProtection:
    @pytest.mark.asyncio
    async def test_issued_token_authorizes_protected_endpoints(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )
            token = login.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            resp = await client.get("/api/v1/users/", headers=headers)
            assert resp.status_code == 200

            resp = await client.get("/api/v1/users/1", headers=headers)
            assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_token_of_deleted_user_rejected(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )
            token = login.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Delete the user, then reuse the still-valid JWT
            await client.delete(
                f"/api/v1/users/{created['id']}", headers=headers
            )
            resp = await client.get("/api/v1/users/", headers=headers)

        assert resp.status_code == 401
