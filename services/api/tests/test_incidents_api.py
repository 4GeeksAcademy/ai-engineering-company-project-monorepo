import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from main import app
import routers.auth as auth_router_module
import routers.incidents as incidents_router_module
import routers.users as users_router_module
import security as security_module


REPO_ROOT = Path(__file__).resolve().parents[3]
HISTORICAL_CSV_PATH = (
    REPO_ROOT
    / "content"
    / "contexts"
    / "incidents-file-analysis"
    / "incidents-trackflow.csv"
)

sys.path.insert(0, str(REPO_ROOT / "scripts"))

from seed_incidents import seed_incidents  # noqa: E402


def _insert_incident(table, **overrides):
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "title": "Parcel lost in transit",
        "description": "Customer reports parcel missing since last scan",
        "category": "lost_parcel",
        "status": "open",
        "origin": "customer",
        "branch": "la_office",
        "created_at": now,
        "updated_at": now,
    }
    record.update(overrides)
    return table.insert(record)


@pytest.fixture
def incidents_client(tmp_path, monkeypatch):
    test_db = TinyDB(tmp_path / "test-incidents-db.json")
    test_incidents_table = test_db.table("incidents")
    test_seed_keys_table = test_db.table("incident_seed_keys")
    test_users_table = test_db.table("users")
    test_profiles_table = test_db.table("profiles")

    monkeypatch.setattr(incidents_router_module, "incidents_table", test_incidents_table)
    monkeypatch.setattr(users_router_module, "users_table", test_users_table)
    monkeypatch.setattr(users_router_module, "profiles_table", test_profiles_table)
    monkeypatch.setattr(auth_router_module, "users_table", test_users_table)
    monkeypatch.setattr(security_module, "users_table", test_users_table)

    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-incidents-tests")

    client = TestClient(app)
    client.post(
        "/users",
        json={"email": "incidents-tester@example.com", "password": "incidentspass123"},
    )
    login_response = client.post(
        "/auth/login",
        json={"email": "incidents-tester@example.com", "password": "incidentspass123"},
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    yield client, headers, test_incidents_table, test_seed_keys_table

    test_db.close()


@pytest.fixture
def authed_incidents(incidents_client):
    client, headers, incidents_table, seed_keys_table = incidents_client
    yield client, headers, incidents_table, seed_keys_table


# ══════════════════════════════════════════════
# Auth protection
# ══════════════════════════════════════════════


class TestIncidentsAuthProtection:
    def test_post_without_token_returns_401(self, incidents_client):
        client, _, _, _ = incidents_client
        response = client.post("/incidents", json={
            "title": "x", "description": "y", "category": "lost_parcel",
            "origin": "customer", "branch": "la_office",
        })
        assert response.status_code == 401

    def test_list_without_token_returns_401(self, incidents_client):
        client, _, _, _ = incidents_client
        response = client.get("/incidents")
        assert response.status_code == 401

    def test_summary_without_token_returns_401(self, incidents_client):
        client, _, _, _ = incidents_client
        response = client.get("/incidents/summary")
        assert response.status_code == 401

    def test_detail_without_token_returns_401(self, incidents_client):
        client, _, _, _ = incidents_client
        response = client.get("/incidents/1")
        assert response.status_code == 401

    def test_patch_status_without_token_returns_401(self, incidents_client):
        client, _, _, _ = incidents_client
        response = client.patch("/incidents/1/status", json={"status": "in_progress"})
        assert response.status_code == 401


# ══════════════════════════════════════════════
# POST /incidents
# ══════════════════════════════════════════════


class TestIncidentsCreate:
    def _valid_payload(self, **overrides):
        payload = {
            "title": "Parcel lost in transit",
            "description": "Customer reports parcel missing since last scan",
            "category": "lost_parcel",
            "origin": "customer",
            "branch": "la_office",
        }
        payload.update(overrides)
        return payload

    def test_create_valid_returns_201(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post("/incidents", json=self._valid_payload(), headers=headers)

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert data["created_at"] == data["updated_at"]
        assert data["status"] == "open"

    def test_create_explicit_status(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents",
            json=self._valid_payload(status="in_progress"),
            headers=headers,
        )
        assert response.status_code == 201
        assert response.json()["status"] == "in_progress"

    def test_create_response_has_no_pii(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post("/incidents", json=self._valid_payload(), headers=headers)

        data = response.json()
        assert "customer_email" not in data
        assert "incident_id" not in data

    def test_missing_title_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        payload = self._valid_payload()
        del payload["title"]
        response = client.post("/incidents", json=payload, headers=headers)

        assert response.status_code == 400
        assert response.json()["field"] == "title"

    def test_blank_title_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(title="   "), headers=headers
        )
        assert response.status_code == 400
        assert response.json()["field"] == "title"

    def test_missing_description_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        payload = self._valid_payload()
        del payload["description"]
        response = client.post("/incidents", json=payload, headers=headers)

        assert response.status_code == 400
        assert response.json()["field"] == "description"

    def test_blank_description_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(description="   "), headers=headers
        )
        assert response.status_code == 400
        assert response.json()["field"] == "description"

    def test_invalid_category_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(category="not_a_category"), headers=headers
        )
        assert response.status_code == 400
        body = response.json()
        assert body["field"] == "category"
        assert body["error"] == "validation_error"

    def test_invalid_status_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(status="closed"), headers=headers
        )
        assert response.status_code == 400
        assert response.json()["field"] == "status"

    def test_invalid_origin_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(origin="email"), headers=headers
        )
        assert response.status_code == 400
        assert response.json()["field"] == "origin"

    def test_invalid_branch_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.post(
            "/incidents", json=self._valid_payload(branch="madrid_office"), headers=headers
        )
        assert response.status_code == 400
        assert response.json()["field"] == "branch"


