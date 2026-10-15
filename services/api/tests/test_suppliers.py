import ast
import os
from pathlib import Path
import re
import select
import socket
import subprocess
import sys
from contextlib import contextmanager

import httpx
import pytest
from pydantic import ValidationError

from models import RateUpdate, SupplierCreate


def supplier_payload(**changes):
    return {
        "name": "TrackFlow Test Carrier",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        **changes,
    }


@pytest.mark.parametrize("changes", [
    {"rate_per_shipment": 0},
    {"rate_per_shipment": -1},
    {"rate_per_shipment": float("inf")},
    {"status": "inactive"},
    {"country": "France"},
    {"currency": "EUR"},
    {"categories": []},
    {"categories": ["transport"]},
    {"name": "   "},
    {"contact_email": "not-an-email"},
    {"updated_at": "2026-10-08T12:00:00Z"},
    {"id": 1},
])
def test_invalid_creation(changes):
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(supplier_payload(**changes))


@pytest.mark.parametrize("rate", [0, -0.1, float("inf"), float("nan")])
def test_invalid_rate_update(rate):
    with pytest.raises(ValidationError):
        RateUpdate(rate_per_shipment=rate)


def test_valid_contracts_and_multiple_categories():
    assert len(SupplierCreate.model_validate(supplier_payload()).categories) == 2
    assert SupplierCreate.model_validate(
        supplier_payload(country="Spain", currency="EUR")
    ).currency == "EUR"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    from fastapi.testclient import TestClient
    from main import create_app

    with TestClient(create_app(tmp_path / "suppliers.json")) as connection:
        connection.post("/users", json={"email": "supplier-test@example.com", "password": "secure-password"})
        token = connection.post(
            "/auth/login",
            json={"email": "supplier-test@example.com", "password": "secure-password"},
        ).json()["access_token"]
        connection.headers.update({"Authorization": f"Bearer {token}"})
        yield connection


@pytest.mark.parametrize("changes", [
    {"rate_per_shipment": 0}, {"rate_per_shipment": -1}, {"status": "inactive"},
    {"categories": []}, {"categories": ["transport"]}, {"currency": "EUR"},
    {"country": "France"}, {"updated_at": "2026-10-08T12:00:00Z"},
])
def test_api_rejects_before_storage(client, changes):
    assert client.post("/suppliers", json=supplier_payload(**changes)).status_code == 422
    assert client.get("/suppliers").json() == []


def test_directory_lifecycle(client):
    response = client.post("/suppliers", json=supplier_payload())
    assert response.status_code == 201
    created = response.json()
    assert created["id"] == 1
    assert created["updated_at"].endswith("Z")
    endpoint = f"/suppliers/{created['id']}"
    assert client.get(endpoint).json() == created
    assert client.get("/suppliers?country=USA&category=carrier_international").json() == [created]
    assert client.get("/suppliers?country=Spain").json() == []
    assert client.get("/suppliers?category=packaging_materials").json() == []
    assert client.get("/suppliers?category=invalid").status_code == 422
    assert client.get("/suppliers?country=France").status_code == 422

    for rate in (0, -1):
        assert client.patch(f"{endpoint}/rate", json={"rate_per_shipment": rate}).status_code == 422
        assert client.get(endpoint).json() == created
    updated = client.patch(f"{endpoint}/rate", json={"rate_per_shipment": 9.25}).json()
    assert updated["rate_per_shipment"] == 9.25
    assert updated["updated_at"] > created["updated_at"]
    assert client.patch(f"{endpoint}/status", json={"status": "inactive"}).status_code == 422
    for status in ("suspended", "active"):
        changed = client.patch(f"{endpoint}/status", json={"status": status})
        assert changed.status_code == 200
        assert changed.json()["status"] == status
        assert changed.json()["updated_at"] == updated["updated_at"]
    assert client.delete(endpoint).status_code == 204
    assert client.get(endpoint).status_code == 404
    assert client.delete(endpoint).status_code == 404
    assert client.patch(f"{endpoint}/rate", json={"rate_per_shipment": 5}).status_code == 404
    assert client.patch(f"{endpoint}/status", json={"status": "active"}).status_code == 404


