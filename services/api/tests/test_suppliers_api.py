import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from main import app
import routers.suppliers as suppliers_router_module
import seed as seed_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = TinyDB(tmp_path / "suppliers-test.json")
    test_table = test_db.table("suppliers")

    monkeypatch.setattr(
        suppliers_router_module,
        "suppliers_table",
        test_table,
    )
    monkeypatch.setattr(
        seed_module,
        "suppliers_table",
        test_table,
    )

    seed_module.main()

    with TestClient(app) as test_client:
        yield test_client

    test_db.close()


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_seed_has_15_suppliers(client):
    response = client.get("/suppliers")

    assert response.status_code == 200
    assert len(response.json()) == 15


def test_get_supplier_by_id(client):
    response = client.get("/suppliers/1")

    assert response.status_code == 200
    assert response.json()["name"] == "UPS Ground"
    assert response.json()["country"] == "USA"


def test_get_missing_supplier_returns_404(client):
    response = client.get("/suppliers/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Supplier not found"}


def test_filter_by_usa(client):
    response = client.get(
        "/suppliers",
        params={"country": "USA"},
    )

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 9
    assert all(
        supplier["country"] == "USA"
        for supplier in data
    )


def test_filter_by_spain(client):
    response = client.get(
        "/suppliers",
        params={"country": "Spain"},
    )

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 6
    assert all(
        supplier["country"] == "Spain"
        for supplier in data
    )


def test_filter_by_reverse_logistics(client):
    response = client.get(
        "/suppliers",
        params={"category": "reverse_logistics"},
    )

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 2
    assert all(
        "reverse_logistics" in supplier["categories"]
        for supplier in data
    )


def test_combined_filters(client):
    response = client.get(
        "/suppliers",
        params={
            "country": "Spain",
            "category": "carrier_last_mile",
        },
    )

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 4

    assert all(
        supplier["country"] == "Spain"
        and "carrier_last_mile" in supplier["categories"]
        for supplier in data
    )


def test_invalid_country_filter_returns_422(client):
    response = client.get(
        "/suppliers",
        params={"country": "Chile"},
    )

    assert response.status_code == 422


def test_create_supplier(client):
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
    )

    data = response.json()

    assert response.status_code == 201
    assert data["name"] == "UPS Ground"
    assert data["id"] == 16
    assert "updated_at" in data


def test_create_rejects_wrong_currency(client):
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
    )

    assert response.status_code == 422


def test_create_rejects_empty_categories(client):
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
    )

    assert response.status_code == 422


def test_rate_must_be_greater_than_zero(client):
    response = client.patch(
        "/suppliers/1/rate",
        json={"rate_per_shipment": 0},
    )

    assert response.status_code == 422


def test_update_rate_updates_timestamp(client):
    before = client.get("/suppliers/1").json()

    response = client.patch(
        "/suppliers/1/rate",
        json={"rate_per_shipment": 7.45},
    )

    after = response.json()

    assert response.status_code == 200
    assert after["rate_per_shipment"] == 7.45
    assert after["updated_at"] != before["updated_at"]


def test_status_update_does_not_change_rate_timestamp(client):
    before = client.get("/suppliers/1").json()

    response = client.patch(
        "/suppliers/1/status",
        json={"status": "suspended"},
    )

    after = response.json()

    assert response.status_code == 200
    assert after["status"] == "suspended"
    assert after["updated_at"] == before["updated_at"]


def test_invalid_status_returns_422(client):
    response = client.patch(
        "/suppliers/1/status",
        json={"status": "deleted"},
    )

    assert response.status_code == 422


def test_patch_missing_supplier_returns_404(client):
    response = client.patch(
        "/suppliers/999999/rate",
        json={"rate_per_shipment": 7.45},
    )

    assert response.status_code == 404


def test_delete_supplier(client):
    response = client.delete("/suppliers/1")

    assert response.status_code == 200
    assert response.json()["name"] == "UPS Ground"

    response = client.get("/suppliers/1")

    assert response.status_code == 404


def test_delete_missing_supplier_returns_404(client):
    response = client.delete("/suppliers/999999")

    assert response.status_code == 404


def test_seed_is_idempotent(client):
    before = client.get("/suppliers")

    assert len(before.json()) == 15

    seed_module.main()

    after = client.get("/suppliers")

    assert after.status_code == 200
    assert len(after.json()) == 15
