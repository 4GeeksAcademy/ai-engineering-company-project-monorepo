from __future__ import annotations

from datetime import datetime

from services.api.seed import SUPPLIERS_SEED, seed_suppliers


def test_seed_is_idempotent(temp_db_path) -> None:
    first_inserted = seed_suppliers()
    second_inserted = seed_suppliers()

    assert first_inserted == len(SUPPLIERS_SEED)
    assert second_inserted == 0


def test_get_suppliers(client) -> None:
    response = client.get("/suppliers")

    assert response.status_code == 200
    assert response.json() == []


def test_post_and_get_supplier(client) -> None:
    create_response = client.post(
        "/suppliers",
        json={
            "name": "Atlas Carrier",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 9.5,
            "currency": "USD",
            "status": "active",
        },
    )

    assert create_response.status_code == 201
    supplier = create_response.json()
    assert supplier["id"] == 1
    assert supplier["updated_at"]

    get_response = client.get(f"/suppliers/{supplier['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Atlas Carrier"


def test_filters_apply_together(client) -> None:
    seed_suppliers()

    usa_response = client.get("/suppliers", params={"country": "USA"})
    spain_response = client.get("/suppliers", params={"country": "Spain"})
    category_response = client.get("/suppliers", params={"category": "carrier_last_mile"})
    combined_response = client.get(
        "/suppliers",
        params={"country": "Spain", "category": "carrier_last_mile"},
    )

    assert usa_response.status_code == 200
    assert all(item["country"] == "USA" for item in usa_response.json())
    assert spain_response.status_code == 200
    assert all(item["country"] == "Spain" for item in spain_response.json())
    assert category_response.status_code == 200
    assert all("carrier_last_mile" in item["categories"] for item in category_response.json())
    assert combined_response.status_code == 200
    assert all(item["country"] == "Spain" for item in combined_response.json())
    assert all("carrier_last_mile" in item["categories"] for item in combined_response.json())


def test_post_invalid_payload_returns_422(client) -> None:
    response = client.post(
        "/suppliers",
        json={
            "name": "Broken Supplier",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 4.0,
            "currency": "EUR",
            "status": "active",
        },
    )

    assert response.status_code == 422


def test_get_missing_supplier_returns_404(client) -> None:
    response = client.get("/suppliers/999")
    assert response.status_code == 404


def test_patch_rate_updates_timestamp(client) -> None:
    create_response = client.post(
        "/suppliers",
        json={
            "name": "Rate Supplier",
            "country": "Spain",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 3.2,
            "currency": "EUR",
            "status": "active",
        },
    )
    supplier = create_response.json()

    update_response = client.patch(
        f"/suppliers/{supplier['id']}/rate",
        json={"rate_per_shipment": 4.1},
    )

    assert update_response.status_code == 200
    updated_supplier = update_response.json()
    assert updated_supplier["rate_per_shipment"] == 4.1
    assert datetime.fromisoformat(updated_supplier["updated_at"]) > datetime.fromisoformat(supplier["updated_at"])


def test_patch_invalid_rate_returns_422(client) -> None:
    create_response = client.post(
        "/suppliers",
        json={
            "name": "Zero Supplier",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 5.0,
            "currency": "USD",
            "status": "active",
        },
    )
    supplier_id = create_response.json()["id"]

    assert client.patch(f"/suppliers/{supplier_id}/rate", json={"rate_per_shipment": 0}).status_code == 422
    assert client.patch(f"/suppliers/{supplier_id}/rate", json={"rate_per_shipment": -2}).status_code == 422


def test_patch_status_valid_and_invalid(client) -> None:
    create_response = client.post(
        "/suppliers",
        json={
            "name": "Status Supplier",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 5.0,
            "currency": "USD",
            "status": "active",
        },
    )
    supplier_id = create_response.json()["id"]

    update_response = client.patch(f"/suppliers/{supplier_id}/status", json={"status": "suspended"})
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "suspended"

    invalid_response = client.patch(f"/suppliers/{supplier_id}/status", json={"status": "pending"})
    assert invalid_response.status_code == 422


def test_delete_supplier_and_missing_delete(client) -> None:
    create_response = client.post(
        "/suppliers",
        json={
            "name": "Delete Supplier",
            "country": "USA",
            "categories": ["carrier_last_mile"],
            "rate_per_shipment": 5.0,
            "currency": "USD",
            "status": "active",
        },
    )
    supplier_id = create_response.json()["id"]

    delete_response = client.delete(f"/suppliers/{supplier_id}")
    assert delete_response.status_code == 204

    missing_delete_response = client.delete(f"/suppliers/{supplier_id}")
    assert missing_delete_response.status_code == 404