def test_seed_idempotence_and_persistence(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from seed import SUPPLIERS_SEED, seed_database
    from main import create_app

    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
    path = tmp_path / "suppliers.json"
    assert seed_database(path) == 15
    with TestClient(create_app(path)) as connection:
        connection.post("/users", json={"email": "seed-test@example.com", "password": "secure-password"})
        token = connection.post(
            "/auth/login", json={"email": "seed-test@example.com", "password": "secure-password"}
        ).json()["access_token"]
        connection.headers.update({"Authorization": f"Bearer {token}"})
        records = connection.get("/suppliers").json()
        assert len(records) == 15
        for record, expected in zip(records, SUPPLIERS_SEED):
            assert SupplierCreate.model_validate(expected).model_dump(mode="json") == {
                key: value for key, value in record.items() if key not in ("id", "updated_at")
            }
        assert len(connection.get("/suppliers?country=USA").json()) == 9
        assert len(connection.get("/suppliers?category=reverse_logistics").json()) == 2
        assert len(connection.get("/suppliers?country=Spain&category=carrier_international").json()) == 1
        connection.patch("/suppliers/1/rate", json={"rate_per_shipment": 10})
    assert seed_database(path) == 0
    with TestClient(create_app(path)) as connection:
        token = connection.post(
            "/auth/login", json={"email": "seed-test@example.com", "password": "secure-password"}
        ).json()["access_token"]
        connection.headers.update({"Authorization": f"Bearer {token}"})
        assert connection.get("/suppliers/1").json()["rate_per_shipment"] == 10
        assert len(connection.get("/suppliers").json()) == 15


def test_seed_matches_context_exactly():
    from seed import SUPPLIERS_SEED

    context_path = Path(__file__).resolve().parents[3] / "memory-bank" / "history" / "HITO09-CONTEXT.md"
    blocks = re.findall(r"```python\n(.*?)\n```", context_path.read_text(encoding="utf-8"), re.DOTALL)
    declarations = {}
    for block in blocks:
        for statement in ast.parse(block).body:
            if isinstance(statement, ast.Assign) and isinstance(statement.targets[0], ast.Name):
                declarations[statement.targets[0].id] = ast.literal_eval(statement.value)
    assert SUPPLIERS_SEED == declarations["SUPPLIERS_SEED"]
    from typing import get_args
    from models import Category, Supplier, SupplierStatus

    assert list(get_args(Category)) == declarations["VALID_CATEGORIES"]
    assert [status.value for status in SupplierStatus] == declarations["VALID_STATUSES"]
    assert set(Supplier.model_fields) == {
        "name", "country", "categories", "rate_per_shipment", "currency", "updated_at",
        "status", "service_zone", "contact_email", "notes",
    }


@contextmanager
def running_server(path):
    with socket.socket() as connection:
        connection.bind(("127.0.0.1", 0))
        port = connection.getsockname()[1]
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=Path(__file__).resolve().parents[1],
        env={
            **os.environ,
            "SUPPLIERS_DB_PATH": str(path),
            "SECRET_KEY": "test-secret-key-with-at-least-32-bytes",
        },
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=0,
    )
    try:
        assert process.stdout is not None
        while True:
            assert select.select([process.stdout], [], [], 10)[0], "Uvicorn no inicia en 10 segundos"
            line = process.stdout.readline()
            assert line, "Uvicorn termino antes de iniciar"
            if b"Uvicorn running on" in line:
                break
        yield f"http://127.0.0.1:{port}"
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        if process.stdout is not None:
            process.stdout.close()


def test_persistence_after_real_server_restart(tmp_path):
    path = tmp_path / "suppliers.json"
    with running_server(path) as url:
        registration = httpx.post(
            f"{url}/users", json={"email": "restart-test@example.com", "password": "secure-password"}, timeout=10
        )
        assert registration.status_code == 201
        login = httpx.post(
            f"{url}/auth/login", json={"email": "restart-test@example.com", "password": "secure-password"}, timeout=10
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        response = httpx.post(f"{url}/suppliers", json=supplier_payload(), headers=headers, timeout=10)
        assert response.status_code == 201
        supplier_id = response.json()["id"]
        endpoint = f"/suppliers/{supplier_id}"
        assert httpx.patch(f"{url}{endpoint}/rate", json={"rate_per_shipment": 8.75}, headers=headers).status_code == 200
        assert httpx.patch(f"{url}{endpoint}/status", json={"status": "suspended"}, headers=headers).status_code == 200
        persisted = httpx.get(f"{url}{endpoint}", headers=headers).json()
    with running_server(path) as url:
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert httpx.get(f"{url}{endpoint}", headers=headers).json() == persisted
        assert httpx.get(f"{url}/suppliers", headers=headers).json() == [persisted]