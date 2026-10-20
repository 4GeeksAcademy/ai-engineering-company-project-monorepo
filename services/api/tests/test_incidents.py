from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from services.api import database
from services.api.main import app
from scripts.seed_incidents import seed


@pytest.fixture
def client(tmp_path, monkeypatch):
    database.close_db()
    monkeypatch.setenv(
        "SUPPLIERS_DB_PATH",
        str(tmp_path / "incidents.json"),
    )

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client

    database.close_db()


def example_incident():
    return {
        "title": "Horno averiado",
        "description": "El horno principal no funciona.",
        "category": "equipment_failure",
        "status": "open",
        "origin": "branch",
        "branch": "medellin_centro",
    }


def test_empty_database(client):
    response = client.get("/api/incidents")
    assert response.status_code == 200
    assert response.json() == []

    summary = client.get("/api/incidents/summary")
    assert summary.status_code == 200
    assert summary.json()["total"] == 0


def test_create_and_filter(client):
    response = client.post(
        "/api/incidents",
        json=example_incident(),
    )
    assert response.status_code == 201

    incident = response.json()
    assert incident["id"] > 0
    assert incident["created_at"]
    assert incident["updated_at"]

    filtered = client.get(
        "/api/incidents",
        params={
            "status": "open",
            "origin": "branch",
            "branch": "medellin_centro",
            "category": "equipment_failure",
        },
    )

    assert filtered.status_code == 200
    assert len(filtered.json()) == 1


def test_invalid_data(client):
    data = example_incident()
    del data["title"]

    response = client.post("/api/incidents", json=data)

    assert response.status_code == 400
    assert response.json()["detail"]["field"] == "title"

    data = example_incident()
    data["category"] = "invalid_category"

    response = client.post("/api/incidents", json=data)

    assert response.status_code == 400
    assert response.json()["detail"]["field"] == "category"


def test_status_transitions(client):
    created = client.post(
        "/api/incidents",
        json=example_incident(),
    ).json()

    url = f"/api/incidents/{created['id']}/status"

    assert client.patch(
        url, json={"status": "resolved"}
    ).status_code == 400

    assert client.patch(
        url, json={"status": "in_progress"}
    ).status_code == 200

    assert client.patch(
        url, json={"status": "resolved"}
    ).status_code == 200

    assert client.patch(
        url, json={"status": "discarded"}
    ).status_code == 400

    assert client.get(
        "/api/incidents/999999"
    ).status_code == 404


def test_historical_seed_is_idempotent(client):
    seed()

    first = client.get("/api/incidents/summary").json()

    assert first["total"] == 96
    assert first["by_status"] == {
        "open": 32,
        "resolved": 50,
        "discarded": 14,
    }

    assert first["by_category"] == {
        "customer_complaint": 48,
        "equipment_failure": 17,
        "supply_issue": 22,
        "staff_issue": 9,
    }

    seed()

    second = client.get("/api/incidents/summary").json()
    assert second == first


def test_unexpected_error_is_safe(client):
    with patch(
        "services.api.routes.incidents.db.list_incidents",
        side_effect=RuntimeError("SECRETO_INTERNO"),
    ):
        response = client.get("/api/incidents")

    assert response.status_code == 500
    assert "SECRETO_INTERNO" not in response.text
    assert "Traceback" not in response.text
