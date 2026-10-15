import ast
import secrets
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.api import database
from services.api.auth import storage
from services.api.auth.security import create_access_token, hash_password
from services.api.main import app
from services.api.models import SupplierCreate
from services.api.seed import SUPPLIERS_SEED, seed


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SUPPLIERS_DB_PATH", str(tmp_path / "suppliers.json"))
    monkeypatch.setenv("AUTH_DB_PATH", str(tmp_path / "auth.json"))
    monkeypatch.setenv("JWT_SECRET_KEY", secrets.token_urlsafe(48))

    database.close_db()

    user = storage.create_user(
        email="tests@example.com",
        hashed_password=hash_password("ClaveTest1234"),
    )

    token = create_access_token(user["id"])

    with TestClient(app) as test_client:
        test_client.headers.update({
            "Authorization": f"Bearer {token}"
        })
        yield test_client

    database.close_db()


@pytest.fixture
def seeded_client(client):
    seed()
    return client


def valid_payload(**overrides):
    payload = {
        "name": "Proveedor Test",
        "country": "Colombia",
        "categories": ["carne"],
        "rate_per_unit": 1000.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "test@example.co",
        "notes": "Nota interna",
    }
    payload.update(overrides)
    return payload


# --- Seed ---------------------------------------------------------------

def test_seed_loads_15_suppliers_and_is_idempotent(client):
    assert len(SUPPLIERS_SEED) == 15
    assert seed() == (15, 0)
    assert seed() == (0, 15)
    response = client.get("/api/suppliers")
    assert len(response.json()) == 15


def test_seed_data_matches_context(seeded_client):
    suppliers = {s["name"]: s for s in seeded_client.get("/api/suppliers").json()}
    assert suppliers["Distribuidora RefriCol"]["categories"] == ["bebidas", "lacteos"]
    assert suppliers["Limpiahogar Profesional"]["status"] == "suspended"
    assert suppliers["Bebidas Andinas"]["status"] == "suspended"
    assert suppliers["PackRight USA"]["rate_per_unit"] == 0.35
    assert suppliers["Condimentos El Sabor"]["notes"] is None


def test_all_seed_fields_match_official_context(seeded_client):
    context = (Path(__file__).resolve().parents[3] / "CONTEXT.md").read_text(encoding="utf-8")
    seed_block = next(block for block in context.split("```python\n")[1:] if block.startswith("SUPPLIERS_SEED ="))
    assignment = ast.parse(seed_block.split("```", 1)[0]).body[0]
    expected = ast.literal_eval(assignment.value)
    assert SUPPLIERS_SEED == expected
    actual = seeded_client.get("/suppliers").json()
    assert len(actual) == len(expected) == 15
    for stored, raw in zip(actual, expected, strict=True):
        assert {key: value for key, value in stored.items() if key not in {"id", "updated_at"}} == SupplierCreate(**raw).model_dump(mode="json")


def test_both_prefixes_share_storage(client):
    created = client.post("/suppliers", json=valid_payload()).json()
    assert client.get(f"/api/suppliers/{created['id']}").json() == created
    assert client.get("/suppliers").json() == client.get("/api/suppliers").json()


# --- POST ---------------------------------------------------------------

def test_create_supplier(client):
    response = client.post("/api/suppliers", json=valid_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["id"] >= 1
    assert body["updated_at"]
    assert body["name"] == "Proveedor Test"


def test_create_supplier_optional_fields(client):
    payload = valid_payload()
    del payload["contact_email"], payload["notes"]
    response = client.post("/api/suppliers", json=payload)
    assert response.status_code == 201
    assert response.json()["contact_email"] is None


def test_create_duplicate_name_conflict(client):
    client.post("/api/suppliers", json=valid_payload())
    response = client.post("/api/suppliers", json=valid_payload(name="proveedor test"))
    assert response.status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [
        {"country": "Colombia", "currency": "USD"},
        {"country": "USA", "currency": "COP"},
        {"country": "Spain", "currency": "EUR"},
        {"currency": "EUR"},
        {"categories": []},
        {"categories": ["pescado"]},
        {"categories": ["Carne"]},
        {"status": "inactive"},
        {"status": "Active"},
        {"rate_per_unit": 0},
        {"rate_per_unit": -5},
        {"rate_per_unit": "abc"},
        {"name": ""},
        {"name": "   "},
        {"contact_email": "not-an-email"},
        {"unexpected": "field"},
    ],
)
def test_create_supplier_validation_errors(client, overrides):
    response = client.post("/api/suppliers", json=valid_payload(**overrides))
    assert response.status_code == 422


@pytest.mark.parametrize("field", ["name", "country", "categories", "rate_per_unit", "currency", "status"])
def test_create_supplier_missing_required_field(client, field):
    payload = valid_payload()
    del payload[field]
    assert client.post("/api/suppliers", json=payload).status_code == 422


