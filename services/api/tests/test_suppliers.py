"""Supplier directory tests: validation, filters, updates, 404s and the seeder."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app import main
from app.seed import seed
from app.suppliers.repository import DB_PATH_ENV, SupplierRepository

VALID_SUPPLIER = {
    "name": "Personio",
    "country": "Spain",
    "categories": ["payroll_and_hr_software", "ats_software"],
    "monthly_rate": 450.0,
    "currency": "EUR",
    "status": "active",
    "contract_renewal_date": "2027-01-31",
    "contact_email": "sales@personio.example",
    "notes": "Supplier under evaluation.",
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """API backed by a temporary TinyDB file, seeded by the lifespan on startup."""
    monkeypatch.setenv(DB_PATH_ENV, str(tmp_path / "suppliers.json"))
    with TestClient(main.app) as test_client:
        yield test_client


def _names(response) -> set[str]:
    return {supplier["name"] for supplier in response.json()}


def test_lifespan_seeds_an_empty_database(client):
    response = client.get("/suppliers")
    assert response.status_code == 200
    assert len(response.json()) == 15


def test_create_valid_supplier(client):
    response = client.post("/suppliers", json=VALID_SUPPLIER)
    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert datetime.fromisoformat(body["updated_at"]).tzinfo is not None
    assert {key: body[key] for key in VALID_SUPPLIER} == VALID_SUPPLIER
    assert client.get(f"/suppliers/{body['id']}").json() == body


def test_create_supplier_with_only_required_fields(client):
    payload = {key: VALID_SUPPLIER[key] for key in ("name", "country", "categories", "monthly_rate", "currency", "status")}
    body = client.post("/suppliers", json=payload).json()
    assert body["contract_renewal_date"] is None
    assert body["contact_email"] is None
    assert body["notes"] is None


@pytest.mark.parametrize(
    "changes",
    [
        pytest.param({"status": "inactive"}, id="invalid-status"),
        pytest.param({"country": None}, id="missing-country"),
        pytest.param({"categories": ["catering"]}, id="invalid-category"),
        pytest.param({"categories": []}, id="empty-categories"),
        pytest.param({"monthly_rate": 0}, id="zero-rate"),
        pytest.param({"monthly_rate": -10}, id="negative-rate"),
        pytest.param({"currency": "USD"}, id="spain-with-usd"),
        pytest.param({"country": "USA", "currency": "EUR"}, id="usa-with-eur"),
        pytest.param({"name": "   "}, id="blank-name"),
        pytest.param({"contact_email": "not-an-email"}, id="invalid-email"),
        pytest.param({"contract_renewal_date": "31/01/2027"}, id="invalid-date-format"),
        pytest.param({"id": 99}, id="client-sends-id"),
        pytest.param({"updated_at": "2026-01-01T00:00:00Z"}, id="client-sends-updated-at"),
    ],
)
def test_create_rejects_invalid_input(client, changes):
    payload = {**VALID_SUPPLIER, **changes}
    payload = {key: value for key, value in payload.items() if value is not None}
    response = client.post("/suppliers", json=payload)
    assert response.status_code == 422
    assert len(client.get("/suppliers").json()) == 15


def test_create_rejects_duplicate_name(client):
    response = client.post("/suppliers", json={**VALID_SUPPLIER, "name": "Workable"})
    assert response.status_code == 409


def test_filter_by_country(client):
    spain = client.get("/suppliers", params={"country": "Spain"}).json()
    usa = client.get("/suppliers", params={"country": "USA"}).json()
    assert len(spain) == 8 and all(s["country"] == "Spain" for s in spain)
    assert len(usa) == 7 and all(s["country"] == "USA" for s in usa)


def test_filter_by_category(client):
    response = client.get("/suppliers", params={"category": "job_boards"})
    assert _names(response) == {"LinkedIn Talent Solutions", "InfoJobs Premium", "Indeed Sponsored"}


def test_filter_by_category_matches_any_item_of_the_list(client):
    client.post("/suppliers", json=VALID_SUPPLIER)
    response = client.get("/suppliers", params={"category": "ats_software"})
    assert _names(response) == {"Workable", "Greenhouse", "Personio"}


def test_combined_filters(client):
    response = client.get("/suppliers", params={"country": "USA", "category": "office_and_facilities"})
    assert _names(response) == {"WeWork Miami"}


@pytest.mark.parametrize("params", [{"country": "France"}, {"category": "catering"}])
def test_invalid_filters_return_422(client, params):
    assert client.get("/suppliers", params=params).status_code == 422


def test_rate_update_changes_updated_at(client):
    created = client.post("/suppliers", json=VALID_SUPPLIER).json()
    response = client.patch(f"/suppliers/{created['id']}/rate", json={"monthly_rate": 520.5})
    assert response.status_code == 200
    body = response.json()
    assert body["monthly_rate"] == 520.5
    assert datetime.fromisoformat(body["updated_at"]) > datetime.fromisoformat(created["updated_at"])
    assert client.get(f"/suppliers/{created['id']}").json() == body


@pytest.mark.parametrize("payload", [{"monthly_rate": 0}, {"monthly_rate": -1}, {}])
def test_rate_update_rejects_invalid_rate(client, payload):
    assert client.patch("/suppliers/1/rate", json=payload).status_code == 422


def test_status_change(client):
    response = client.patch("/suppliers/1/status", json={"status": "suspended"})
    assert response.status_code == 200
    assert response.json()["status"] == "suspended"
    assert client.get("/suppliers/1").json()["status"] == "suspended"


def test_status_change_does_not_touch_updated_at(client):
    before = client.get("/suppliers/1").json()
    after = client.patch("/suppliers/1/status", json={"status": "suspended"}).json()
    assert after["updated_at"] == before["updated_at"]


def test_status_change_rejects_invalid_status(client):
    assert client.patch("/suppliers/1/status", json={"status": "deleted"}).status_code == 422


def test_delete_supplier(client):
    assert client.delete("/suppliers/1").status_code == 204
    assert client.get("/suppliers/1").status_code == 404
    assert len(client.get("/suppliers").json()) == 14


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/suppliers/999", None),
        ("PATCH", "/suppliers/999/rate", {"monthly_rate": 100}),
        ("PATCH", "/suppliers/999/status", {"status": "active"}),
        ("DELETE", "/suppliers/999", None),
    ],
)
def test_unknown_supplier_returns_404(client, method, path, payload):
    assert client.request(method, path, json=payload).status_code == 404


def test_seeder_is_idempotent(tmp_path):
    repository = SupplierRepository(tmp_path / "suppliers.json")
    try:
        assert seed(repository) == (15, 0)
        assert seed(repository) == (0, 15)
        assert repository.count() == 15
    finally:
        repository.close()


def test_dates_are_stored_as_iso_strings(tmp_path):
    path = tmp_path / "suppliers.json"
    repository = SupplierRepository(path)
    seed(repository)
    repository.close()
    raw = path.read_text(encoding="utf-8")
    assert '"contract_renewal_date": "2025-03-31"' in raw
    assert '"updated_at": "20' in raw
