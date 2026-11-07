"""Tests for /auth/login (JWT issuance) and token-protected endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.models.password_reset_token_storage import password_reset_tokens_table
from app.models.user import UserUpdate
from app.services import users as users_service

pytestmark = pytest.mark.usefixtures("sql_engine")


async def _register(client: AsyncClient, email: str, **overrides) -> dict:
    payload = {"email": email, "password": "secret123", **overrides}
    resp = await client.post("/api/v1/users/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success_returns_token_only(self):
        """Login returns only the token — no user object (no email, no
        password fields) in the body. See docs/serialization-audit.md:
        no consumer in the repo reads anything beyond access_token/
        token_type from this response; identity is fetched separately via
        GET /auth/me."""
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
        assert set(data.keys()) == {"access_token", "token_type"}

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


class TestPasswordRecovery:
    @pytest.mark.asyncio
    async def test_forgot_password_has_generic_response_and_sends_reset_link(
        self, monkeypatch
    ):
        sent: list[tuple[str, str]] = []
        monkeypatch.setattr(
            "app.routers.auth.send_password_reset_email",
            lambda email, url: sent.append((email, url)),
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            existing = await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "ana@test.com"},
            )
            unknown = await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "unknown@test.com"},
            )

        assert existing.status_code == 200
        assert unknown.status_code == 200
        assert existing.json()["message"] == unknown.json()["message"]
        assert len(sent) == 1
        assert sent[0][0] == "ana@test.com"
        assert "/reset-password?token=" in sent[0][1]

        from app.services.password_resets import engine

        with engine.connect() as conn:
            token_row = conn.execute(select(password_reset_tokens_table)).first()
        lifetime = token_row.expires_at - token_row.created_at
        assert lifetime == timedelta(minutes=15)
        assert "token=" not in token_row.token_hash

    @pytest.mark.asyncio
    async def test_reset_token_changes_password_and_cannot_be_reused(self, monkeypatch):
        reset_urls: list[str] = []
        monkeypatch.setattr(
            "app.routers.auth.send_password_reset_email",
            lambda _email, url: reset_urls.append(url),
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "ana@test.com"},
            )
            token = reset_urls[0].split("token=", 1)[1]
            reset = await client.post(
                "/api/v1/auth/reset-password",
                json={"token": token, "new_password": "new-secret-123"},
            )
            reused = await client.post(
                "/api/v1/auth/reset-password",
                json={"token": token, "new_password": "another-secret-123"},
            )
            old_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )
            new_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "new-secret-123"},
            )

        assert reset.status_code == 200
        assert reused.status_code == 400
        assert old_login.status_code == 401
        assert new_login.status_code == 200

    @pytest.mark.asyncio
    async def test_expired_reset_token_is_rejected(self, monkeypatch):
        reset_urls: list[str] = []
        monkeypatch.setattr(
            "app.routers.auth.send_password_reset_email",
            lambda _email, url: reset_urls.append(url),
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "ana@test.com"},
            )
            token = reset_urls[0].split("token=", 1)[1]

            from sqlalchemy import update

            from app.services.password_resets import engine

            with engine.connect() as conn:
                token_row = conn.execute(select(password_reset_tokens_table)).first()
                conn.execute(
                    update(password_reset_tokens_table)
                    .where(password_reset_tokens_table.c.id == token_row.id)
                    .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
                )
                conn.commit()

            response = await client.post(
                "/api/v1/auth/reset-password",
                json={"token": token, "new_password": "new-secret-123"},
            )

        assert response.status_code == 400


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_authenticated_user_can_change_password(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )
            headers = {
                "Authorization": f"Bearer {login.json()['data']['access_token']}"
            }
            changed = await client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={
                    "current_password": "secret123",
                    "new_password": "new-secret-123",
                },
            )
            new_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "new-secret-123"},
            )

        assert changed.status_code == 200
        assert new_login.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_rejects_wrong_current_password(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )
            headers = {
                "Authorization": f"Bearer {login.json()['data']['access_token']}"
            }
            response = await client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={
                    "current_password": "wrong-password",
                    "new_password": "new-secret-123",
                },
            )

        assert response.status_code == 400
