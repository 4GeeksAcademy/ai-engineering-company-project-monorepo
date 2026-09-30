from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import database
from main import app
from routes.seed import seed_suppliers


@pytest.fixture

def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATA_DIR", tmp_path)
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "suppliers.json")
    with TestClient(app) as test_client:
        yield test_client


def test_seed_is_complete_and_idempotent(client):
    response = client.get("/suppliers")
    assert response.status_code == 200
    assert len(response.json()) == 15
    assert seed_suppliers() == 0


def test_create_filters_updates_and_delete(client):
    supplier = {
        "name": "Integration vendor",
        "country": "USA",
        "categories": ["medical_supplies", "pharmaceutical"],
        "monthly_rate": 450.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": None,
    }
    created_response = client.post("/suppliers", json=supplier)
    assert created_response.status_code == 201
    created = created_response.json()
    supplier_id = created["id"]
    initial_updated_at = datetime.fromisoformat(created["updated_at"])
    assert any(
        item["id"] == supplier_id
        for item in client.get("/suppliers", params={"country": "USA"}).json()
    )
    assert client.get("/suppliers", params={"category": "pharmaceutical"}).json()[0]["id"] == supplier_id
    assert client.get(f"/suppliers/{supplier_id}").status_code == 200

    rate_response = client.patch(f"/suppliers/{supplier_id}/rate", json={"monthly_rate": 500.5})
    assert rate_response.status_code == 200
    assert rate_response.json()["monthly_rate"] == 500.5
    assert datetime.fromisoformat(rate_response.json()["updated_at"]) >= initial_updated_at

    status_response = client.patch(f"/suppliers/{supplier_id}/status", json={"status": "suspended"})
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "suspended"
    assert client.delete(f"/suppliers/{supplier_id}").status_code == 204
    assert client.get(f"/suppliers/{supplier_id}").status_code == 404


def test_invalid_values_return_422(client):
    valid = {
        "name": "Validation vendor",
        "country": "USA",
        "categories": ["medical_supplies"],
        "monthly_rate": 10,
        "currency": "USD",
        "status": "active",
    }
    for rate in (0, -1):
        payload = {**valid, "monthly_rate": rate}
        assert client.post("/suppliers", json=payload).status_code == 422
        assert client.patch("/suppliers/1/rate", json={"monthly_rate": rate}).status_code == 422

    assert client.post("/suppliers", json={**valid, "status": "pending"}).status_code == 422
    created = client.post("/suppliers", json=valid).json()
    assert client.patch(f"/suppliers/{created['id']}/status", json={"status": "pending"}).status_code == 422
    assert client.post("/suppliers", json={**valid, "updated_at": "2025-01-01T00:00:00Z"}).status_code == 422
    assert client.post("/suppliers", json={**valid, "currency": "GBP"}).status_code == 422


def test_missing_ids_return_404(client):
    assert client.get("/suppliers/1234").status_code == 404
    assert client.patch("/suppliers/1234/rate", json={"monthly_rate": 5}).status_code == 404
    assert client.patch("/suppliers/1234/status", json={"status": "active"}).status_code == 404
    assert client.delete("/suppliers/1234").status_code == 404


def test_backoffice_origin_can_call_supplier_api(client):
    response = client.options(
        "/suppliers",
        headers={
            "Origin": "http://localhost:3002",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3002"