# ══════════════════════════════════════════════
# GET /incidents
# ══════════════════════════════════════════════


class TestIncidentsList:
    def test_empty_db_returns_empty_list(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_list_all(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, status="open")
        _insert_incident(incidents_table, status="resolved")

        response = client.get("/incidents", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_filter_by_status(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, status="open")
        _insert_incident(incidents_table, status="resolved")

        response = client.get("/incidents", params={"status": "open"}, headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["status"] == "open"

    def test_filter_by_origin(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, origin="customer")
        _insert_incident(incidents_table, origin="internal")

        response = client.get("/incidents", params={"origin": "internal"}, headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["origin"] == "internal"

    def test_filter_by_branch(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, branch="la_office")
        _insert_incident(incidents_table, branch="central")

        response = client.get("/incidents", params={"branch": "central"}, headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["branch"] == "central"

    def test_filter_by_category(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, category="lost_parcel")
        _insert_incident(incidents_table, category="carrier_issue")

        response = client.get("/incidents", params={"category": "carrier_issue"}, headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["category"] == "carrier_issue"

    def test_filter_status_and_branch_combined(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, status="open", branch="la_office")
        _insert_incident(incidents_table, status="open", branch="central")
        _insert_incident(incidents_table, status="resolved", branch="la_office")

        response = client.get(
            "/incidents", params={"status": "open", "branch": "la_office"}, headers=headers
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filter_origin_and_category_combined(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, origin="customer", category="lost_parcel")
        _insert_incident(incidents_table, origin="branch", category="lost_parcel")
        _insert_incident(incidents_table, origin="customer", category="carrier_issue")

        response = client.get(
            "/incidents",
            params={"origin": "customer", "category": "lost_parcel"},
            headers=headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filter_multiple_all_four(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(
            incidents_table, status="open", origin="customer",
            branch="la_office", category="lost_parcel",
        )
        _insert_incident(
            incidents_table, status="open", origin="customer",
            branch="la_office", category="carrier_issue",
        )

        response = client.get(
            "/incidents",
            params={
                "status": "open", "origin": "customer",
                "branch": "la_office", "category": "lost_parcel",
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filter_no_matches_returns_empty_list(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, status="open")

        response = client.get("/incidents", params={"status": "discarded"}, headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_invalid_status_filter_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents", params={"status": "bogus"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["field"] == "status"

    def test_invalid_origin_filter_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents", params={"origin": "bogus"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["field"] == "origin"

    def test_invalid_branch_filter_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents", params={"branch": "bogus"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["field"] == "branch"

    def test_invalid_category_filter_returns_400(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents", params={"category": "bogus"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["field"] == "category"


# ══════════════════════════════════════════════
# GET /incidents/{id}
# ══════════════════════════════════════════════


class TestIncidentsDetail:
    def test_existing_returns_200(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        doc_id = _insert_incident(incidents_table)

        response = client.get(f"/incidents/{doc_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["id"] == doc_id

    def test_nonexistent_returns_404(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents/999999", headers=headers)
        assert response.status_code == 404
        assert response.json() == {"detail": "Incident not found"}

    def test_malformed_id_returns_clean_error_not_500(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents/not-an-id", headers=headers)
        assert response.status_code != 500


# ══════════════════════════════════════════════
# PATCH /incidents/{id}/status — lifecycle
# ══════════════════════════════════════════════


class TestIncidentsLifecycle:
    @pytest.mark.parametrize("from_status,to_status", [
        ("open", "in_progress"),
        ("open", "discarded"),
        ("in_progress", "resolved"),
        ("in_progress", "discarded"),
    ])
    def test_valid_transitions(self, authed_incidents, from_status, to_status):
        client, headers, incidents_table, _ = authed_incidents
        doc_id = _insert_incident(incidents_table, status=from_status)

        response = client.patch(
            f"/incidents/{doc_id}/status", json={"status": to_status}, headers=headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == to_status

    @pytest.mark.parametrize("from_status,to_status", [
        ("open", "resolved"),
        ("resolved", "open"),
        ("resolved", "discarded"),
        ("discarded", "open"),
        ("discarded", "in_progress"),
        ("open", "open"),
        ("in_progress", "in_progress"),
        ("resolved", "resolved"),
        ("discarded", "discarded"),
    ])
    def test_invalid_transitions_return_400(self, authed_incidents, from_status, to_status):
        client, headers, incidents_table, _ = authed_incidents
        doc_id = _insert_incident(incidents_table, status=from_status)

        response = client.patch(
            f"/incidents/{doc_id}/status", json={"status": to_status}, headers=headers
        )
        assert response.status_code == 400

    def test_status_update_nonexistent_returns_404(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.patch(
            "/incidents/999999/status", json={"status": "in_progress"}, headers=headers
        )
        assert response.status_code == 404

    def test_status_update_only_changes_status_and_updated_at(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        doc_id = _insert_incident(incidents_table, status="open")

        before = client.get(f"/incidents/{doc_id}", headers=headers).json()

        response = client.patch(
            f"/incidents/{doc_id}/status", json={"status": "in_progress"}, headers=headers
        )
        after = response.json()

        assert response.status_code == 200
        assert after["status"] == "in_progress"
        assert after["created_at"] == before["created_at"]
        assert after["updated_at"] != before["updated_at"]
        assert after["title"] == before["title"]
        assert after["description"] == before["description"]
        assert after["category"] == before["category"]
        assert after["origin"] == before["origin"]
        assert after["branch"] == before["branch"]


# ══════════════════════════════════════════════
# GET /incidents/summary
# ══════════════════════════════════════════════


class TestIncidentsSummary:
    def test_summary_empty(self, authed_incidents):
        client, headers, _, _ = authed_incidents
        response = client.get("/incidents/summary", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["by_status"] == {
            "open": 0, "in_progress": 0, "resolved": 0, "discarded": 0,
        }
        assert data["by_origin"] == {"customer": 0, "branch": 0, "internal": 0}
        assert data["by_branch"] == {
            "central": 0, "la_warehouse": 0, "la_office": 0,
            "zaragoza_warehouse": 0, "zaragoza_office": 0,
        }
        assert set(data["by_category"].keys()) == {
            "lost_parcel", "delivery_failure", "inventory_discrepancy",
            "carrier_issue", "returns_issue", "warehouse_incident",
            "system_failure", "client_complaint", "other",
        }
        assert all(count == 0 for count in data["by_category"].values())

    def test_summary_with_small_dataset(self, authed_incidents):
        client, headers, incidents_table, _ = authed_incidents
        _insert_incident(incidents_table, status="open", category="lost_parcel", origin="customer", branch="la_office")
        _insert_incident(incidents_table, status="resolved", category="carrier_issue", origin="branch", branch="central")

        response = client.get("/incidents/summary", headers=headers)
        data = response.json()

        assert data["total"] == 2
        assert data["by_status"]["open"] == 1
        assert data["by_status"]["resolved"] == 1
        assert data["by_category"]["lost_parcel"] == 1
        assert data["by_category"]["carrier_issue"] == 1
        assert data["by_origin"]["customer"] == 1
        assert data["by_origin"]["branch"] == 1
        assert data["by_branch"]["la_office"] == 1
        assert data["by_branch"]["central"] == 1

    def test_summary_matches_historical_seed(self, authed_incidents):
        client, headers, incidents_table, seed_keys_table = authed_incidents
        seed_incidents(HISTORICAL_CSV_PATH, incidents_table, seed_keys_table)

        response = client.get("/incidents/summary", headers=headers)
        data = response.json()

        assert data["total"] == 95
        assert data["by_status"]["open"] == 29
        assert data["by_status"]["in_progress"] == 0
        assert data["by_status"]["resolved"] == 52
        assert data["by_status"]["discarded"] == 14
        assert data["by_category"]["lost_parcel"] == 14
        assert data["by_category"]["carrier_issue"] == 45
        assert data["by_category"]["delivery_failure"] == 19
        assert data["by_category"]["returns_issue"] == 17
        assert data["by_origin"]["customer"] == 95
        assert data["by_branch"]["la_office"] == 50
        assert data["by_branch"]["zaragoza_office"] == 45


# ══════════════════════════════════════════════
# 500 — unhandled exception
# ══════════════════════════════════════════════


class TestIncidents500:
    def test_unhandled_exception_returns_generic_500(self, authed_incidents, monkeypatch):
        client, headers, _, _ = authed_incidents

        class ExplodingTable:
            def all(self):
                raise RuntimeError("boom: simulated unexpected failure")

        monkeypatch.setattr(incidents_router_module, "incidents_table", ExplodingTable())

        no_raise_client = TestClient(app, raise_server_exceptions=False)
        response = no_raise_client.get("/incidents", headers=headers)

        assert response.status_code == 500
        body = response.json()
        assert body == {"detail": "Internal server error"}

        raw_text = response.text
        assert "Traceback" not in raw_text
        assert "File \"" not in raw_text
        assert ".py" not in raw_text
        assert "/workspaces" not in raw_text
        assert "SECRET_KEY" not in raw_text
        assert "boom: simulated unexpected failure" not in raw_text
