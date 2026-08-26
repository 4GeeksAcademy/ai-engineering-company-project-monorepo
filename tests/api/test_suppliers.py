from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

import database
import models


@pytest.fixture
def suppliers_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "suppliers.json"
    monkeypatch.setattr(database, "SUPPLIERS_FILE", path)
    database.seed_suppliers_file()
    return path


def test_supplier_model_matches_context_md() -> None:
    assert tuple(models.SupplierInput.model_fields) == (
        "name",
        "country",
        "product_categories",
        "emergency_surcharge_pct",
        "status",
    )
    assert tuple(models.SupplierResponse.model_fields) == (
        "id",
        "supplier_id",
        "name",
        "country",
        "product_categories",
        "emergency_surcharge_pct",
        "status",
        "updated_at",
    )
    assert models.PRODUCT_CATEGORIES == (
        "proteins",
        "vegetables_and_fruit",
        "beverages_and_packaging",
        "imported_sauces_and_condiments",
    )
    assert models.STATUSES == ("active", "preferred", "inactive")
    assert "updated_at" not in models.SupplierInput.model_fields
    assert "supplier_id" not in models.SupplierInput.model_fields
    assert "id" not in models.SupplierInput.model_fields
    assert "updated_at" not in models.SupplierUpdate.model_fields
    assert "supplier_id" not in models.SupplierUpdate.model_fields


def test_seeder_loads_context_suppliers(client: TestClient, suppliers_file: Path) -> None:
    response = client.get("/suppliers")
    assert response.status_code == 200
    rows = response.json()
    assert [row["supplier_id"] for row in rows] == [item["supplier_id"] for item in models.SEED_SUPPLIERS]
    for row in rows:
        models.SupplierResponse.model_validate(row)
        assert set(row["product_categories"]) <= set(models.PRODUCT_CATEGORIES)
        assert row["status"] in models.STATUSES
        assert isinstance(row["id"], int)
        assert row["id"] >= 1
    assert suppliers_file.exists()


def test_list_suppliers_returns_all_when_unfiltered(client: TestClient, suppliers_file: Path) -> None:
    response = client.get("/suppliers")
    assert response.status_code == 200
    assert [row["supplier_id"] for row in response.json()] == [
        item["supplier_id"] for item in models.SEED_SUPPLIERS
    ]


def test_list_suppliers_filters_category_and_status(client: TestClient, suppliers_file: Path) -> None:
    proteins = client.get("/suppliers", params={"category": "proteins"})
    assert proteins.status_code == 200
    assert {row["supplier_id"] for row in proteins.json()} == {"SUP-001", "SUP-002"}

    inactive = client.get("/suppliers", params={"status": "inactive"})
    assert inactive.status_code == 200
    assert [row["supplier_id"] for row in inactive.json()] == ["SUP-006"]

    colombia = client.get("/suppliers", params={"country": "Colombia"})
    assert colombia.status_code == 200
    assert {row["supplier_id"] for row in colombia.json()} == {
        "SUP-001",
        "SUP-003",
        "SUP-005",
        "SUP-006",
    }
    assert all(row["country"] == "Colombia" for row in colombia.json())

    united_states = client.get("/suppliers", params={"country": "United States"})
    assert united_states.status_code == 200
    assert {row["supplier_id"] for row in united_states.json()} == {"SUP-002", "SUP-004"}

    unknown_country = client.get("/suppliers", params={"country": "Mexico"})
    assert unknown_country.status_code == 400

    unknown = client.get("/suppliers", params={"category": "office_supplies"})
    assert unknown.status_code == 400


def test_get_supplier_and_not_found(client: TestClient, suppliers_file: Path) -> None:
    by_code = client.get("/suppliers/SUP-004")
    assert by_code.status_code == 200
    assert by_code.json()["name"] == "Gulf Coast Produce"
    assert by_code.json()["country"] == "United States"
    assert by_code.json()["emergency_surcharge_pct"] == 8

    tinydb_id = by_code.json()["id"]
    by_id = client.get(f"/suppliers/{tinydb_id}")
    assert by_id.status_code == 200
    assert by_id.json() == by_code.json()

    missing_code = client.get("/suppliers/SUP-999")
    assert missing_code.status_code == 404
    assert "not found" in missing_code.json()["detail"]

    missing_id = client.get("/suppliers/999999")
    assert missing_id.status_code == 404
    assert "not found" in missing_id.json()["detail"]


