"""Route protection matrix tests.

Contract:
- Anonymous caller          → 401 Unauthorized on every non-public route
- Authenticated, wrong role → 403 Forbidden when the route needs a higher role
- Authenticated, right role → allowed (non-401/403)

Public routes: POST /api/v1/users, POST /api/v1/auth/login, GET /health.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from pathlib import Path
from tinydb import TinyDB, where
from tinydb.table import Document

from app.core.config import get_settings
from app.core.security import ALGORITHM, create_access_token
from app.main import app

TEST_DB = Path(__file__).parent / "_test_route_protection.json"


def _clean_test_db():
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture(autouse=True)
def _patch_db_path(monkeypatch):
    monkeypatch.setattr("app.services.users._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.profiles._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.routers.suppliers._DB_PATH", TEST_DB)
    _clean_test_db()
    yield
    _clean_test_db()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _token(role: str, *, user_id: int = 1, active: bool = True) -> str:
    """Mint a JWT for a (possibly non-existent) user id with the given role."""
    # Seed the user so get_current_user can resolve it from the DB
    db = TinyDB(TEST_DB)
    table = db.table("users")
    if table.get(doc_id=user_id) is None:
        table.insert(Document(
            {
                "email": f"{role}{user_id}@test.com",
                "hashed_password": "x",
                "is_active": active,
                "role": role,
                "created_at": "2026-01-01T00:00:00+00:00",
            },
            doc_id=user_id,
        ))
    db.close()
    return create_access_token(subject=str(user_id), role=role)


async def _client(**kwargs) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test", **kwargs
    )


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


# ── Protected routes: 401 when anonymous ──────────────────
# Every row is (method, path, body_or_None); body None → no JSON payload.
ANONYMOUS_401_ROUTES = [
    ("GET", "/api/v1/users/", None),
    ("GET", "/api/v1/users/1", None),
    ("PUT", "/api/v1/users/1", {"email": "x@test.com"}),
    ("DELETE", "/api/v1/users/1", None),
    ("GET", "/api/v1/auth/me", None),
    ("GET", "/api/v1/profiles/me", None),
    ("PUT", "/api/v1/profiles/me", {"name": "X"}),
    ("GET", "/api/v1/suppliers/", None),
    ("GET", "/api/v1/suppliers/1", None),
    ("POST", "/api/v1/suppliers/", {"rate": 4.5}),
    ("PATCH", "/api/v1/suppliers/1/rate", {"rate": 4.5}),
    ("PATCH", "/api/v1/suppliers/1/status", {"status": "suspended"}),
    ("DELETE", "/api/v1/suppliers/1", None),
    ("GET", "/api/v1/incidents/result/export", None),
]


class TestAnonymousGets401:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "method,path,body",
        ANONYMOUS_401_ROUTES,
        ids=[f"{m} {p}" for m, p, _ in ANONYMOUS_401_ROUTES],
    )
    async def test_route_returns_401_without_token(
        self, method: str, path: str, body: dict | None
    ):
        async with await _client() as client:
            kwargs = {"json": body} if body is not None else {}
            resp = await client.request(method, path, **kwargs)

        assert resp.status_code == 401, f"{method} {path} → {resp.status_code}"

    @pytest.mark.asyncio
    async def test_incidents_analyze_returns_401_without_token(self):
        async with await _client() as client:
            resp = await client.post(
                "/api/v1/incidents/analyze",
                files={"file": ("data.csv", b"a,b\n1,2", "text/csv")},
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_garbage_token_rejected(self):
        async with await _client() as client:
            resp = await client.get(
                "/api/v1/users/", headers=_headers("not-a-jwt")
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_rejected(self):
        expired_token = jwt.encode(
            {
                "sub": "1",
                "role": "user",
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            },
            get_settings().SECRET_KEY,
            algorithm=ALGORITHM,
        )
        async with await _client() as client:
            resp = await client.get(
                "/api/v1/users/", headers=_headers(expired_token)
            )

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_token_of_inactive_user_rejected(self):
        token = _token("user", user_id=77, active=False)
        async with await _client() as client:
            resp = await client.get("/api/v1/users/", headers=_headers(token))

        assert resp.status_code == 401


# ── Public routes must stay reachable without a token ─────
class TestPublicRoutes:
    @pytest.mark.asyncio
    async def test_health_is_public(self):
        async with await _client() as client:
            resp = await client.get("/health")

        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_register_is_public(self):
        async with await _client() as client:
            resp = await client.post(
                "/api/v1/users/",
                json={"email": "new@test.com", "password": "secret123"},
            )

        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_login_is_public(self):
        async with await _client() as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "nobody@test.com", "password": "secret123"},
            )

        # Public route — reaches credential check, not auth middleware
        assert resp.status_code == 401
        assert "Incorrect email or password" in resp.json()["detail"]


# ── Role escalation: 403 for authenticated non-staff ──────
STAFF_ONLY_403_ROUTES = [
    ("PUT", "/api/v1/users/1", {"email": "changed@test.com"}),
    ("POST", "/api/v1/suppliers/", {"rate": 4.5}),
    ("PATCH", "/api/v1/suppliers/1/rate", {"rate": 4.5}),
    ("PATCH", "/api/v1/suppliers/1/status", {"status": "suspended"}),
    ("DELETE", "/api/v1/suppliers/1", None),
]


class TestUserRoleGets403OnStaffRoutes:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "method,path,body",
        STAFF_ONLY_403_ROUTES,
        ids=[f"{r[0]} {r[1]}" for r in STAFF_ONLY_403_ROUTES],
    )
    async def test_regular_user_forbidden(self, method: str, path: str, body: dict | None):
        token = _token("user", user_id=10)
        async with await _client() as client:
            kwargs = {"json": body} if body is not None else {}
            resp = await client.request(
                method, path, headers=_headers(token), **kwargs
            )

        assert resp.status_code == 403, f"{method} {path} → {resp.status_code}"

    @pytest.mark.asyncio
    async def test_manager_is_allowed_on_staff_routes(self):
        """Manager satisfies require_staff — gets past authorization (404/200)."""
        token = _token("manager", user_id=20)
        async with await _client() as client:
            resp = await client.delete(
                "/api/v1/suppliers/99999", headers=_headers(token)
            )

        assert resp.status_code == 404  # authenticated & authorized; not found

    @pytest.mark.asyncio
    async def test_admin_is_allowed_on_staff_routes(self):
        token = _token("admin", user_id=30)
        async with await _client() as client:
            resp = await client.put(
                "/api/v1/users/99999",
                json={"email": "nobody@test.com"},
                headers=_headers(token),
            )

        assert resp.status_code == 404


# ── /auth/me ──────────────────────────────────────────────
class TestAuthMe:
    @pytest.mark.asyncio
    async def test_requires_authentication(self):
        async with await _client() as client:
            resp = await client.get("/api/v1/auth/me")

        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_returns_authenticated_identity(self):
        async with await _client() as client:
            resp = await client.post(
                "/api/v1/users/",
                json={"email": "me@test.com", "password": "secret123"},
            )
            user_id = resp.json()["data"]["id"]
            token = await _login(client, "me@test.com", "secret123")

            resp = await client.get(
                "/api/v1/auth/me", headers=_headers(token)
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == user_id
        assert data["email"] == "me@test.com"
        assert data["role"] == "user"
        assert "hashed_password" not in data
        assert "password" not in data


# ── Forbidden: accessing resources you do not own ─────────
class TestOwnershipForbidden:
    @pytest.mark.asyncio
    async def test_cannot_update_another_users_credentials(self):
        """A staff member may update anyone; a plain user may update nobody."""
        # Victim user id=1 (regular), attacker logs in as another regular user id=2
        victim_token = _token("user", user_id=1)
        attacker_token = _token("user", user_id=2)

        async with await _client() as client:
            # Attacker tries to modify the victim's account
            resp = await client.put(
                "/api/v1/users/1",
                json={"email": "stolen@test.com"},
                headers=_headers(attacker_token),
            )
            assert resp.status_code == 403

            # Victim also cannot self-escalate role via PUT (non-staff)
            resp = await client.put(
                "/api/v1/users/1",
                json={"role": "admin"},
                headers=_headers(victim_token),
            )
            assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_profile_me_is_scoped_to_own_profile(self):
        """User A's /profiles/me never reads or writes user B's profile."""
        async with await _client() as client:
            # Register B with a profile
            resp = await client.post(
                "/api/v1/users/",
                json={
                    "email": "b@test.com",
                    "password": "secret123",
                    "name": "B's Name",
                },
            )
            b_id = resp.json()["data"]["id"]
            token_b = await _login(client, "b@test.com", "secret123")

            # Token for a different user (A) — minted directly
            token_a = _token("user", user_id=500)

            # A reads their own profile — must NOT be B's
            resp = await client.get(
                "/api/v1/profiles/me", headers=_headers(token_a)
            )
            assert resp.status_code in (200, 404)
            if resp.status_code == 200:
                assert resp.json()["data"]["user_id"] != b_id

            # A writes — must only affect A's row, not B's
            resp = await client.put(
                "/api/v1/profiles/me",
                json={"name": "A's Renamed"},
                headers=_headers(token_a),
            )
            assert resp.status_code in (200, 404)

            db = TinyDB(TEST_DB)
            b_profile = db.table("profiles").get(where("user_id") == b_id)
            db.close()
            if b_profile is not None:
                assert b_profile["name"] == "B's Name"