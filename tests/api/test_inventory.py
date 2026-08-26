from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import api.inventory as inventory


@pytest.fixture
def inventory_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    products_path = tmp_path / "products.csv"
    products_path.write_text(
        "product_id,name,quantity,unit,location,weekly_demand\n"
        "1,Arabica beans,42,kg,Downtown,30\n"
        "2,Oat milk,9,liters,Riverside,20\n"
        "3,Paper cups,55,sleeves,Riverside,70\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(inventory, "PRODUCTS_FILE", products_path)
    return products_path


def test_list_inventory(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 3
    assert products[0]["name"] == "Arabica beans"
    assert products[0]["location"] == "Downtown"


def test_list_inventory_filters_by_location(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory", params={"location": "Riverside"})
    assert response.status_code == 200
    products = response.json()
    assert {row["name"] for row in products} == {"Oat milk", "Paper cups"}


def test_add_product_persists_to_csv(client: TestClient, inventory_file: Path) -> None:
    response = client.post(
        "/inventory/9",
        json={
            "name": "Vanilla syrup",
            "quantity": 12,
            "unit": "bottles",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["product_id"] == 9
    assert created["name"] == "Vanilla syrup"
    assert created["quantity"] == 12
    assert created["unit"] == "bottles"

    listed = client.get("/inventory").json()
    assert any(row["name"] == "Vanilla syrup" for row in listed)
    csv_text = inventory_file.read_text(encoding="utf-8")
    assert "Vanilla syrup" in csv_text


def test_add_product_rejects_duplicate_id(client: TestClient, inventory_file: Path) -> None:
    response = client.post(
        "/inventory/1",
        json={"name": "Duplicate beans", "quantity": 1, "unit": "kg"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_add_product_rejects_invalid_body(client: TestClient, inventory_file: Path) -> None:
    response = client.post("/inventory/10", json={"name": "Cups"})
    assert response.status_code == 422
    assert "Invalid request" in response.json()["detail"]


def test_update_stock_unknown_product(client: TestClient, inventory_file: Path) -> None:
    response = client.patch("/inventory/999", json={"delta": 1})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_stock_rejects_negative_quantity(client: TestClient, inventory_file: Path) -> None:
    response = client.patch("/inventory/2", json={"delta": -100})
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


def test_alerts_reject_negative_threshold(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory/alerts", params={"threshold": -1})
    assert response.status_code == 400
    assert "threshold must be 0 or greater" in response.json()["detail"]


def test_update_stock_delivery_and_sale(client: TestClient, inventory_file: Path) -> None:
    delivery = client.patch("/inventory/1", json={"delta": 5})
    assert delivery.status_code == 200
    assert delivery.json()["quantity"] == 47

    sale = client.patch("/inventory/1", json={"delta": -10})
    assert sale.status_code == 200
    assert sale.json()["quantity"] == 37


def test_low_stock_alerts_default_threshold(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory/alerts")
    assert response.status_code == 200
    names = {row["name"] for row in response.json()}
    assert names == {"Oat milk"}


def test_low_stock_alerts_custom_threshold(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory/alerts", params={"threshold": 60})
    assert response.status_code == 200
    names = {row["name"] for row in response.json()}
    assert names == {"Arabica beans", "Oat milk", "Paper cups"}


def test_unknown_location_is_rejected(client: TestClient, inventory_file: Path) -> None:
    response = client.get("/inventory", params={"location": "Airport"})
    assert response.status_code == 400
    assert "Unknown location" in response.json()["detail"]
