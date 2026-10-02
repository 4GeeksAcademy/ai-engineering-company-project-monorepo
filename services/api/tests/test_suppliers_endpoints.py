"""Endpoint contract checks for /suppliers (seeded with the 15 CONTEXT suppliers)."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from main import app
from seed import seed_database
import database

NEW = {
    "name": "Proveedor Nuevo",
    "country": "USA",
    "categories": ["ats_software", "job_boards"],
    "monthly_rate": 99.5,
    "currency": "USD",
    "status": "active",
}


@pytest.fixture()
def client(tmp_path, monkeypatch) -> TestClient:
    db_file = TinyDB(tmp_path / "db.json")
    seed_database(db_file)
    monkeypatch.setattr(database, "_db", db_file)
    yield TestClient(app)
    db_file.close()


def test_post_creates_supplier_and_returns_full_object_with_id(client):
    response = client.post("/suppliers", json=NEW)
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 16
    assert {k: body[k] for k in NEW} == NEW
    assert body["updated_at"]
    assert {"contract_renewal_date", "contact_email", "notes"} <= set(body)
    assert client.get(f"/suppliers/{body['id']}").json() == body


def test_post_rejects_invalid_input_with_422(client):
    assert client.post("/suppliers", json={**NEW, "country": None}).status_code == 422
    assert len(client.get("/suppliers").json()) == 15


def test_get_without_params_returns_all(client):
    assert len(client.get("/suppliers").json()) == 15


@pytest.mark.parametrize("country,expected", [("Spain", 8), ("USA", 7)])
def test_get_filters_by_country(client, country, expected):
    suppliers = client.get("/suppliers", params={"country": country}).json()
    assert len(suppliers) == expected
    assert {s["country"] for s in suppliers} == {country}


def test_get_filters_by_category(client):
    suppliers = client.get("/suppliers", params={"category": "ats_software"}).json()
    assert {s["name"] for s in suppliers} == {"Workable", "Greenhouse"}
    assert all("ats_software" in s["categories"] for s in suppliers)


def test_get_filters_combine_and_invalid_values_are_422(client):
    both = client.get("/suppliers", params={"country": "USA", "category": "ats_software"}).json()
    assert [s["name"] for s in both] == ["Greenhouse"]
    assert client.get("/suppliers", params={"country": "France"}).status_code == 422
    assert client.get("/suppliers", params={"category": "nope"}).status_code == 422


def test_get_by_id_returns_supplier_and_404_for_unknown(client):
    assert client.get("/suppliers/1").json()["name"] == "LinkedIn Talent Solutions"
    assert client.get("/suppliers/999").status_code == 404


def test_patch_rate_updates_rate_and_timestamp(client):
    before = client.get("/suppliers/1").json()
    time.sleep(0.01)
    response = client.patch("/suppliers/1/rate", json={"monthly_rate": 1350.5})
    assert response.status_code == 200
    body = response.json()
    assert body["monthly_rate"] == 1350.5
    assert body["updated_at"] > before["updated_at"]
    assert client.get("/suppliers/1").json() == body
    assert client.patch("/suppliers/999/rate", json={"monthly_rate": 5}).status_code == 404


@pytest.mark.parametrize("status", ["Active", "activo", "inactive", "", None])
def test_patch_status_rejects_invalid_values_with_422(client, status):
    assert client.patch("/suppliers/1/status", json={"status": status}).status_code == 422
    assert client.get("/suppliers/1").json()["status"] == "active"


def test_patch_status_accepts_the_two_allowed_values(client):
    assert client.patch("/suppliers/1/status", json={"status": "suspended"}).json()["status"] == "suspended"
    assert client.patch("/suppliers/1/status", json={"status": "active"}).json()["status"] == "active"


def test_delete_removes_active_supplier_and_404_for_unknown(client):
    assert client.get("/suppliers/3").json()["status"] == "active"
    assert client.delete("/suppliers/3").status_code == 204
    assert client.get("/suppliers/3").status_code == 404
    assert client.delete("/suppliers/3").status_code == 404
    assert client.delete("/suppliers/999").status_code == 404
    assert len(client.get("/suppliers").json()) == 14


def test_delete_refuses_suspended_suppliers_with_409(client):
    """The CONTEXT keeps suspended suppliers in the directory for the history."""
    assert client.get("/suppliers/5").json()["status"] == "suspended"  # Greenhouse
    response = client.delete("/suppliers/5")
    assert response.status_code == 409
    assert "suspended" in response.json()["detail"]
    assert client.get("/suppliers/5").status_code == 200
    assert len(client.get("/suppliers").json()) == 15

    client.patch("/suppliers/5/status", json={"status": "active"})
    assert client.delete("/suppliers/5").status_code == 204


def test_backoffice_alias_under_api_prefix_still_works(client):
    assert len(client.get("/api/suppliers").json()) == 15
    assert client.post("/api/suppliers", json=NEW).status_code == 201
