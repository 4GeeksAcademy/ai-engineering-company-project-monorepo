"""Compatibility tests for the canonical `/api/incidents` prefix.

These confirm the same router/handlers respond identically under both
`/api/incidents` (canonical) and `/incidents` (Vite proxy alias).
"""

import pytest

from test_incidents_api import _insert_incident, incidents_client  # noqa: F401


@pytest.fixture
def api_prefixed_incidents(incidents_client):
    """Re-expose the shared fixture pieces for readability in this file."""
    return incidents_client


class TestApiIncidentsAuthProtection:
    def test_post_without_token_returns_401(self, api_prefixed_incidents):
        client, _, _, _ = api_prefixed_incidents
        response = client.post("/api/incidents", json={
            "title": "x", "description": "y", "category": "lost_parcel",
            "origin": "customer", "branch": "la_office",
        })
        assert response.status_code == 401

    def test_list_without_token_returns_401(self, api_prefixed_incidents):
        client, _, _, _ = api_prefixed_incidents
        response = client.get("/api/incidents")
        assert response.status_code == 401

    def test_summary_without_token_returns_401(self, api_prefixed_incidents):
        client, _, _, _ = api_prefixed_incidents
        response = client.get("/api/incidents/summary")
        assert response.status_code == 401

    def test_detail_without_token_returns_401(self, api_prefixed_incidents):
        client, _, _, _ = api_prefixed_incidents
        response = client.get("/api/incidents/1")
        assert response.status_code == 401

    def test_patch_status_without_token_returns_401(self, api_prefixed_incidents):
        client, _, _, _ = api_prefixed_incidents
        response = client.patch("/api/incidents/1/status", json={"status": "in_progress"})
        assert response.status_code == 401


class TestApiIncidentsSuccess:
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

    def test_create_via_api_prefix_returns_201(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.post("/api/incidents", json=self._valid_payload(), headers=headers)
        assert response.status_code == 201
        assert response.json()["status"] == "open"

    def test_list_via_api_prefix(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        _insert_incident(incidents_table)

        response = client.get("/api/incidents", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_summary_via_api_prefix(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        _insert_incident(incidents_table)

        response = client.get("/api/incidents/summary", headers=headers)
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_detail_via_api_prefix(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        doc_id = _insert_incident(incidents_table)

        response = client.get(f"/api/incidents/{doc_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["id"] == doc_id

    def test_detail_via_api_prefix_not_found(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.get("/api/incidents/999999", headers=headers)
        assert response.status_code == 404

    def test_status_update_via_api_prefix(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        doc_id = _insert_incident(incidents_table, status="open")

        response = client.patch(
            f"/api/incidents/{doc_id}/status", json={"status": "in_progress"}, headers=headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"


class TestApiIncidentsValidation400:
    def test_missing_title_returns_400_via_api_prefix(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.post(
            "/api/incidents",
            json={
                "description": "y", "category": "lost_parcel",
                "origin": "customer", "branch": "la_office",
            },
            headers=headers,
        )
        assert response.status_code == 400
        assert response.json()["field"] == "title"

    def test_invalid_category_returns_400_via_api_prefix(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.post(
            "/api/incidents",
            json={
                "title": "x", "description": "y", "category": "not_a_category",
                "origin": "customer", "branch": "la_office",
            },
            headers=headers,
        )
        assert response.status_code == 400
        assert response.json()["field"] == "category"

    def test_invalid_status_filter_returns_400_via_api_prefix(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.get("/api/incidents", params={"status": "bogus"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["field"] == "status"

    def test_invalid_status_transition_returns_400_via_api_prefix(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        doc_id = _insert_incident(incidents_table, status="resolved")

        response = client.patch(
            f"/api/incidents/{doc_id}/status", json={"status": "open"}, headers=headers
        )
        assert response.status_code == 400


class TestLegacyIncidentsPrefixStillWorks:
    def test_legacy_prefix_list_still_works(self, api_prefixed_incidents):
        client, headers, incidents_table, _ = api_prefixed_incidents
        _insert_incident(incidents_table)

        response = client.get("/incidents", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_legacy_prefix_validation_still_returns_400(self, api_prefixed_incidents):
        client, headers, _, _ = api_prefixed_incidents
        response = client.post(
            "/incidents",
            json={
                "description": "y", "category": "lost_parcel",
                "origin": "customer", "branch": "la_office",
            },
            headers=headers,
        )
        assert response.status_code == 400
        assert response.json()["field"] == "title"