# --- GET ----------------------------------------------------------------

def test_list_filters(seeded_client):
    usa = seeded_client.get("/api/suppliers", params={"country": "USA"}).json()
    assert len(usa) == 6
    assert all(s["currency"] == "USD" for s in usa)

    meat_usa = seeded_client.get(
        "/api/suppliers", params={"country": "USA", "category": "carne", "status": "active"}
    ).json()
    assert [s["name"] for s in meat_usa] == ["Miami Meat Distributors LLC"]

    bebidas = seeded_client.get("/api/suppliers", params={"category": "bebidas"}).json()
    assert len(bebidas) == 3

    suspended = seeded_client.get("/api/suppliers", params={"status": "suspended"}).json()
    assert len(suspended) == 2


def test_list_invalid_filter(seeded_client):
    assert seeded_client.get("/api/suppliers", params={"country": "Spain"}).status_code == 422
    assert seeded_client.get("/api/suppliers", params={"category": "pescado"}).status_code == 422


def test_get_by_id(seeded_client):
    response = seeded_client.get("/api/suppliers/1")
    assert response.status_code == 200
    assert response.json()["name"] == "Carnes del Valle S.A.S."


def test_get_by_id_not_found(seeded_client):
    assert seeded_client.get("/api/suppliers/999").status_code == 404
    assert seeded_client.get("/api/suppliers/abc").status_code == 422


# --- PATCH rate ---------------------------------------------------------

def test_update_rate_sets_updated_at(seeded_client):
    before = seeded_client.get("/api/suppliers/1").json()
    response = seeded_client.patch("/api/suppliers/1/rate", json={"rate_per_unit": 29900.0})
    assert response.status_code == 200
    after = response.json()
    assert after["rate_per_unit"] == 29900.0
    assert after["updated_at"] > before["updated_at"]
    assert seeded_client.get("/api/suppliers/1").json()["rate_per_unit"] == 29900.0


@pytest.mark.parametrize("body", [{"rate_per_unit": 0}, {"rate_per_unit": -1}, {}, {"rate_per_unit": "x"}])
def test_update_rate_invalid(seeded_client, body):
    assert seeded_client.patch("/api/suppliers/1/rate", json=body).status_code == 422


def test_update_rate_not_found(seeded_client):
    response = seeded_client.patch("/api/suppliers/999/rate", json={"rate_per_unit": 10})
    assert response.status_code == 404


# --- PATCH status -------------------------------------------------------

def test_update_status(seeded_client):
    before = seeded_client.get("/api/suppliers/7").json()
    assert before["status"] == "suspended"
    response = seeded_client.patch("/api/suppliers/7/status", json={"status": "active"})
    assert response.status_code == 200
    assert response.json()["status"] == "active"
    # Status changes are not rate changes: updated_at must stay untouched.
    assert response.json()["updated_at"] == before["updated_at"]


def test_update_status_invalid(seeded_client):
    response = seeded_client.patch("/api/suppliers/1/status", json={"status": "deleted"})
    assert response.status_code == 422


def test_update_status_not_found(seeded_client):
    response = seeded_client.patch("/api/suppliers/999/status", json={"status": "active"})
    assert response.status_code == 404


# --- DELETE -------------------------------------------------------------

def test_delete_supplier(seeded_client):
    assert seeded_client.delete("/api/suppliers/1").status_code == 204
    assert seeded_client.get("/api/suppliers/1").status_code == 404
    assert len(seeded_client.get("/api/suppliers").json()) == 14
    assert seeded_client.delete("/api/suppliers/1").status_code == 404


# --- Persistence & existing endpoints -----------------------------------

def test_data_persists_after_reopening_db(seeded_client):
    database.close_db()
    assert len(database.list_suppliers()) == 15


def test_supplier_entrypoint_has_no_incident_dependencies(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["suppliers"] == "/suppliers"
    assert client.get("/api/incidents/results/export").status_code == 404
    assert client.get("/backoffice").status_code == 404


@pytest.mark.parametrize("prefix", ["/suppliers", "/api/suppliers"])
def test_supplier_routes_are_available_under_both_prefixes(client, prefix):
    response = client.post(prefix, json=valid_payload())
    assert response.status_code == 201
    supplier_id = response.json()["id"]
    assert client.get(prefix).status_code == 200
    assert client.get(f"{prefix}/{supplier_id}").status_code == 200
    assert client.patch(f"{prefix}/{supplier_id}/rate", json={"rate_per_unit": 2000}).status_code == 200
    assert client.patch(f"{prefix}/{supplier_id}/status", json={"status": "suspended"}).status_code == 200
    assert client.delete(f"{prefix}/{supplier_id}").status_code == 204
