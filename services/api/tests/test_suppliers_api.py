import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from main import app
import routers.suppliers as suppliers_router_module
import routers.auth as auth_router_module
import routers.users as users_router_module
import seed as seed_module
import security as security_module


@pytest.fixture
def client_with_token(tmp_path, monkeypatch):
    """Create a TinyDB test database, seed suppliers, create a test user,
    and return a TestClient plus a valid Authorization header."""

    test_db = TinyDB(tmp_path / "test-db.json")
    test_suppliers_table = test_db.table("suppliers")
    test_users_table = test_db.table("users")
    test_profiles_table = test_db.table("profiles")

    # Patch all modules that reference tables
    monkeypatch.setattr(
        suppliers_router_module,
        "suppliers_table",
        test_suppliers_table,
    )
    monkeypatch.setattr(
        seed_module,
        "suppliers_table",
        test_suppliers_table,
    )
    monkeypatch.setattr(
        users_router_module,
        "users_table",
        test_users_table,
    )
    monkeypatch.setattr(
        users_router_module,
        "profiles_table",
        test_profiles_table,
    )
    monkeypatch.setattr(
        auth_router_module,
        "users_table",
        test_users_table,
    )
    monkeypatch.setattr(
        security_module,
        "users_table",
        test_users_table,
    )

    monkeypatch.setenv(
        "SECRET_KEY",
        "test-secret-key-for-supplier-tests",
    )

    # Seed 15 suppliers
    seed_module.main()

    # Create a test user
    client = TestClient(app)
    client.post(
        "/users",
        json={
            "email": "supplier-tester@example.com",
            "password": "supplierpass123",
        },
    )

    # Login to get a JWT
    login_response = client.post(
        "/auth/login",
        json={
            "email": "supplier-tester@example.com",
            "password": "supplierpass123",
        },
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Return both the client and the auth headers
    yield client, headers

    test_db.close()


@pytest.fixture
def authed_client(client_with_token):
    """Convenience fixture: returns (client, headers)."""
    client, headers = client_with_token
    yield client, headers


# ══════════════════════════════════════════════
# Public endpoints (no token needed)
# ══════════════════════════════════════════════


def test_health(client_with_token):
    client, _ = client_with_token
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ══════════════════════════════════════════════
# 401 Protection tests
# ══════════════════════════════════════════════


class TestSupplierAuthProtection:
    """All supplier endpoints must return 401 without a valid token."""

    def test_get_suppliers_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.get("/suppliers")
        assert response.status_code == 401

    def test_get_supplier_by_id_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.get("/suppliers/1")
        assert response.status_code == 401

    def test_create_supplier_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.post(
            "/suppliers",
            json={"name": "Test", "country": "USA", "categories": ["carrier_last_mile"], "rate_per_shipment": 5.0, "currency": "USD", "status": "active"},
        )
        assert response.status_code == 401

    def test_patch_rate_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.patch(
            "/suppliers/1/rate",
            json={"rate_per_shipment": 10.0},
        )
        assert response.status_code == 401

    def test_patch_status_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.patch(
            "/suppliers/1/status",
            json={"status": "suspended"},
        )
        assert response.status_code == 401

    def test_delete_supplier_without_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.delete("/suppliers/1")
        assert response.status_code == 401

    def test_get_suppliers_with_invalid_token_returns_401(self, client_with_token):
        client, _ = client_with_token
        response = client.get(
            "/suppliers",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401


# ══════════════════════════════════════════════
# Functional tests (authenticated)
# ══════════════════════════════════════════════


class TestSuppliersFunctional:
    """All existing functional tests, now authenticated."""

    def test_seed_has_15_suppliers(self, authed_client):
        client, headers = authed_client
        response = client.get("/suppliers", headers=headers)

        assert response.status_code == 200
        assert len(response.json()) == 15

    def test_get_supplier_by_id(self, authed_client):
        client, headers = authed_client
        response = client.get("/suppliers/1", headers=headers)

        assert response.status_code == 200
        assert response.json()["name"] == "UPS Ground"
        assert response.json()["country"] == "USA"

    def test_get_missing_supplier_returns_404(self, authed_client):
        client, headers = authed_client
        response = client.get("/suppliers/999999", headers=headers)

        assert response.status_code == 404
        assert response.json() == {"detail": "Supplier not found"}

    def test_filter_by_usa(self, authed_client):
        client, headers = authed_client
        response = client.get(
            "/suppliers",
            params={"country": "USA"},
            headers=headers,
        )

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 9
        assert all(
            supplier["country"] == "USA"
            for supplier in data
        )

    def test_filter_by_spain(self, authed_client):
        client, headers = authed_client
        response = client.get(
            "/suppliers",
            params={"country": "Spain"},
            headers=headers,
        )

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 6
        assert all(
            supplier["country"] == "Spain"
            for supplier in data
        )

    def test_filter_by_reverse_logistics(self, authed_client):
        client, headers = authed_client
        response = client.get(
            "/suppliers",
            params={"category": "reverse_logistics"},
            headers=headers,
        )

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 2
        assert all(
            "reverse_logistics" in supplier["categories"]
            for supplier in data
        )

    def test_combined_filters(self, authed_client):
        client, headers = authed_client
        response = client.get(
            "/suppliers",
            params={
                "country": "Spain",
                "category": "carrier_last_mile",
            },
            headers=headers,
        )

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 4

        assert all(
            supplier["country"] == "Spain"
            and "carrier_last_mile" in supplier["categories"]
            for supplier in data
        )

    def test_invalid_country_filter_returns_422(self, authed_client):
        client, headers = authed_client
        response = client.get(
            "/suppliers",
            params={"country": "Chile"},
            headers=headers,
        )

        assert response.status_code == 422

    def test_create_supplier(self, authed_client):
        client, headers = authed_client
        payload = {
            "name": "UPS Ground",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 7.45,
            "currency": "USD",
            "status": "active",
            "service_zone": "West Coast",
            "contact_email": "business@ups.com",
            "notes": (
                "Carrier principal para entregas locales "
                "en Los Ángeles y alrededores."
            ),
        }

        response = client.post(
            "/suppliers",
            json=payload,
            headers=headers,
        )

        data = response.json()

        assert response.status_code == 201
        assert data["name"] == "UPS Ground"
        assert data["id"] == 16
        assert "updated_at" in data

    def test_create_rejects_wrong_currency(self, authed_client):
        client, headers = authed_client
        payload = {
            "name": "UPS Ground",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 7.45,
            "currency": "EUR",
            "status": "active",
        }

        response = client.post(
            "/suppliers",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 422

    def test_create_rejects_empty_categories(self, authed_client):
        client, headers = authed_client
        payload = {
            "name": "UPS Ground",
            "country": "USA",
            "categories": [],
            "rate_per_shipment": 7.45,
            "currency": "USD",
            "status": "active",
        }

        response = client.post(
            "/suppliers",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 422

    def test_rate_must_be_greater_than_zero(self, authed_client):
        client, headers = authed_client
        response = client.patch(
            "/suppliers/1/rate",
            json={"rate_per_shipment": 0},
            headers=headers,
        )

        assert response.status_code == 422

    def test_update_rate_updates_timestamp(self, authed_client):
        client, headers = authed_client
        before = client.get("/suppliers/1", headers=headers).json()

        response = client.patch(
            "/suppliers/1/rate",
            json={"rate_per_shipment": 7.45},
            headers=headers,
        )

        after = response.json()

        assert response.status_code == 200
        assert after["rate_per_shipment"] == 7.45
        assert after["updated_at"] != before["updated_at"]

    def test_status_update_does_not_change_rate_timestamp(self, authed_client):
        client, headers = authed_client
        before = client.get("/suppliers/1", headers=headers).json()

        response = client.patch(
            "/suppliers/1/status",
            json={"status": "suspended"},
            headers=headers,
        )

        after = response.json()

        assert response.status_code == 200
        assert after["status"] == "suspended"
        assert after["updated_at"] == before["updated_at"]

    def test_invalid_status_returns_422(self, authed_client):
        client, headers = authed_client
        response = client.patch(
            "/suppliers/1/status",
            json={"status": "deleted"},
            headers=headers,
        )

        assert response.status_code == 422

    def test_patch_missing_supplier_returns_404(self, authed_client):
        client, headers = authed_client
        response = client.patch(
            "/suppliers/999999/rate",
            json={"rate_per_shipment": 7.45},
            headers=headers,
        )

        assert response.status_code == 404

    def test_delete_supplier(self, authed_client):
        client, headers = authed_client
        response = client.delete("/suppliers/1", headers=headers)

        assert response.status_code == 200
        assert response.json()["name"] == "UPS Ground"

        response = client.get("/suppliers/1", headers=headers)

        assert response.status_code == 404

    def test_delete_missing_supplier_returns_404(self, authed_client):
        client, headers = authed_client
        response = client.delete("/suppliers/999999", headers=headers)

        assert response.status_code == 404

    def test_seed_is_idempotent(self, authed_client):
        client, headers = authed_client
        before = client.get("/suppliers", headers=headers)

        assert len(before.json()) == 15

        seed_module.main()

        after = client.get("/suppliers", headers=headers)

        assert after.status_code == 200
        assert len(after.json()) == 15
