"""Incident manager endpoints: CRUD, filters, summary, lifecycle and error format."""

from __future__ import annotations

import logging

import pytest
from fastapi.testclient import TestClient

VALID = {
    "title": "Zendesk no carga los tickets",
    "description": "Desde las 9:00 el panel de Zendesk devuelve error 503 a todo el equipo de soporte.",
    "category": "technical_failure",
    "origin": "branch",
    "branch": "miami_office",
}


def create(client: TestClient, **changes) -> dict:
    response = client.post("/api/incidents", json={**VALID, **changes})
    assert response.status_code == 201, response.text
    return response.json()


def errors_by_field(response) -> dict[str, str]:
    assert response.status_code == 400, response.text
    body = response.json()
    assert body["detail"] == "Datos no válidos"
    return {error["field"]: error["message"] for error in body["errors"]}


def test_empty_database_gives_empty_list_and_zero_summary(auth_client):
    assert auth_client.get("/api/incidents").json() == []
    summary = auth_client.get("/api/incidents/summary").json()
    assert summary == {
        "total": 0,
        "by_status": {"open": 0, "in_progress": 0, "resolved": 0, "discarded": 0},
        "by_category": {
            "technical_failure": 0,
            "process_error": 0,
            "client_complaint": 0,
            "candidate_issue": 0,
            "staff_issue": 0,
            "sla_breach": 0,
            "data_quality": 0,
            "other": 0,
        },
        "by_origin": {"customer": 0, "branch": 0, "internal": 0},
        "by_branch": {"central": 0, "valencia_operations": 0, "miami_office": 0, "remote": 0},
    }


def test_create_returns_201_with_defaults(auth_client):
    incident = create(auth_client, title="  Zendesk caído  ")
    assert incident["title"] == "Zendesk caído"
    assert incident["status"] == "open"
    assert "source_id" not in incident
    assert incident["next_statuses"] == ["in_progress", "discarded"]
    assert incident["created_at"] == incident["updated_at"]
    assert incident["created_at"].endswith("Z") or incident["created_at"].endswith("+00:00")
    assert auth_client.get(f"/api/incidents/{incident['id']}").json() == incident


@pytest.mark.parametrize(
    ("changes", "field", "message"),
    [
        ({"title": ""}, "title", "El título es obligatorio"),
        ({"title": "   "}, "title", "El título es obligatorio"),
        ({"title": None}, "title", "El título es obligatorio"),
        ({"title": "x" * 121}, "title", "El título no puede superar 120 caracteres"),
        ({"description": ""}, "description", "La descripción es obligatoria"),
        ({"branch": ""}, "branch", "La sede es obligatoria"),
        ({"branch": "headquarters"}, "branch", "La sede no es válida. Valores permitidos: central, valencia_operations, miami_office, remote"),
        ({"origin": "email"}, "origin", "El origen no es válido. Valores permitidos: customer, branch, internal"),
        ({"status": "resolved"}, "status", "Una incidencia nueva siempre se registra en estado «open»"),
        ({"priority": "high"}, "priority", "El campo «priority» no está permitido"),
    ],
)
def test_create_rejects_invalid_fields_with_400(auth_client, changes, field, message):
    assert errors_by_field(auth_client.post("/api/incidents", json={**VALID, **changes})) == {field: message}


def test_create_without_title_or_with_unknown_category(auth_client):
    payload = {key: value for key, value in VALID.items() if key != "title"}
    assert errors_by_field(auth_client.post("/api/incidents", json={**payload, "category": "printer"})) == {
        "title": "El título es obligatorio",
        "category": (
            "La categoría no es válida. Valores permitidos: technical_failure, process_error, client_complaint, "
            "candidate_issue, staff_issue, sla_breach, data_quality, other"
        ),
    }


def test_create_with_malformed_body(auth_client):
    response = auth_client.post("/api/incidents", content="{not json", headers={"Content-Type": "application/json"})
    assert errors_by_field(response) == {"body": "El cuerpo de la petición no es un JSON válido"}


def test_list_filters_by_status_origin_branch_and_category(auth_client):
    first = create(auth_client)
    second = create(auth_client, origin="internal", branch="central", category="sla_breach")
    create(auth_client, origin="customer", branch="remote")
    auth_client.patch(f"/api/incidents/{first['id']}/status", json={"status": "in_progress"})

    def ids(query: str) -> list[int]:
        response = auth_client.get(f"/api/incidents{query}")
        assert response.status_code == 200, response.text
        return [incident["id"] for incident in response.json()]

    assert len(ids("")) == 3
    assert ids("?status=in_progress") == [first["id"]]
    assert ids("?origin=internal") == [second["id"]]
    assert ids("?category=sla_breach") == [second["id"]]
    assert ids("?branch=miami_office&status=in_progress") == [first["id"]]
    assert ids("?branch=valencia_operations") == []


