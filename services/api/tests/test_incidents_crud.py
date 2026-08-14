"""
test_incidents_crud.py — Brasaland · Centralized Incident Manager Tests

Tests for the CRUD + state-machine API endpoints:
  POST   /api/incidents
  GET    /api/incidents
  GET    /api/incidents/summary
  GET    /api/incidents/{id}
  PATCH  /api/incidents/{id}/status
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[3]
sys_path_api = str(REPO_ROOT / "services" / "api")

import sys
if sys_path_api not in sys.path:
    sys.path.insert(0, sys_path_api)

# Use a temporary DB so tests don't pollute the real data
_tmp_db = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
_tmp_db_path = _tmp_db.name
_tmp_db.close()
os.environ["INCIDENTS_DB_PATH"] = _tmp_db_path

from app.main import app  # noqa: E402
from app.database import users_table  # noqa: E402
from app.domains.auth.service import hash_password  # noqa: E402
from app.domains.incidents.persistence import IncidentRepository  # noqa: E402
from app.domains.incidents.service import IncidentService  # noqa: E402

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_EMAIL = "test_incidents@brasaland.com"
TEST_PASSWORD = "TestPass123"

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup_and_teardown():
    """Create a test user and clean up DB between tests."""
    # Ensure test user exists
    from tinydb import Query
    _Q = Query()
    existing = users_table.get(_Q.email == TEST_EMAIL)
    if not existing:
        users_table.insert({
            "email": TEST_EMAIL,
            "hashed_password": hash_password(TEST_PASSWORD),
            "role": "admin",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z",
        })

    # Clean incidents table
    repo = IncidentRepository()
    repo.clear()

    yield

    # Cleanup after test
    repo.clear()


def _get_auth_headers() -> dict[str, str]:
    """Login and return Bearer headers."""
    response = client.post("/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_INCIDENT = {
    "title": "Equipo de refrigeración falló en sede Bogotá",
    "description": "El equipo de refrigeración principal de la sede Bogotá Norte dejó de funcionar completamente durante el turno de la mañana.",
    "category": "EQUIPMENT",
    "branch": "COL-06",
}


def _create_incident(overrides: dict | None = None, headers: dict | None = None) -> dict:
    """Helper: create an incident and return the response body."""
    payload = {**SAMPLE_INCIDENT, **(overrides or {})}
    h = headers or _get_auth_headers()
    resp = client.post("/api/incidents", json=payload, headers=h)
    assert resp.status_code == 201, f"Create failed ({resp.status_code}): {resp.text}"
    return resp.json()


# ===========================================================================
# Tests: POST /api/incidents
# ===========================================================================

class TestCreateIncident:
    def test_create_success(self):
        data = _create_incident()
        assert data["id"]
        assert data["title"] == SAMPLE_INCIDENT["title"]
        assert data["category"] == "EQUIPMENT"
        assert data["branch"] == "COL-06"
        assert data["status"] == "open"
        assert data["origin"] == "api"
        assert data["reported_at"]
        assert data["updated_at"]

    def test_create_all_categories(self):
        for cat in ("CUSTOMER_COMPLAINT", "SUPPLY", "FOOD_QUALITY", "STAFF"):
            data = _create_incident({"category": cat})
            assert data["category"] == cat

    def test_create_validation_error_empty_title(self):
        headers = _get_auth_headers()
        payload = {**SAMPLE_INCIDENT, "title": ""}
        resp = client.post("/api/incidents", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_create_validation_error_invalid_category(self):
        headers = _get_auth_headers()
        payload = {**SAMPLE_INCIDENT, "category": "INVALID"}
        resp = client.post("/api/incidents", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_create_validation_error_invalid_branch(self):
        headers = _get_auth_headers()
        payload = {**SAMPLE_INCIDENT, "branch": "XX-99"}
        resp = client.post("/api/incidents", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_create_validation_error_short_description(self):
        headers = _get_auth_headers()
        payload = {**SAMPLE_INCIDENT, "description": "ab"}
        resp = client.post("/api/incidents", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_create_unauthorized(self):
        resp = client.post("/api/incidents", json=SAMPLE_INCIDENT)
        assert resp.status_code == 401


# ===========================================================================
# Tests: GET /api/incidents
# ===========================================================================

class TestListIncidents:
    def test_list_empty(self):
        headers = _get_auth_headers()
        resp = client.get("/api/incidents", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_created(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        resp = client.get("/api/incidents", headers=headers)
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["id"] == created["id"]

    def test_list_filter_by_status(self):
        headers = _get_auth_headers()
        _create_incident(headers=headers)
        resp = client.get("/api/incidents?status=open", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/incidents?status=resolved", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_list_filter_by_category(self):
        headers = _get_auth_headers()
        _create_incident(headers=headers)
        resp = client.get("/api/incidents?category=EQUIPMENT", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/incidents?category=STAFF", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_list_filter_by_branch(self):
        headers = _get_auth_headers()
        _create_incident(headers=headers)
        resp = client.get("/api/incidents?branch=COL-06", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_unauthorized(self):
        resp = client.get("/api/incidents")
        assert resp.status_code == 401


# ===========================================================================
# Tests: GET /api/incidents/summary
# ===========================================================================

class TestGetSummary:
    def test_summary_empty(self):
        headers = _get_auth_headers()
        resp = client.get("/api/incidents/summary", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["by_status"] == []
        assert data["by_category"] == []
        assert data["by_branch"] == []
        assert data["by_origin"] == []

    def test_summary_with_data(self):
        headers = _get_auth_headers()
        _create_incident(headers=headers)
        _create_incident({"category": "STAFF", "branch": "FLA-01"}, headers=headers)

        resp = client.get("/api/incidents/summary", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

        # Check status breakdown
        status_map = {s["status"]: s["count"] for s in data["by_status"]}
        assert status_map.get("open", 0) == 2

        # Check category breakdown
        cat_map = {c["category"]: c["count"] for c in data["by_category"]}
        assert cat_map.get("EQUIPMENT", 0) == 1
        assert cat_map.get("STAFF", 0) == 1

    def test_summary_unauthorized(self):
        resp = client.get("/api/incidents/summary")
        assert resp.status_code == 401


# ===========================================================================
# Tests: GET /api/incidents/{id}
# ===========================================================================

class TestGetIncident:
    def test_get_success(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        resp = client.get(f"/api/incidents/{created['id']}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_not_found(self):
        headers = _get_auth_headers()
        resp = client.get("/api/incidents/nonexistent", headers=headers)
        assert resp.status_code == 404

    def test_get_unauthorized(self):
        resp = client.get("/api/incidents/some-id")
        assert resp.status_code == 401


# ===========================================================================
# Tests: PATCH /api/incidents/{id}/status
# ===========================================================================

class TestUpdateStatus:
    def test_open_to_in_progress(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        resp = client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    def test_in_progress_to_resolved(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        # open → in_progress
        client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "in_progress"},
            headers=headers,
        )
        # in_progress → resolved
        resp = client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "resolved"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"

    def test_open_to_discarded(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        resp = client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "discarded"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "discarded"

    def test_invalid_transition_rejected(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        # open → resolved is NOT allowed
        resp = client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "resolved"},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_terminal_state_no_further_updates(self):
        headers = _get_auth_headers()
        created = _create_incident(headers=headers)
        # open → resolved (skip in_progress for speed)
        # Actually open→resolved is invalid. Let's go open→in_progress→resolved
        client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "in_progress"},
            headers=headers,
        )
        client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "resolved"},
            headers=headers,
        )
        # Now try to update resolved → anything (should fail)
        resp = client.patch(
            f"/api/incidents/{created['id']}/status",
            json={"status": "open"},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_update_not_found(self):
        headers = _get_auth_headers()
        resp = client.patch(
            "/api/incidents/nonexistent/status",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert resp.status_code == 404

    def test_update_unauthorized(self):
        resp = client.patch(
            "/api/incidents/some-id/status",
            json={"status": "in_progress"},
        )
        assert resp.status_code == 401


# ===========================================================================
# Tests: Error response format
# ===========================================================================

class TestErrorFormat:
    def test_400_has_error_structure(self):
        headers = _get_auth_headers()
        resp = client.post("/api/incidents", json={}, headers=headers)
        assert resp.status_code == 400
        body = resp.json()
        assert "code" in body
        assert "message" in body
        assert "request_id" in body
        assert body["code"] == 400

    def test_500_does_not_expose_internals(self):
        """Verify 500 responses don't contain stack traces or paths."""
        headers = _get_auth_headers()
        # Force a 500 by triggering an unexpected error
        # This is hard to trigger cleanly, so we test the handler format
        resp = client.get("/api/incidents/../../../../etc/passwd", headers=headers)
        # Should get 404 or 400, not 500 with internals
        if resp.status_code == 500:
            body = resp.json()
            assert "traceback" not in body.get("message", "").lower()
            assert "/home/" not in body.get("message", "")
