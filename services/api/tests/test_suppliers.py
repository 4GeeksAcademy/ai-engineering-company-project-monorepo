"""Tests for the suppliers CRUD endpoints."""

from __future__ import annotations

import json
import pytest
from datetime import date
from httpx import ASGITransport, AsyncClient
from pathlib import Path
from tinydb import TinyDB

from app.core.security import create_access_token
from app.main import app


# ── Helpers ───────────────────────────────────────────────
TEST_DB = Path(__file__).parent / "_test_suppliers.json"


def _seed_test_db(docs: list[dict] | None = None) -> TinyDB:
    """Create a fresh test TinyDB and optionally seed it."""
    db = TinyDB(TEST_DB)
    if docs:
        table = db.table("suppliers")
        for doc in docs:
            table.insert(doc)
    return db


def _clean_test_db():
    """Remove the test database file."""
    if TEST_DB.exists():
        TEST_DB.unlink()


AUTH_HEADERS: dict[str, str] = {}


def _seed_staff_token() -> str:
    """Insert an admin user into the test DB and mint a JWT for it."""
    db = TinyDB(TEST_DB)
    uid = db.table("users").insert({
        "email": "staff@test.com",
        "hashed_password": "not-used-by-these-tests",
        "is_active": True,
        "role": "admin",
        "created_at": "2026-01-01T00:00:00+00:00",
    })
    db.table("profiles").insert({
        "user_id": uid, "name": "Staff", "phone": None, "address": None,
    })
    db.close()
    return create_access_token(subject=str(uid), role="admin")


@pytest.fixture(autouse=True)
def _patch_db_path(monkeypatch):
    """Point the suppliers/profiles routers at the test database for every test."""
    monkeypatch.setattr("app.routers.suppliers._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.profiles._DB_PATH", TEST_DB)
    monkeypatch.setattr("app.services.users._DB_PATH", TEST_DB)
    _clean_test_db()
    AUTH_HEADERS.clear()
    AUTH_HEADERS["Authorization"] = f"Bearer {_seed_staff_token()}"
    yield
    _clean_test_db()


# ── Fixtures ──────────────────────────────────────────────
SAMPLE_SUPPLIER = {
    "full_name": "Camila Ospina",
    "email": "camila@test.com",
    "phone": "+57 300 123 4567",
    "country": "Colombia",
    "city": "Medellín",
    "favorite_location": "Brasaland El Poblado",
    "dietary_preferences": ["No restrictions"],
    "how_did_you_find_us": "Social media",
    "date_of_birth": "1990-06-15",
    "accepts_terms": True,
    "wants_email_offers": True,
    "product_category": "Meat",
    "rate": 4.5,
    "status": "active",
}

SECOND_SUPPLIER = {
    "full_name": "Santiago Rodriguez",
    "email": "santiago@test.com",
    "phone": "+57 315 987 6543",
    "country": "Colombia",
    "city": "Bogotá",
    "how_did_you_find_us": "Recommendation",
    "date_of_birth": "1988-03-22",
    "accepts_terms": True,
    "product_category": "Produce",
    "rate": 4.2,
    "status": "suspended",
}

US_SUPPLIER = {
    "full_name": "Maria Fernandez",
    "email": "maria@test.com",
    "phone": "+1 305 555 1234",
    "country": "United States",
    "city": "Miami",
    "how_did_you_find_us": "Walked by",
    "date_of_birth": "1995-11-08",
    "accepts_terms": True,
    "product_category": "Beverages",
    "rate": 3.8,
    "status": "active",
}


