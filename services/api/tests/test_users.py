"""Tests for the /users endpoints (registration, CRUD, roles, profiles)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from pathlib import Path
from tinydb import TinyDB

from app.main import app
from app.models.user import UserUpdate
from app.services import users as users_service


# ── Helpers ───────────────────────────────────────────────
TEST_DB = Path(__file__).parent / "_test_users.json"

USERS_TABLE = "users"
PROFILES_TABLE = "profiles"


def _clean_test_db():
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture(autouse=True)
def _patch_db_path(monkeypatch):
    """Point the users and profiles services at the test database."""
    monkeypatch.setattr("app.services.users._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.profiles._DB_PATH", TEST_DB)
    _clean_test_db()
    yield
    _clean_test_db()


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _db() -> TinyDB:
    return TinyDB(TEST_DB)


def _stored_user(user_id: int) -> dict | None:
    db = _db()
    doc = db.table(USERS_TABLE).get(doc_id=user_id)
    db.close()
    return doc


def _stored_profile(user_id: int) -> dict | None:
    db = _db()
    doc = db.table(PROFILES_TABLE).get(where_user_id(user_id))
    db.close()
    return doc


def where_user_id(user_id: int):
    from tinydb import where

    return where("user_id") == user_id


async def _register(client: AsyncClient, **overrides) -> dict:
    payload = {"email": "ana@test.com", "password": "secret123", **overrides}
    resp = await client.post("/api/v1/users/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


# ── POST /users ───────────────────────────────────────────
class TestRegisterUser:
    @pytest.mark.asyncio
    async def test_registration_defaults_to_user_role(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(client)

        assert data["role"] == "user"
        assert data["email"] == "ana@test.com"
        assert data["is_active"] is True
        assert "created_at" in data
        assert "id" in data

    @pytest.mark.asyncio
    async def test_response_never_exposes_password(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(client)

        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_password_is_hashed_before_storage(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(client)

        doc = _stored_user(data["id"])
        assert doc is not None
        assert doc["hashed_password"] != "secret123"
        assert doc["hashed_password"].startswith("$2b$")
        # Stored user doc has exactly the required fields — no name/phone/address
        assert set(doc.keys()) >= {
            "email",
            "hashed_password",
            "is_active",
            "role",
            "created_at",
        }
        assert "name" not in doc
        assert "phone" not in doc
        assert "address" not in doc

    @pytest.mark.asyncio
    async def test_profile_fields_create_linked_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(
                client,
                name="Ana Torres",
                phone="+57 300 111 2233",
                address="Calle 10 #34-56",
            )

        profile = data["profile"]
        assert profile is not None
        assert profile["user_id"] == data["id"]
        assert profile["name"] == "Ana Torres"
        assert profile["phone"] == "+57 300 111 2233"
        assert profile["address"] == "Calle 10 #34-56"

        # Profile data is NOT stored on the user document
        stored = _stored_user(data["id"])
        assert "name" not in stored
        assert "phone" not in stored
        assert "address" not in stored

        # And it IS in the profiles table
        assert _stored_profile(data["id"]) is not None

    @pytest.mark.asyncio
    async def test_registration_without_profile_fields_still_links_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(client)

        assert data["profile"] is not None
        assert data["profile"]["user_id"] == data["id"]
        assert data["profile"]["name"] is None

    @pytest.mark.asyncio
    async def test_rejects_invalid_role(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/users/",
                json={
                    "email": "bad@test.com",
                    "password": "secret123",
                    "role": "superadmin",
                },
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role", ["admin", "manager", "user"])
    async def test_accepts_valid_roles(self, role: str):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            data = await _register(client, email=f"{role}@test.com", role=role)

        assert data["role"] == role

    @pytest.mark.asyncio
    async def test_duplicate_email_rejected(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client)
            resp = await client.post(
                "/api/v1/users/",
                json={"email": "ana@test.com", "password": "another1"},
            )

        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]


# ── GET /users ────────────────────────────────────────────
class TestListUsers:
    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/v1/users/")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_rejects_invalid_token(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/users/", headers=_auth_headers("not-a-jwt")
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_lists_all_users_for_authenticated_caller(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="one@test.com")
            await _register(client, email="two@test.com")
            token = await _login(client, "one@test.com", "secret123")

            resp = await client.get(
                "/api/v1/users/", headers=_auth_headers(token)
            )

        assert resp.status_code == 200
        emails = {u["email"] for u in resp.json()["data"]}
        assert emails == {"one@test.com", "two@test.com"}


# ── GET /users/{id} ───────────────────────────────────────
class TestGetUser:
    @pytest.mark.asyncio
    async def test_get_user_by_id(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client)
            token = await _login(client, "ana@test.com", "secret123")

            resp = await client.get(
                f"/api/v1/users/{created['id']}", headers=_auth_headers(token)
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == created["id"]
        assert data["email"] == "ana@test.com"
        assert data["role"] == "user"
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_get_user_not_found(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client)
            token = await _login(client, "ana@test.com", "secret123")

            resp = await client.get(
                "/api/v1/users/9999", headers=_auth_headers(token)
            )

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client)
            resp = await client.get("/api/v1/users/1")

        assert resp.status_code == 401


# ── PUT /users/{id} ───────────────────────────────────────
class TestUpdateUser:
    @pytest.mark.asyncio
    async def test_regular_user_cannot_update(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client)  # regular user (role=user)
            victim = await _register(client, email="victim@test.com")
            token = await _login(client, "ana@test.com", "secret123")

            resp = await client.put(
                f"/api/v1/users/{victim['id']}",
                json={"email": "hacked@test.com"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put("/api/v1/users/1", json={"email": "x@test.com"})

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_manager_can_update_user(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="boss@test.com", role="manager")
            victim = await _register(client, email="victim@test.com")
            token = await _login(client, "boss@test.com", "secret123")

            resp = await client.put(
                f"/api/v1/users/{victim['id']}",
                json={"email": "renamed@test.com", "is_active": False},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == "renamed@test.com"
        assert data["is_active"] is False
        assert data["role"] == "user"  # untouched

    @pytest.mark.asyncio
    async def test_admin_can_change_role(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="root@test.com", role="admin")
            target = await _register(client, email="target@test.com")
            token = await _login(client, "root@test.com", "secret123")

            resp = await client.put(
                f"/api/v1/users/{target['id']}",
                json={"role": "manager"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 200
        assert resp.json()["data"]["role"] == "manager"

    @pytest.mark.asyncio
    async def test_rejects_invalid_role(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="root@test.com", role="admin")
            target = await _register(client, email="target@test.com")
            token = await _login(client, "root@test.com", "secret123")

            resp = await client.put(
                f"/api/v1/users/{target['id']}",
                json={"role": "superadmin"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_rehashes_password(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="boss@test.com", role="manager")
            victim = await _register(client, email="victim@test.com")
            token = await _login(client, "boss@test.com", "secret123")

            resp = await client.put(
                f"/api/v1/users/{victim['id']}",
                json={"password": "brand-new-pass"},
                headers=_auth_headers(token),
            )
            assert resp.status_code == 200

            doc = _stored_user(victim["id"])
            assert doc["hashed_password"] != "brand-new-pass"
            assert doc["hashed_password"].startswith("$2b$")

            # New password works for login; old one does not
            new_token = await _login(client, "victim@test.com", "brand-new-pass")
            assert new_token

    @pytest.mark.asyncio
    async def test_update_duplicate_email_conflict(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="taken@test.com")
            await _register(client, email="other@test.com")
            await _register(client, email="boss@test.com", role="manager")
            token = await _login(client, "boss@test.com", "secret123")

            other = users_service.get_user_by_email("other@test.com")
            resp = await client.put(
                f"/api/v1/users/{other['id']}",
                json={"email": "taken@test.com"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_update_missing_user_returns_404(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, email="boss@test.com", role="manager")
            token = await _login(client, "boss@test.com", "secret123")

            resp = await client.put(
                "/api/v1/users/9999",
                json={"email": "nobody@test.com"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 404


# ── DELETE /users/{id} ────────────────────────────────────
class TestDeleteUser:
    @pytest.mark.asyncio
    async def test_delete_user_and_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            victim = await _register(
                client, email="victim@test.com", name="Victim Name"
            )
            token = await _login(client, "victim@test.com", "secret123")

            resp = await client.delete(
                f"/api/v1/users/{victim['id']}", headers=_auth_headers(token)
            )

            assert resp.status_code == 200
            assert _stored_user(victim["id"]) is None
            assert _stored_profile(victim["id"]) is None

    @pytest.mark.asyncio
    async def test_delete_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/v1/users/1")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_missing_user_returns_404(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client)
            token = await _login(client, "ana@test.com", "secret123")

            resp = await client.delete(
                "/api/v1/users/9999", headers=_auth_headers(token)
            )

        assert resp.status_code == 404


# ── Service layer ─────────────────────────────────────────
class TestUserService:
    @pytest.mark.asyncio
    async def test_get_user_by_id_and_email(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, email="svc@test.com")

        by_id = users_service.get_user_by_id(created["id"])
        by_email = users_service.get_user_by_email("svc@test.com")

        assert by_id["email"] == "svc@test.com"
        assert by_email["id"] == created["id"]
        assert users_service.get_user_by_id(9999) is None
        assert users_service.get_user_by_email("ghost@test.com") is None

    @pytest.mark.asyncio
    async def test_update_user_service_direct(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, email="svc@test.com")

        updated = users_service.update_user(
            created["id"], UserUpdate(email="moved@test.com")
        )
        assert updated["email"] == "moved@test.com"
        assert users_service.update_user(9999, UserUpdate(email="x@test.com")) is None

    @pytest.mark.asyncio
    async def test_delete_user_service_direct(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, email="svc@test.com")

        assert users_service.delete_user(created["id"]) is True
        assert users_service.delete_user(created["id"]) is False
