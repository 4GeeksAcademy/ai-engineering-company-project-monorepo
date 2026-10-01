"""Tests for the /profiles/me endpoints (owner-only profile access)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from pathlib import Path
from tinydb import TinyDB, where

from app.main import app
from app.models.profile import ProfileUpdate
from app.services import profiles as profiles_service
from app.services import users as users_service


TEST_DB = Path(__file__).parent / "_test_profiles.json"


def _clean_test_db():
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture(autouse=True)
def _patch_db_path(monkeypatch):
    """Point both the users and profiles services at the test database."""
    monkeypatch.setattr("app.services.users._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.profiles._DB_PATH", TEST_DB)
    _clean_test_db()
    yield
    _clean_test_db()


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register(client: AsyncClient, email: str, **overrides) -> dict:
    payload = {"email": email, "password": "secret123", **overrides}
    resp = await client.post("/api/v1/users/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def _login(client: AsyncClient, email: str, password: str = "secret123") -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _stored_profile(user_id: int) -> dict | None:
    db = TinyDB(TEST_DB)
    doc = db.table("profiles").get(where("user_id") == user_id)
    db.close()
    return doc


# ── GET /profiles/me ──────────────────────────────────────
class TestGetMyProfile:
    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/v1/profiles/me")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_returns_own_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(
                client,
                "ana@test.com",
                name="Ana Torres",
                phone="+57 300 111 2233",
                address="Calle 10 #34-56",
            )
            token = await _login(client, "ana@test.com")

            resp = await client.get(
                "/api/v1/profiles/me", headers=_auth_headers(token)
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["user_id"] == created["id"]
        assert data["name"] == "Ana Torres"
        assert data["phone"] == "+57 300 111 2233"
        assert data["address"] == "Calle 10 #34-56"

    @pytest.mark.asyncio
    async def test_returns_own_profile_not_someone_elses(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com", name="Ana Torres")
            other = await _register(client, "other@test.com", name="Other Person")
            token = await _login(client, "ana@test.com")

            resp = await client.get(
                "/api/v1/profiles/me", headers=_auth_headers(token)
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["user_id"] != other["id"]
        assert data["name"] == "Ana Torres"

    @pytest.mark.asyncio
    async def test_returns_404_when_profile_missing(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")
            token = await _login(client, "ana@test.com")

            # Remove the linked profile directly (simulates legacy user)
            profiles_service.delete_profile_by_user_id(created["id"])

            resp = await client.get(
                "/api/v1/profiles/me", headers=_auth_headers(token)
            )

        assert resp.status_code == 404


# ── PUT /profiles/me ──────────────────────────────────────
class TestUpdateMyProfile:
    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/v1/profiles/me", json={"name": "Hacker"}
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_updates_own_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com", name="Ana Torres")
            token = await _login(client, "ana@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={
                    "name": "Ana Maria Torres",
                    "phone": "+57 310 555 0001",
                    "address": "Carrera 43A #18-11",
                },
                headers=_auth_headers(token),
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["user_id"] == created["id"]
        assert data["name"] == "Ana Maria Torres"
        assert data["phone"] == "+57 310 555 0001"
        assert data["address"] == "Carrera 43A #18-11"

        stored = _stored_profile(created["id"])
        assert stored["name"] == "Ana Maria Torres"
        assert stored["phone"] == "+57 310 555 0001"
        assert stored["address"] == "Carrera 43A #18-11"

    @pytest.mark.asyncio
    async def test_partial_update_leaves_other_fields(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(
                client,
                "ana@test.com",
                name="Ana Torres",
                phone="+57 300 111 2233",
                address="Calle 10 #34-56",
            )
            token = await _login(client, "ana@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"phone": "+57 310 555 0001"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["phone"] == "+57 310 555 0001"
        # Untouched fields preserved
        assert data["name"] == "Ana Torres"
        assert data["address"] == "Calle 10 #34-56"

    @pytest.mark.asyncio
    async def test_explicit_null_clears_field(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com", address="Calle 10")
            token = await _login(client, "ana@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"address": None},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 200
        assert resp.json()["data"]["address"] is None
        assert _stored_profile(created["id"])["address"] is None

    @pytest.mark.asyncio
    async def test_update_does_not_affect_other_profiles(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            victim = await _register(client, "victim@test.com", name="Victim Name")
            await _register(client, "attacker@test.com", name="Attacker")
            token = await _login(client, "attacker@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"name": "Attacker Renamed"},
                headers=_auth_headers(token),
            )

            assert resp.status_code == 200
            # Victim's profile untouched
            victim_profile = _stored_profile(victim["id"])
            assert victim_profile["name"] == "Victim Name"
            # Attacker's own profile was updated
            attacker_profile = profiles_service.get_profile_by_user_id(
                users_service.get_user_by_email("attacker@test.com")["id"]
            )
            assert attacker_profile["name"] == "Attacker Renamed"

    @pytest.mark.asyncio
    async def test_update_404_when_profile_missing(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")
            token = await _login(client, "ana@test.com")
            profiles_service.delete_profile_by_user_id(created["id"])

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"name": "Ghost"},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_rejects_unknown_fields(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            token = await _login(client, "ana@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"role": "admin", "user_id": 999},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_rejects_oversized_values(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await _register(client, "ana@test.com")
            token = await _login(client, "ana@test.com")

            resp = await client.put(
                "/api/v1/profiles/me",
                json={"name": "x" * 101},
                headers=_auth_headers(token),
            )

        assert resp.status_code == 422


# ── Service layer / one-to-one invariant ──────────────────
class TestProfileService:
    @pytest.mark.asyncio
    async def test_profile_created_one_to_one_with_user(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com", name="Ana")

        db = TinyDB(TEST_DB)
        profiles = db.table("profiles").all()
        db.close()

        assert len(profiles) == 1
        assert profiles[0]["user_id"] == created["id"]

    @pytest.mark.asyncio
    async def test_create_profile_rejects_duplicate_user_id(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")

        with pytest.raises(ValueError, match="already has a profile"):
            profiles_service.create_profile(created["id"], name="Dup")

    @pytest.mark.asyncio
    async def test_update_profile_service_direct(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")

        updated = profiles_service.update_profile(
            created["id"], ProfileUpdate(name="Service Name")
        )
        assert updated["name"] == "Service Name"
        assert (
            profiles_service.update_profile(9999, ProfileUpdate(name="X")) is None
        )

    @pytest.mark.asyncio
    async def test_get_profile_by_user_id_service(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com", name="Ana Torres")

        profile = profiles_service.get_profile_by_user_id(created["id"])
        assert profile["name"] == "Ana Torres"
        assert profiles_service.get_profile_by_user_id(9999) is None

    @pytest.mark.asyncio
    async def test_delete_user_cascades_profile(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await _register(client, "ana@test.com")

        assert users_service.delete_user(created["id"]) is True
        assert profiles_service.get_profile_by_user_id(created["id"]) is None