# ── POST /suppliers ───────────────────────────────────────
class TestCreateSupplier:
    @pytest.mark.asyncio
    async def test_create_supplier_returns_201(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.post("/api/v1/suppliers/", json=SAMPLE_SUPPLIER)

        assert resp.status_code == 201
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["email"] == "camila@test.com"
        assert data["full_name"] == "Camila Ospina"
        assert data["rate"] == 4.5
        assert data["status"] == "active"
        assert data["product_category"] == "Meat"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_supplier_rejects_duplicate_email(self):
        _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.post("/api/v1/suppliers/", json=SAMPLE_SUPPLIER)

        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_supplier_rejects_invalid_input(self):
        bad = SAMPLE_SUPPLIER.copy()
        bad["email"] = "not-an-email"
        bad["rate"] = -1

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.post("/api/v1/suppliers/", json=bad)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_supplier_rejects_zero_rate(self):
        bad = SAMPLE_SUPPLIER.copy()
        bad["rate"] = 0

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.post("/api/v1/suppliers/", json=bad)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_supplier_rejects_negative_rate(self):
        bad = SAMPLE_SUPPLIER.copy()
        bad["rate"] = -5.0

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.post("/api/v1/suppliers/", json=bad)

        assert resp.status_code == 422


# ── GET /suppliers ────────────────────────────────────────
class TestListSuppliers:
    @pytest.mark.asyncio
    async def test_list_empty(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get("/api/v1/suppliers/")

        assert resp.status_code == 200
        assert resp.json()["data"] == []

    @pytest.mark.asyncio
    async def test_list_returns_all(self):
        _seed_test_db([
            {**SAMPLE_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
            {**SECOND_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
        ])

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get("/api/v1/suppliers/")

        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 2

    @pytest.mark.asyncio
    async def test_list_filter_by_product_category(self):
        _seed_test_db([
            {**SAMPLE_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
            {**SECOND_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
            {**US_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
        ])

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get("/api/v1/suppliers/", params={"product_category": "Meat"})

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["email"] == "camila@test.com"

    @pytest.mark.asyncio
    async def test_list_filter_by_status(self):
        _seed_test_db([
            {**SAMPLE_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
            {**SECOND_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
        ])

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get("/api/v1/suppliers/", params={"status": "suspended"})

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["status"] == "suspended"

    @pytest.mark.asyncio
    async def test_list_filter_combined(self):
        _seed_test_db([
            {**SAMPLE_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
            {**SECOND_SUPPLIER, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"},
        ])

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get(
                "/api/v1/suppliers/",
                params={"product_category": "Meat", "status": "active"},
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1


# ── GET /suppliers/{id} ──────────────────────────────────
class TestGetSupplier:
    @pytest.mark.asyncio
    async def test_get_supplier_by_id(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get(f"/api/v1/suppliers/{doc_id}")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == doc_id
        assert data["email"] == "camila@test.com"

    @pytest.mark.asyncio
    async def test_get_supplier_not_found(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get("/api/v1/suppliers/99999")

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


# ── PATCH /suppliers/{id}/rate ────────────────────────────
class TestUpdateRate:
    @pytest.mark.asyncio
    async def test_update_rate(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/rate", json={"rate": 5.0}
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["rate"] == 5.0
        assert data["updated_at"] != "2026-01-01T00:00:00+00:00"

    @pytest.mark.asyncio
    async def test_update_rate_rejects_zero(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/rate", json={"rate": 0}
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_rate_rejects_negative(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/rate", json={"rate": -3.5}
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_rate_not_found(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                "/api/v1/suppliers/99999/rate", json={"rate": 5.0}
            )

        assert resp.status_code == 404


# ── PATCH /suppliers/{id}/status ──────────────────────────
class TestUpdateStatus:
    @pytest.mark.asyncio
    async def test_suspend_supplier(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/status",
                json={"status": "suspended"},
            )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["status"] == "suspended"
        assert "suspended" in resp.json()["message"]

    @pytest.mark.asyncio
    async def test_activate_supplier(self):
        db = _seed_test_db([{
            **SECOND_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/status",
                json={"status": "active"},
            )

        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_update_status_rejects_invalid_value(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                f"/api/v1/suppliers/{doc_id}/status",
                json={"status": "deleted"},
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_status_not_found(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.patch(
                "/api/v1/suppliers/99999/status",
                json={"status": "active"},
            )

        assert resp.status_code == 404


# ── DELETE /suppliers/{id} ────────────────────────────────
class TestDeleteSupplier:
    @pytest.mark.asyncio
    async def test_delete_supplier(self):
        db = _seed_test_db([{
            **SAMPLE_SUPPLIER,
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }])
        doc_id = db.table("suppliers").all()[0].doc_id
        db.close()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.delete(f"/api/v1/suppliers/{doc_id}")

        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

        # Verify it's gone
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.get(f"/api/v1/suppliers/{doc_id}")

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_supplier_not_found(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=AUTH_HEADERS
        ) as client:
            resp = await client.delete("/api/v1/suppliers/99999")

        assert resp.status_code == 404