def test_list_rejects_unknown_filter_values(auth_client):
    assert errors_by_field(auth_client.get("/api/incidents?status=closed")) == {
        "status": "El estado no es válido. Valores permitidos: open, in_progress, resolved, discarded"
    }


def test_summary_counts_every_value(auth_client):
    create(auth_client)
    create(auth_client, category="sla_breach", origin="customer", branch="central")
    summary = auth_client.get("/api/incidents/summary").json()
    assert summary["total"] == 2
    assert summary["by_status"]["open"] == 2
    assert summary["by_category"]["sla_breach"] == 1
    assert summary["by_category"]["other"] == 0
    assert summary["by_origin"] == {"customer": 1, "branch": 1, "internal": 0}
    assert summary["by_branch"]["miami_office"] == 1


def test_get_unknown_or_malformed_id(auth_client):
    response = auth_client.get("/api/incidents/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "No existe ninguna incidencia con id 999"}
    assert errors_by_field(auth_client.get("/api/incidents/abc")) == {
        "incident_id": "El identificador de la incidencia debe ser un número entero"
    }


def test_valid_transitions_update_status_and_updated_at(auth_client):
    incident = create(auth_client)
    moved = auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": "in_progress"}).json()
    assert moved["status"] == "in_progress"
    assert moved["next_statuses"] == ["resolved", "discarded"]
    assert moved["updated_at"] > incident["updated_at"]
    assert moved["created_at"] == incident["created_at"]
    assert {key: moved[key] for key in VALID} == {key: incident[key] for key in VALID}
    resolved = auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": "resolved"}).json()
    assert resolved["status"] == "resolved"
    assert resolved["next_statuses"] == []


@pytest.mark.parametrize(
    ("path", "status", "message"),
    [
        (["in_progress", "resolved"], "open", "No se puede pasar de «resolved» a «open»: «resolved» es un estado final"),
        (["discarded"], "in_progress", "No se puede pasar de «discarded» a «in_progress»: «discarded» es un estado final"),
        (
            [],
            "resolved",
            "No se puede pasar de «open» a «resolved»: desde «open» solo se puede pasar a «in_progress» o «discarded»",
        ),
        ([], "open", "No se puede pasar de «open» a «open»: desde «open» solo se puede pasar a «in_progress» o «discarded»"),
    ],
)
def test_invalid_transitions_give_400(auth_client, path, status, message):
    incident = create(auth_client)
    for step in path:
        assert auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": step}).status_code == 200
    response = auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": status})
    assert response.status_code == 400
    assert response.json() == {"detail": message}


def test_patch_status_errors(auth_client):
    response = auth_client.patch("/api/incidents/999/status", json={"status": "in_progress"})
    assert response.status_code == 404
    incident = create(auth_client)
    assert errors_by_field(auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": "closed"})) == {
        "status": "El estado no es válido. Valores permitidos: open, in_progress, resolved, discarded"
    }
    assert errors_by_field(auth_client.patch(f"/api/incidents/{incident['id']}/status", json={})) == {
        "status": "El estado es obligatorio"
    }


def test_unexpected_errors_give_generic_500_and_are_logged(auth_client, monkeypatch, caplog):
    def explode() -> None:
        raise RuntimeError("database file corrupted at /secret/path")

    monkeypatch.setattr(auth_client.app.state.incident_repository, "summary", explode)
    with caplog.at_level(logging.ERROR, logger="errors"):
        response = auth_client.get("/api/incidents/summary")
    assert response.status_code == 500
    assert response.json() == {"detail": "Ha ocurrido un error inesperado"}
    assert "secret" not in response.text and "Traceback" not in response.text
    assert "database file corrupted" in caplog.text
    assert "Traceback" in caplog.text


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/api/incidents"),
        ("GET", "/api/incidents"),
        ("GET", "/api/incidents/summary"),
        ("GET", "/api/incidents/1"),
        ("PATCH", "/api/incidents/1/status"),
    ],
)
def test_incident_manager_requires_a_token(anon_client, method, path):
    response = anon_client.request(method, path, json=VALID)
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_other_routes_keep_fastapi_422_format(anon_client):
    response = anon_client.post("/users", json={"email": "not-an-email", "password": "x"})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
