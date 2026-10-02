"""Model and validation checks for the suppliers API, against the supplier CONTEXT."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from main import app
from seed import seed_database
import database
from models import Supplier

VALID = {
    "name": "Proveedor Test",
    "country": "Spain",
    "categories": ["job_boards"],
    "monthly_rate": 100.0,
    "currency": "EUR",
    "status": "active",
}


@pytest.fixture()
def db(tmp_path, monkeypatch) -> TinyDB:
    db_file = TinyDB(tmp_path / "db.json")
    seed_database(db_file)
    monkeypatch.setattr(database, "_db", db_file)
    yield db_file
    db_file.close()


@pytest.fixture()
def client(db) -> TestClient:
    return TestClient(app)


def test_model_fields_match_context():
    assert set(Supplier.model_fields) == {
        "name", "country", "categories", "monthly_rate", "currency", "updated_at",
        "status", "contract_renewal_date", "contact_email", "notes",
    }


@pytest.mark.parametrize("status", ["Active", "activo", "inactive", "", None, 1])
def test_invalid_status_is_rejected_before_tinydb(client, db, status):
    before = len(db)
    assert client.post("/api/suppliers", json={**VALID, "status": status}).status_code == 422
    assert client.patch("/api/suppliers/1/status", json={"status": status}).status_code == 422
    assert len(db) == before
    assert db.get(doc_id=1)["status"] == "active"


@pytest.mark.parametrize("status", ["active", "suspended"])
def test_allowed_status_values_are_accepted(client, status):
    assert client.post("/api/suppliers", json={**VALID, "status": status}).status_code == 201


@pytest.mark.parametrize("rate", [0, 0.0, -1, -0.01, "abc", None])
def test_non_positive_rate_is_rejected_with_422(client, db, rate):
    before = len(db)
    assert client.post("/api/suppliers", json={**VALID, "monthly_rate": rate}).status_code == 422
    assert client.patch("/api/suppliers/1/rate", json={"monthly_rate": rate}).status_code == 422
    assert client.patch("/api/suppliers/1", json={"monthly_rate": rate}).status_code == 422
    assert len(db) == before
    assert db.get(doc_id=1)["monthly_rate"] == 1200.0


def test_positive_rate_is_accepted(client):
    assert client.patch("/api/suppliers/1/rate", json={"monthly_rate": 0.01}).status_code == 200


def test_client_cannot_send_updated_at(client, db):
    before = len(db)
    body = {**VALID, "updated_at": "2020-01-01T00:00:00Z"}
    assert client.post("/api/suppliers", json=body).status_code == 422
    assert client.patch("/api/suppliers/1", json={"updated_at": "2020-01-01T00:00:00Z"}).status_code == 422
    assert len(db) == before


def test_updated_at_is_generated_by_the_system(client):
    created = client.post("/api/suppliers", json=VALID).json()
    assert created["updated_at"] and not created["updated_at"].startswith("2020")

    updated = client.patch(f"/api/suppliers/{created['id']}/rate", json={"monthly_rate": 150}).json()
    assert updated["updated_at"] > created["updated_at"]


@pytest.mark.parametrize("email", ["no-es-email", "a@b", "@dominio.com", "a b@c.com", ""])
def test_invalid_contact_email_is_rejected_with_422(client, db, email):
    before = len(db)
    assert client.post("/api/suppliers", json={**VALID, "contact_email": email}).status_code == 422
    assert client.patch("/api/suppliers/1", json={"contact_email": email}).status_code == 422
    assert len(db) == before
    assert db.get(doc_id=1)["contact_email"] == "account@linkedin.com"


def test_valid_or_absent_contact_email_is_accepted(client):
    assert client.post("/api/suppliers", json={**VALID, "contact_email": "ok@proveedor.es"}).status_code == 201
    assert client.post("/api/suppliers", json=VALID).status_code == 201
    assert client.post("/api/suppliers", json={**VALID, "contact_email": None}).status_code == 201
