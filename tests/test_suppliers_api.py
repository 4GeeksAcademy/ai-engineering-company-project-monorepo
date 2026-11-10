"""API-042: Endpoint tests for the /suppliers backoffice resource.

Covers supplier CRUD: create, list (with country/category filters), get by id,
rate/status patches, and deletion. Validation rules are the business logic under
test — e.g. a USA supplier must price in USD and categories must be valid.
"""

from __future__ import annotations


def _supplier_payload(**overrides) -> dict:
    payload = {
        "name": "Acme Logistics",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.25,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "ops@acme.test",
    }
    payload.update(overrides)
    return payload


def _supplier_payload_spain(**overrides) -> dict:
    payload = {
        "name": "Correos Express",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Peninsula",
        "contact_email": "sales@correos.test",
    }
    payload.update(overrides)
    return payload


class TestCreateSupplier:
    def test_happy_path_creates_usa_supplier(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.post("/suppliers", json=_supplier_payload(), headers=headers)
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "Acme Logistics"
        assert body["currency"] == "USD"
        assert body["status"] == "active"
        assert body["id"] > 0

    def test_successful_create_emits_business_event(self, client, auth_headers, monkeypatch):
        from services.api import telemetry

        headers, _ = auth_headers
        events = []
        monkeypatch.setattr(
            telemetry,
            "record_server_event",
            lambda event_type, properties: events.append((event_type, properties)),
        )

        response = client.post("/suppliers", json=_supplier_payload(), headers=headers)

        assert response.status_code == 201
        business_events = [event for event in events if event[0] == "supplier_action_completed"]
        assert business_events == [(
            "supplier_action_completed",
            {"action": "created", "result": "success"},
        )]

    def test_happy_path_creates_spain_supplier(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.post(
            "/suppliers", json=_supplier_payload_spain(), headers=headers
        )
        assert response.status_code == 201
        assert response.json()["currency"] == "EUR"

    def test_failure_usa_supplier_with_eur_is_rejected(self, client, auth_headers):
        """A USA supplier must price in USD — cross-currency is a domain error."""
        headers, _ = auth_headers
        response = client.post(
            "/suppliers", json=_supplier_payload(currency="EUR"), headers=headers
        )
        assert response.status_code == 422

    def test_failure_invalid_category_is_rejected(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.post(
            "/suppliers",
            json=_supplier_payload(categories=["not_a_real_category"]),
            headers=headers,
        )
        assert response.status_code == 422

    def test_failure_unauthenticated_create_is_rejected(self, client):
        response = client.post("/suppliers", json=_supplier_payload())
        assert response.status_code == 401

    def test_failure_non_positive_rate_is_rejected(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.post(
            "/suppliers", json=_supplier_payload(rate_per_shipment=0), headers=headers
        )
        assert response.status_code == 422


class TestListSuppliers:
    def test_happy_path_lists_suppliers(self, client, auth_headers):
        headers, _ = auth_headers
        client.post("/suppliers", json=_supplier_payload(), headers=headers)
        client.post("/suppliers", json=_supplier_payload_spain(), headers=headers)
        response = client.get("/suppliers", headers=headers)
        assert response.status_code == 200
        names = {s["name"] for s in response.json()}
        assert {"Acme Logistics", "Correos Express"} <= names

    def test_edge_case_filters_by_country(self, client, auth_headers):
        headers, _ = auth_headers
        client.post("/suppliers", json=_supplier_payload(), headers=headers)
        client.post("/suppliers", json=_supplier_payload_spain(), headers=headers)
        usa = client.get("/suppliers?country=USA", headers=headers).json()
        spain = client.get("/suppliers?country=Spain", headers=headers).json()
        usa_names = {s["name"] for s in usa}
        spain_names = {s["name"] for s in spain}
        # Created suppliers appear in their country's bucket; the seed data is
        # also present, so we assert membership, not exact equality.
        assert "Acme Logistics" in usa_names
        assert "Correos Express" in spain_names
        assert all(name in usa_names for name in ("UPS Ground", "FedEx Ground"))
        assert all(name in spain_names for name in ("MRW España", "SEUR"))

    def test_edge_case_filters_by_category(self, client, auth_headers):
        headers, _ = auth_headers
        client.post(
            "/suppliers",
            json=_supplier_payload(categories=["packaging_materials"]),
            headers=headers,
        )
        filtered = client.get(
            "/suppliers?category=packaging_materials", headers=headers
        ).json()
        filtered_names = {s["name"] for s in filtered}
        # The created supplier plus the seeded packaging suppliers (seed runs at
        # app startup) must all be returned by the category filter.
        assert "Acme Logistics" in filtered_names
        assert all(name in filtered_names for name in ("PackSource LA", "Embalajes Zaragoza S.L."))

    def test_failure_invalid_category_filter_returns_422(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.get(
            "/suppliers?category=space_shuttle", headers=headers
        )
        assert response.status_code == 422

    def test_failure_unauthenticated_list_is_rejected(self, client):
        assert client.get("/suppliers").status_code == 401


class TestGetSupplier:
    def test_happy_path_gets_supplier_by_id(self, client, auth_headers):
        headers, _ = auth_headers
        created = client.post(
            "/suppliers", json=_supplier_payload(), headers=headers
        ).json()
        response = client.get(f"/suppliers/{created['id']}", headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "Acme Logistics"

    def test_failure_missing_supplier_returns_404(self, client, auth_headers):
        headers, _ = auth_headers
        assert client.get("/suppliers/999999", headers=headers).status_code == 404


class TestPatchSupplierRate:
    def test_happy_path_updates_rate(self, client, auth_headers):
        headers, _ = auth_headers
        created = client.post(
            "/suppliers", json=_supplier_payload(), headers=headers
        ).json()
        response = client.patch(
            f"/suppliers/{created['id']}/rate",
            json={"rate_per_shipment": 8.5},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["rate_per_shipment"] == 8.5

    def test_failure_missing_supplier_returns_404(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.patch(
            "/suppliers/999999/rate", json={"rate_per_shipment": 8.5}, headers=headers
        )
        assert response.status_code == 404

    def test_missing_supplier_failure_emits_business_event(self, client, auth_headers, monkeypatch):
        from services.api import telemetry

        headers, _ = auth_headers
        events = []
        monkeypatch.setattr(
            telemetry,
            "record_server_event",
            lambda event_type, properties: events.append((event_type, properties)),
        )

        response = client.patch(
            "/suppliers/-1/rate", json={"rate_per_shipment": 8.5}, headers=headers
        )

        assert response.status_code == 404
        assert ("supplier_action_completed", {
            "action": "rate_updated", "result": "failure"
        }) in events


class TestPatchSupplierStatus:
    def test_happy_path_suspends_supplier(self, client, auth_headers):
        headers, _ = auth_headers
        created = client.post(
            "/suppliers", json=_supplier_payload(), headers=headers
        ).json()
        response = client.patch(
            f"/suppliers/{created['id']}/status",
            json={"status": "suspended"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "suspended"

    def test_failure_missing_supplier_returns_404(self, client, auth_headers):
        headers, _ = auth_headers
        response = client.patch(
            "/suppliers/999999/status", json={"status": "suspended"}, headers=headers
        )
        assert response.status_code == 404


class TestDeleteSupplier:
    def test_happy_path_deletes_supplier(self, client, auth_headers):
        headers, _ = auth_headers
        created = client.post(
            "/suppliers", json=_supplier_payload(), headers=headers
        ).json()
        response = client.delete(f"/suppliers/{created['id']}", headers=headers)
        assert response.status_code == 200
        assert response.json() == {"deleted": True, "id": created["id"]}

    def test_failure_missing_supplier_returns_404(self, client, auth_headers):
        headers, _ = auth_headers
        assert client.delete("/suppliers/999999", headers=headers).status_code == 404