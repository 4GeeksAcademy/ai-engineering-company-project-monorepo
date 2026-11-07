"""Contract tests for the response shapes fixed in the serialization audit
(docs/serialization-audit.md): explicit response_model shape, absence of
sensitive/internal fields, and the envelope forms consumers rely on.

Covers routes that had no response_model at all (incidents list/metrics/
analyze, records list/notes) or an untyped `ApiResponse` wrapper
(auth/login, users, profiles, suppliers) before this change.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

pytestmark = pytest.mark.usefixtures("sql_engine")


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register_and_login(client: AsyncClient, email: str, role: str = "user") -> str:
    resp = await client.post(
        "/api/v1/users/",
        json={"email": email, "password": "secret123", "role": role},
    )
    assert resp.status_code == 201, resp.text

    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "secret123"}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


# ── POST /auth/login ───────────────────────────────────────
class TestLoginContract:
    @pytest.mark.asyncio
    async def test_login_body_has_only_token_fields(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await client.post(
                "/api/v1/users/", json={"email": "ana@test.com", "password": "secret123"}
            )
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "ana@test.com", "password": "secret123"},
            )

        body = resp.json()
        assert set(body.keys()) == {"success", "message", "data"}
        assert set(body["data"].keys()) == {"access_token", "token_type"}


# ── POST /users (registration) ─────────────────────────────
class TestRegistrationContract:
    @pytest.mark.asyncio
    async def test_registration_body_has_no_email_or_password_fields(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/users/",
                json={"email": "ana@test.com", "password": "secret123", "name": "Ana"},
            )

        data = resp.json()["data"]
        assert "email" not in data
        assert "password" not in data
        assert "hashed_password" not in data
        assert set(data.keys()) == {"id", "is_active", "role", "created_at", "profile"}


# ── GET /auth/me ────────────────────────────────────────────
class TestMeContract:
    @pytest.mark.asyncio
    async def test_me_includes_email_and_no_password_fields(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "ana@test.com")
            resp = await client.get("/api/v1/auth/me", headers=_auth_headers(token))

        data = resp.json()["data"]
        assert data["email"] == "ana@test.com"
        assert "password" not in data
        assert "hashed_password" not in data


# ── GET /incidents (list) ──────────────────────────────────
class TestIncidentsListContract:
    @pytest.mark.asyncio
    async def test_list_shape_is_flat_no_success_message_wrapper(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "ana@test.com")
            await client.post(
                "/api/v1/incidents",
                headers=_auth_headers(token),
                json={
                    "title": "Grill down",
                    "description": "Grill stopped heating during service",
                    "category": "EQUIPMENT",
                    "origin": "branch",
                    "branch": "COL-01",
                },
            )
            resp = await client.get("/api/v1/incidents", headers=_auth_headers(token))

        body = resp.json()
        assert set(body.keys()) == {"data", "total", "page", "limit"}
        assert body["total"] == 1
        assert body["data"][0]["title"] == "Grill down"


# ── GET /incidents/metrics ──────────────────────────────────
class TestIncidentMetricsContract:
    @pytest.mark.asyncio
    async def test_metrics_shape_is_data_only_no_success_message(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "boss@test.com", role="manager")
            resp = await client.get(
                "/api/v1/incidents/metrics", headers=_auth_headers(token)
            )

        body = resp.json()
        assert set(body.keys()) == {"data"}
        assert set(body["data"].keys()) == {
            "total",
            "status_counts",
            "category_counts",
            "branch_counts",
            "origin_counts",
            "avg_satisfaction_score",
            "avg_resolution_seconds",
        }


# ── POST /incidents/analyze ──────────────────────────────────
class TestAnalyzeContract:
    @pytest.mark.asyncio
    async def test_analyze_shape_has_no_status_field(self):
        csv_content = (
            "incident_id,date,location_id,category,description,status,reporter_id,"
            "satisfaction_score\n"
            "1,2026-01-01,COL-01,EQUIPMENT,Grill malfunction during lunch,OPEN,MGR-01,\n"
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "ana@test.com")
            resp = await client.post(
                "/api/v1/incidents/analyze",
                headers=_auth_headers(token),
                files={"file": ("incidents.csv", csv_content, "text/csv")},
            )

        body = resp.json()
        assert set(body.keys()) == {"data"}
        assert body["data"]["total_records"] == 1
        assert "status" not in body


# ── GET /records (list) ──────────────────────────────────────
class TestRecordsListContract:
    @pytest.mark.asyncio
    async def test_list_shape_is_flat_no_success_message_wrapper(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "ana@test.com")
            await client.post(
                "/api/v1/records",
                headers=_auth_headers(token),
                json={
                    "full_name": "Carlos Ruiz",
                    "email": "carlos@test.com",
                    "phone": "+57 300 000 0000",
                    "position": "Cook",
                    "experience_years": 2,
                },
            )
            resp = await client.get("/api/v1/records", headers=_auth_headers(token))

        body = resp.json()
        assert set(body.keys()) == {"data", "total", "page", "limit"}
        assert body["data"][0]["full_name"] == "Carlos Ruiz"


# ── /records/{id}/notes ───────────────────────────────────────
class TestRecordNotesContract:
    @pytest.mark.asyncio
    async def test_notes_list_and_create_shapes(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "ana@test.com")
            created = await client.post(
                "/api/v1/records",
                headers=_auth_headers(token),
                json={
                    "full_name": "Carlos Ruiz",
                    "email": "carlos@test.com",
                    "phone": "+57 300 000 0000",
                    "position": "Cook",
                    "experience_years": 2,
                },
            )
            record_id = created.json()["id"]

            note_resp = await client.post(
                f"/api/v1/records/{record_id}/notes",
                headers=_auth_headers(token),
                json={"content": "Strong interview"},
            )
            assert note_resp.status_code == 201
            note_body = note_resp.json()
            # Plain CandidateNote object, no {success,message,data} wrapper.
            assert set(note_body.keys()) == {"id", "record_id", "content", "created_at"}

            list_resp = await client.get(
                f"/api/v1/records/{record_id}/notes", headers=_auth_headers(token)
            )
            list_body = list_resp.json()
            assert set(list_body.keys()) == {"data", "meta"}
            assert list_body["meta"] == {"total": 1}
            assert list_body["data"][0]["content"] == "Strong interview"


# ── Suppliers ─────────────────────────────────────────────────
class TestSuppliersContract:
    @pytest.mark.asyncio
    async def test_supplier_response_matches_declared_fields_exactly(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            token = await _register_and_login(client, "boss@test.com", role="manager")
            resp = await client.post(
                "/api/v1/suppliers",
                headers=_auth_headers(token),
                json={
                    "full_name": "Camila Ospina",
                    "email": "camila@example.com",
                    "phone": "+57 300 123 4567",
                    "country": "Colombia",
                    "city": "Medellín",
                    "how_did_you_find_us": "Recommendation",
                    "date_of_birth": "1990-01-01",
                    "accepts_terms": True,
                    "rate": 4.5,
                },
            )

        assert resp.status_code == 201
        data = resp.json()["data"]
        assert set(data.keys()) == {
            "full_name",
            "email",
            "phone",
            "country",
            "city",
            "favorite_location",
            "dietary_preferences",
            "how_did_you_find_us",
            "date_of_birth",
            "accepts_terms",
            "wants_email_offers",
            "product_category",
            "rate",
            "status",
            "id",
            "created_at",
            "updated_at",
        }
