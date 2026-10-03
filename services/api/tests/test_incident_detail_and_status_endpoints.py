"""GET /api/incidents/{id} and PATCH /api/incidents/{id}/status."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from incidents import incident_store as store
from incidents import seeding
from incidents_analyzer import contract, read_rows
from main import app

URL = "/api/incidents"
CSV = Path(__file__).resolve().parents[3] / "data" / "raw" / "incidents-nexova.csv"
NEW = {
    "title": "VPN drops",
    "description": "VPN drops every ten minutes",
    "category": "technical_failure",
    "origin": "branch",
    "branch": "valencia_operations",
    "client_company": "Acme",
    "agent_id": "AGT-07",
    "customer_email": "jane.doe@acme.com",
}
# The lifecycle, as specified:  open -> in_progress | discarded ;  in_progress -> resolved | discarded ;  resolved, discarded final.
ALLOWED = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),
    "discarded": set(),
}
PATH_TO = {"open": [], "in_progress": ["in_progress"], "resolved": ["in_progress", "resolved"], "discarded": ["discarded"]}


@pytest.fixture()
def client(tmp_path, monkeypatch, auth_headers) -> TestClient:
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield TestClient(app, headers=auth_headers)
    database.close()


def create(client, **overrides) -> dict:
    response = client.post(URL, json={**NEW, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def move(client, incident_id, status, **extra):
    return client.patch(f"{URL}/{incident_id}/status", json={"status": status, **extra})


def incident_in(client, status: str) -> str:
    incident_id = create(client)["id"]
    for step in PATH_TO[status]:
        assert move(client, incident_id, step).status_code == 200
    return incident_id


# --- the spec's table is the contract's table --------------------------------------------------

def test_the_shared_contract_has_exactly_the_specified_transitions():
    assert {k: set(v) for k, v in contract.TRANSITIONS.items()} == ALLOWED


# =================================================================================================
# GET /api/incidents/{id}
# =================================================================================================

def test_detail_returns_the_whole_incident(client):
    created = create(client)
    response = client.get(f"{URL}/{created['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body == created
    assert {k: body[k] for k in NEW} == NEW
    assert (body["status"], body["satisfaction_score"], body["discard_reason"]) == ("open", None, None)
    assert body["created_at"] and body["updated_at"]
    assert body["allowed_transitions"] == ["in_progress", "discarded"] and body["editable"] is True
    assert [(h["kind"], h["to_status"]) for h in body["history"]] == [("created", "open")]


def test_detail_shows_the_current_state_after_changes(client):
    incident_id = create(client)["id"]
    move(client, incident_id, "in_progress")
    move(client, incident_id, "resolved", satisfaction_score=5)
    body = client.get(f"{URL}/{incident_id}").json()
    assert (body["status"], body["satisfaction_score"], body["allowed_transitions"], body["editable"]) == ("resolved", 5, [], False)
    assert [h["to_status"] for h in body["history"]] == ["open", "in_progress", "resolved"]


def test_detail_of_an_imported_incident(client):
    seeding.seed_rows(read_rows(str(CSV)))
    body = client.get(f"{URL}/NXV-000001").json()
    assert (body["id"], body["status"], body["origin"], body["branch"]) == ("NXV-000001", "resolved", "customer", "central")
    assert body["history"][0]["kind"] == "imported" and body["customer_email"]


def test_detail_does_not_change_anything(client):
    created = create(client)
    for _ in range(2):
        client.get(f"{URL}/{created['id']}")
    assert client.get(f"{URL}/{created['id']}").json() == created


@pytest.mark.parametrize("missing", ["NXV-999999", "NXV-000002", "nxv-000001", "abc", "NXV-1", "0"])
def test_a_missing_incident_is_404_with_a_clear_message(client, missing):
    create(client)  # NXV-000001 exists
    response = client.get(f"{URL}/{missing}")
    assert response.status_code == 404
    assert response.json() == {"detail": f"Incident {missing} not found"}


def test_detail_requires_authentication_even_for_a_missing_incident(client):
    created = create(client)["id"]
    assert TestClient(app).get(f"{URL}/{created}").status_code == 401
    assert TestClient(app).get(f"{URL}/NXV-999999").status_code == 401


def test_the_fixed_paths_are_not_taken_for_an_id(client):
    assert client.get(f"{URL}/summary").status_code == 200
    assert client.get(f"{URL}/facets").status_code == 200


# =================================================================================================
# PATCH /api/incidents/{id}/status
# =================================================================================================

def test_updates_only_the_status(client):
    before = create(client)
    after = move(client, before["id"], "in_progress").json()
    assert after["status"] == "in_progress"
    unchanged = ("id", "title", "description", "category", "origin", "branch", "client_company", "agent_id", "customer_email", "created_at")
    assert {k: after[k] for k in unchanged} == {k: before[k] for k in unchanged}
    assert after["updated_at"] > before["updated_at"]
    assert client.get(f"{URL}/{before['id']}").json() == after


def test_the_response_is_the_updated_incident_with_its_new_options(client):
    incident_id = create(client)["id"]
    body = move(client, incident_id, "in_progress").json()
    assert body["allowed_transitions"] == ["resolved", "discarded"] and body["editable"] is True
    assert body["history"][-1] | {"at": None} == {
        "at": None, "kind": "status_changed", "actor": "alice@example.com",
        "from_status": "open", "to_status": "in_progress", "fields": [], "note": None,
    }


@pytest.mark.parametrize("source", contract.STATUSES)
@pytest.mark.parametrize("target", contract.STATUSES)
def test_every_transition_is_checked_against_the_table(client, source, target):
    """All 16 (source, target) pairs: the 4 valid ones succeed, the other 12 are 409 and change nothing."""
    incident_id = incident_in(client, source)
    before = client.get(f"{URL}/{incident_id}").json()
    response = move(client, incident_id, target)
    if target in ALLOWED[source]:
        assert response.status_code == 200 and response.json()["status"] == target
    else:
        assert response.status_code == 409
        assert incident_id in response.json()["detail"] and source in response.json()["detail"]
        assert client.get(f"{URL}/{incident_id}").json() == before  # status, updated_at and history untouched


def test_exactly_four_transitions_are_valid():
    assert sum(len(targets) for targets in ALLOWED.values()) == 4


@pytest.mark.parametrize("final", ["resolved", "discarded"])
def test_resolved_and_discarded_are_final(client, final):
    incident_id = incident_in(client, final)
    body = client.get(f"{URL}/{incident_id}").json()
    assert body["allowed_transitions"] == [] and body["editable"] is False
    for target in contract.STATUSES:
        response = move(client, incident_id, target)
        assert response.status_code == 409 and "final status" in response.json()["detail"], target
    edit = client.patch(f"{URL}/{incident_id}", json={"title": "Trying to change a final incident"})
    assert edit.status_code == 409 and "final status" in edit.json()["detail"]
    assert client.get(f"{URL}/{incident_id}").json()["status"] == final


def test_an_open_incident_cannot_be_resolved_without_being_worked_on(client):
    incident_id = incident_in(client, "open")
    response = move(client, incident_id, "resolved")
    assert response.status_code == 409
    assert response.json()["detail"] == f"Incident {incident_id} cannot go from open to resolved. Allowed: in_progress, discarded."


def test_in_progress_cannot_go_back_to_open(client):
    incident_id = incident_in(client, "in_progress")
    response = move(client, incident_id, "open")
    assert response.status_code == 409
    assert response.json()["detail"] == f"Incident {incident_id} cannot go from in_progress to open. Allowed: resolved, discarded."


def test_moving_to_the_same_status_is_a_conflict(client):
    incident_id = incident_in(client, "in_progress")
    assert move(client, incident_id, "in_progress").json()["detail"] == f"Incident {incident_id} is already in_progress."


def test_the_full_path_is_recorded_in_the_history(client):
    incident_id = incident_in(client, "open")
    move(client, incident_id, "in_progress")
    body = move(client, incident_id, "resolved").json()
    assert [(h["from_status"], h["to_status"]) for h in body["history"][1:]] == [("open", "in_progress"), ("in_progress", "resolved")]
    assert body["created_at"] < body["updated_at"]


# --- the optional details of a transition --------------------------------------------------------

def test_the_status_alone_is_enough_for_every_valid_move(client):
    for source, target in [("open", "in_progress"), ("open", "discarded"), ("in_progress", "resolved"), ("in_progress", "discarded")]:
        body = move(client, incident_in(client, source), target).json()
        assert (body["status"], body["satisfaction_score"], body["discard_reason"]) == (target, None, None)


def test_a_satisfaction_score_can_be_given_when_resolving(client):
    incident_id = incident_in(client, "in_progress")
    for bad in (0, 6, -1, "good"):
        assert move(client, incident_id, "resolved", satisfaction_score=bad).status_code == 400
    assert client.get(f"{URL}/{incident_id}").json()["status"] == "in_progress"
    assert move(client, incident_id, "resolved", satisfaction_score=4).json()["satisfaction_score"] == 4


def test_a_discard_reason_can_be_given_when_discarding(client):
    incident_id = incident_in(client, "open")
    assert move(client, incident_id, "discarded", discard_reason="ok").status_code == 400  # 5-300 chars if given
    body = move(client, incident_id, "discarded", discard_reason="Duplicate of NXV-000001").json()
    assert body["discard_reason"] == "Duplicate of NXV-000001" and body["history"][-1]["note"] == "Duplicate of NXV-000001"


def test_score_and_reason_only_apply_to_their_status(client):
    incident_id = incident_in(client, "open")
    wrong_score = move(client, incident_id, "in_progress", satisfaction_score=3)
    assert wrong_score.status_code == 400 and wrong_score.json()["detail"][0]["loc"] == ["body", "satisfaction_score"]
    wrong_reason = move(client, incident_id, "in_progress", discard_reason="Not needed here")
    assert wrong_reason.status_code == 400 and wrong_reason.json()["detail"][0]["loc"] == ["body", "discard_reason"]
    assert move(client, incident_in(client, "in_progress"), "discarded", satisfaction_score=3).status_code == 400
    assert client.get(f"{URL}/{incident_id}").json()["status"] == "open"


# --- only the status is updated ------------------------------------------------------------------

@pytest.mark.parametrize("extra", [{"title": "New title"}, {"branch": "miami_office"}, {"origin": "internal"}, {"id": "NXV-000777"}, {"updated_at": "2020-01-01T00:00:00Z"}])
def test_other_fields_cannot_be_changed_through_the_status_endpoint(client, extra):
    before = create(client)
    response = move(client, before["id"], "in_progress", **extra)
    assert response.status_code == 400 and list(extra)[0] in {d["loc"][-1] for d in response.json()["detail"]}
    assert client.get(f"{URL}/{before['id']}").json() == before


@pytest.mark.parametrize("body", [{}, {"status": None}, {"status": ""}, {"status": "closed"}, {"status": "CLOSED"}, {"status": "OPEN"}, {"status": "Resolved"}, {"status": 1}])
def test_the_status_must_be_one_of_the_four_allowed_values(client, body):
    incident_id = create(client)["id"]
    response = client.patch(f"{URL}/{incident_id}/status", json=body)
    assert response.status_code == 400 and response.json()["detail"][0]["loc"][:2] == ["body", "status"]
    assert client.get(f"{URL}/{incident_id}").json()["status"] == "open"


def test_a_missing_incident_is_404_before_any_rule(client):
    assert move(client, "NXV-999999", "in_progress").status_code == 404
    response = move(client, "NXV-999999", "resolved")  # would be a 409 on an existing open incident
    assert response.status_code == 404 and response.json() == {"detail": "Incident NXV-999999 not found"}


def test_status_change_requires_authentication(client):
    incident_id = create(client)["id"]
    assert TestClient(app).patch(f"{URL}/{incident_id}/status", json={"status": "in_progress"}).status_code == 401
    assert client.get(f"{URL}/{incident_id}").json()["status"] == "open"


def test_the_docs_describe_the_outcomes(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert {"200", "404"} <= set(paths[f"{URL}/{{incident_id}}"]["get"]["responses"])
    assert {"200", "404", "409"} <= set(paths[f"{URL}/{{incident_id}}/status"]["patch"]["responses"])