def test_create_supplier_assigns_next_id_and_updated_at(client: TestClient, suppliers_file: Path) -> None:
    response = client.post(
        "/suppliers",
        json={
            "name": "Andean Bottling",
            "country": "Colombia",
            "product_categories": ["beverages_and_packaging"],
            "emergency_surcharge_pct": 8,
            "status": "active",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["supplier_id"] == "SUP-007"
    assert isinstance(created["id"], int)
    assert created["id"] >= 1
    stored = next(row for row in client.get("/suppliers").json() if row["supplier_id"] == "SUP-007")
    assert stored["id"] == created["id"]


def test_create_rejects_invalid_category(client: TestClient, suppliers_file: Path) -> None:
    response = client.post(
        "/suppliers",
        json={
            "name": "Bad Vendor",
            "country": "United States",
            "product_categories": ["office_supplies"],
            "emergency_surcharge_pct": 8,
            "status": "active",
        },
    )
    assert response.status_code == 422


def test_patch_inactivates_supplier_and_touches_updated_at(client: TestClient, suppliers_file: Path) -> None:
    before = client.get("/suppliers/SUP-002").json()["updated_at"]
    response = client.patch("/suppliers/SUP-002", json={"status": "inactive"})
    assert response.status_code == 200
    assert response.json()["status"] == "inactive"
    assert response.json()["updated_at"] >= before
    assert client.get("/suppliers/SUP-002").json()["status"] == "inactive"


def test_status_enum_rejects_unknown_values() -> None:
    with pytest.raises(ValidationError):
        models.SupplierCreate(
            name="Ghost Vendor",
            country="Colombia",
            product_categories=["proteins"],
            emergency_surcharge_pct=8,
            status="deleted",
        )


def test_status_accepts_suspend_as_inactive(client: TestClient, suppliers_file: Path) -> None:
    created = models.SupplierCreate(
        name="Paused Meats",
        country="United States",
        product_categories=["proteins"],
        emergency_surcharge_pct=8,
        status="suspend",
    )
    assert created.status == models.SupplierStatus.INACTIVE

    response = client.patch("/suppliers/SUP-003", json={"status": "suspend"})
    assert response.status_code == 200
    assert response.json()["status"] == "inactive"

    listed = client.get("/suppliers", params={"status": "suspend"})
    assert listed.status_code == 200
    ids = {row["supplier_id"] for row in listed.json()}
    assert "SUP-003" in ids
    assert "SUP-006" in ids


def test_status_query_rejects_unknown_value(client: TestClient, suppliers_file: Path) -> None:
    response = client.get("/suppliers", params={"status": "archived"})
    assert response.status_code == 400
    assert "status" in response.json()["detail"]


def test_rate_must_be_positive_before_tinydb(client: TestClient, suppliers_file: Path) -> None:
    payload = {
        "name": "Zero Rate Vendor",
        "country": "Colombia",
        "product_categories": ["proteins"],
        "emergency_surcharge_pct": 0,
        "status": "active",
    }
    with pytest.raises(ValidationError):
        models.SupplierCreate(**payload)

    with pytest.raises(ValidationError):
        models.SupplierCreate(**{**payload, "emergency_surcharge_pct": -1})

    zero = client.post("/suppliers", json=payload)
    assert zero.status_code == 422
    negative = client.post("/suppliers", json={**payload, "emergency_surcharge_pct": -3})
    assert negative.status_code == 422
    stored = client.get("/suppliers").json()
    assert all(row["name"] != "Zero Rate Vendor" for row in stored)

    patch_zero = client.patch("/suppliers/SUP-001", json={"emergency_surcharge_pct": 0})
    assert patch_zero.status_code == 422
    assert client.get("/suppliers/SUP-001").json()["emergency_surcharge_pct"] == 8


def test_patch_rate_stamps_updated_at_and_rejects_non_positive(
    client: TestClient, suppliers_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    before = client.get("/suppliers/SUP-001").json()
    tinydb_id = before["id"]
    monkeypatch.setattr(models, "utc_now", lambda: "2099-01-02T03:04:05Z")

    updated = client.patch(f"/suppliers/{tinydb_id}/rate", json={"emergency_surcharge_pct": 12})
    assert updated.status_code == 200
    body = updated.json()
    assert body["emergency_surcharge_pct"] == 12
    assert body["updated_at"] == "2099-01-02T03:04:05Z"
    assert client.get(f"/suppliers/{tinydb_id}").json()["emergency_surcharge_pct"] == 12

    by_code = client.patch("/suppliers/SUP-001/rate", json={"emergency_surcharge_pct": 9.5})
    assert by_code.status_code == 200
    assert by_code.json()["emergency_surcharge_pct"] == 9.5

    zero = client.patch(f"/suppliers/{tinydb_id}/rate", json={"emergency_surcharge_pct": 0})
    assert zero.status_code == 422
    negative = client.patch(f"/suppliers/{tinydb_id}/rate", json={"emergency_surcharge_pct": -1})
    assert negative.status_code == 422
    missing = client.patch("/suppliers/999999/rate", json={"emergency_surcharge_pct": 8})
    assert missing.status_code == 404
    assert client.get("/suppliers/SUP-001").json()["emergency_surcharge_pct"] == 9.5


def test_patch_status_activate_or_suspend_only(
    client: TestClient, suppliers_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    tinydb_id = client.get("/suppliers/SUP-002").json()["id"]
    monkeypatch.setattr(models, "utc_now", lambda: "2099-03-04T05:06:07Z")

    suspended = client.patch(f"/suppliers/{tinydb_id}/status", json={"status": "suspend"})
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "inactive"
    assert suspended.json()["updated_at"] == "2099-03-04T05:06:07Z"
    assert client.get("/suppliers/SUP-002").json()["status"] == "inactive"

    activated = client.patch("/suppliers/SUP-002/status", json={"status": "active"})
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"

    for invalid in ("preferred", "inactive", "suspended", "deleted"):
        rejected = client.patch(f"/suppliers/{tinydb_id}/status", json={"status": invalid})
        assert rejected.status_code == 422

    missing = client.patch("/suppliers/999999/status", json={"status": "active"})
    assert missing.status_code == 404


def test_create_ignores_client_supplied_system_fields(client: TestClient, suppliers_file: Path) -> None:
    response = client.post(
        "/suppliers",
        json={
            "name": "Spoofed Vendor",
            "country": "Colombia",
            "product_categories": ["proteins"],
            "emergency_surcharge_pct": 8,
            "status": "active",
            "supplier_id": "HACK-001",
            "updated_at": "1999-01-01T00:00:00Z",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["supplier_id"] == "SUP-007"
    assert isinstance(body["id"], int)
    assert body["updated_at"] != "1999-01-01T00:00:00Z"
    assert body["updated_at"].endswith("Z")


def test_delete_supplier_and_not_found(client: TestClient, suppliers_file: Path) -> None:
    listed = client.get("/suppliers").json()
    tinydb_id = next(row["id"] for row in listed if row["supplier_id"] == "SUP-005")

    removed = client.delete(f"/suppliers/{tinydb_id}")
    assert removed.status_code == 204
    assert client.get(f"/suppliers/{tinydb_id}").status_code == 404
    remaining = {row["supplier_id"] for row in client.get("/suppliers").json()}
    assert "SUP-005" not in remaining

    by_code = client.delete("/suppliers/SUP-006")
    assert by_code.status_code == 204
    assert client.get("/suppliers/SUP-006").status_code == 404

    missing = client.delete("/suppliers/999999")
    assert missing.status_code == 404
    assert "not found" in missing.json()["detail"]

    already_gone = client.delete(f"/suppliers/{tinydb_id}")
    assert already_gone.status_code == 404
