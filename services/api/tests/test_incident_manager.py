"""Incident manager: data model, lifecycle, filters, summary, seed and shared contract."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from incidents import incident_store as store
from incidents import seeding
from incidents_analyzer import contract, read_rows
from main import app

NEW = {
    "title": "VPN drops",
    "description": "VPN drops every ten minutes",
    "category": "TECHNICAL",
    "origin": "customer",
    "branch": "central",
}
BASE = "/api/incidents"
CSV = Path(__file__).resolve().parents[3] / "data" / "raw" / "incidents-nexova.csv"
REQUIRED = ["title", "description", "category", "origin", "branch"]


@pytest.fixture()
def seeded(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    report = seeding.seed_rows(read_rows(str(CSV)))
    yield report
    database.close()


@pytest.fixture()
def empty(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield
    database.close()


@pytest.fixture()
def client(auth_headers) -> TestClient:
    return TestClient(app, headers=auth_headers)


def create(client, **overrides) -> dict:
    response = client.post(BASE, json={**NEW, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def move(client, incident_id, status, **extra):
    return client.patch(f"{BASE}/{incident_id}/status", json={"status": status, **extra})


def fields_in(response) -> set[str]:
    return {e["loc"][-1] for e in response.json()["detail"]}


# --- shared contract -------------------------------------------------------------------------

def test_python_constants_come_from_the_shared_contract_file():
    raw = json.loads(contract.CONTRACT_PATH.read_text(encoding="utf-8"))
    assert contract.CONTRACT_PATH.parts[-3:] == ("shared", "incidents", "contract.json")
    assert list(contract.VALID_CATEGORIES) == raw["categories"]
    assert list(contract.STATUSES) == raw["statuses"] == ["open", "in_progress", "resolved", "discarded"]
    assert list(contract.ORIGINS) == raw["origins"] == ["customer", "branch", "internal"]
    assert {k: list(v) for k, v in contract.TRANSITIONS.items()} == raw["transitions"]
    assert contract.DEFAULT_BRANCH == "central"


def test_every_csv_category_maps_to_a_manager_category():
    assert set(contract.CSV_CATEGORY_MAP) == set(contract.VALID_CATEGORIES)
    assert set(contract.CSV_CATEGORY_MAP.values()) <= set(contract.VALID_CATEGORIES)


def test_every_csv_status_maps_to_a_lifecycle_status():
    assert set(contract.CSV_STATUS_MAP) == set(contract.CSV_STATUSES)
    assert set(contract.CSV_STATUS_MAP.values()) <= set(contract.STATUSES)


def test_every_transition_goes_between_known_statuses():
    for source, targets in contract.TRANSITIONS.items():
        assert source in contract.STATUSES and set(targets) <= set(contract.STATUSES) - {source}
    assert set(contract.EDITABLE_STATUSES) <= set(contract.STATUSES)


# --- create / read ---------------------------------------------------------------------------

def test_requires_authentication(seeded):
    assert TestClient(app).get(BASE).status_code == 401


def test_create_assigns_next_id_opens_it_and_records_history(seeded, client):
    body = create(client)
    assert body["id"] == "NXV-000101"  # the CSV ends at NXV-000100
    assert body["status"] == "open" and body["satisfaction_score"] is None
    assert body["created_at"] == body["updated_at"]
    assert body["allowed_transitions"] == ["in_progress", "discarded"] and body["editable"] is True
    assert [(h["kind"], h["actor"], h["to_status"]) for h in body["history"]] == [("created", "alice@example.com", "open")]
    assert client.get(f"{BASE}/NXV-000101").json() == body


def test_create_on_empty_database_starts_at_one(empty, client):
    assert create(client)["id"] == "NXV-000001"


def test_optional_fields_can_be_given_or_left_out(empty, client):
    bare = create(client)
    assert (bare["client_company"], bare["agent_id"], bare["customer_email"]) == (None, None, None)
    full = create(client, client_company="Acme", agent_id="AGT-07", customer_email="jane@acme.com")
    assert (full["client_company"], full["agent_id"], full["customer_email"]) == ("Acme", "AGT-07", "jane@acme.com")


@pytest.mark.parametrize("field", REQUIRED)
def test_each_required_field_is_enforced(empty, client, field):
    body = {k: v for k, v in NEW.items() if k != field}
    response = client.post(BASE, json=body)
    assert response.status_code == 422 and fields_in(response) == {field}
    assert store.all_docs() == []


@pytest.mark.parametrize("field", REQUIRED)
def test_required_fields_cannot_be_null_or_blank(empty, client, field):
    assert client.post(BASE, json={**NEW, field: None}).status_code == 422
    assert client.post(BASE, json={**NEW, field: "   "}).status_code == 422


@pytest.mark.parametrize(
    "overrides,field",
    [
        ({"title": "ab"}, "title"),
        ({"title": "x" * 121}, "title"),
        ({"description": "abc"}, "description"),
        ({"category": "SPAM"}, "category"),
        ({"category": "technical"}, "category"),  # the values are exact
        ({"origin": "web"}, "origin"),
        ({"origin": "Customer"}, "origin"),
        ({"branch": "x" * 61}, "branch"),
        ({"agent_id": "AGT-7"}, "agent_id"),
        ({"customer_email": "not-an-email"}, "customer_email"),
        ({"status": "resolved"}, "status"),  # status is not client-settable on creation
        ({"id": "NXV-000999"}, "id"),  # the id is generated
        ({"created_at": "2020-01-01T00:00:00Z"}, "created_at"),  # so are the timestamps
    ],
)
def test_allowed_values_and_unknown_fields_are_rejected_without_echoing(empty, client, overrides, field):
    response = client.post(BASE, json={**NEW, **overrides})
    assert response.status_code == 422 and field in fields_in(response)
    assert "not-an-email" not in response.text and "SPAM" not in response.text
    assert store.all_docs() == []


def test_branch_is_normalised_and_required_for_branch_origin(empty, client):
    assert create(client, branch="  Central ")["branch"] == "central"
    assert create(client, origin="branch", branch="Valencia Centro")["branch"] == "Valencia Centro"
    assert create(client, origin="internal", branch="Miami")["origin"] == "internal"
    response = client.post(BASE, json={**NEW, "origin": "branch", "branch": "Central"})
    assert response.status_code == 422 and fields_in(response) == {"branch"}


def test_unknown_incident_is_404_with_a_clear_message(seeded, client):
    response = client.get(f"{BASE}/NXV-999999")
    assert response.status_code == 404 and "NXV-999999" in response.json()["detail"]


# --- edit ------------------------------------------------------------------------------------

def test_patch_edits_and_logs_which_fields_changed(seeded, client):
    incident = create(client, customer_email="jane.doe@acme.com")
    response = client.patch(f"{BASE}/{incident['id']}", json={"title": "VPN keeps dropping", "branch": "Valencia"})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "VPN keeps dropping" and body["branch"] == "Valencia"
    assert body["updated_at"] > body["created_at"]
    assert body["history"][-1]["kind"] == "edited" and body["history"][-1]["fields"] == ["branch", "title"]
    assert "jane.doe@acme.com" not in json.dumps(body["history"])


def test_optional_fields_can_be_cleared_with_null(seeded, client):
    incident = create(client, client_company="Acme")
    body = client.patch(f"{BASE}/{incident['id']}", json={"client_company": None}).json()
    assert body["client_company"] is None


def test_patch_with_no_effective_change_does_not_touch_history(seeded, client):
    body = create(client)
    assert client.patch(f"{BASE}/{body['id']}", json={"title": body["title"]}).json() == body


@pytest.mark.parametrize(
    "payload",
    [{}, {"title": None}, {"branch": None}, {"status": "resolved"}, {"id": "NXV-000500"}, {"title": "x"}, {"origin": "web"}],
)
def test_patch_rejects_empty_nulls_status_id_and_invalid_values(seeded, client, payload):
    incident = create(client)["id"]
    assert client.patch(f"{BASE}/{incident}", json=payload).status_code == 422


def test_patch_revalidates_origin_against_the_stored_branch(seeded, client):
    incident = create(client)["id"]  # branch = central
    response = client.patch(f"{BASE}/{incident}", json={"origin": "branch"})
    assert response.status_code == 422 and "branch" in fields_in(response)
    assert client.get(f"{BASE}/{incident}").json()["origin"] == "customer"
    assert client.patch(f"{BASE}/{incident}", json={"origin": "branch", "branch": "Madrid"}).status_code == 200


def test_in_progress_is_editable_but_resolved_is_not_until_reopened(seeded, client):
    incident = create(client)["id"]
    move(client, incident, "in_progress")
    assert client.patch(f"{BASE}/{incident}", json={"title": "Still working on it"}).status_code == 200
    move(client, incident, "resolved")
    locked = client.patch(f"{BASE}/{incident}", json={"title": "Changed after resolving"})
    assert locked.status_code == 409 and "Reopen" in locked.json()["detail"]
    move(client, incident, "open")
    assert client.patch(f"{BASE}/{incident}", json={"title": "Changed after reopening"}).status_code == 200


# --- lifecycle -------------------------------------------------------------------------------

def test_happy_path_open_in_progress_resolved_keeps_the_audit_trail(seeded, client):
    incident = create(client)["id"]
    working = move(client, incident, "in_progress").json()
    assert working["status"] == "in_progress" and working["allowed_transitions"] == ["resolved", "open", "discarded"]
    done = move(client, incident, "resolved", satisfaction_score=4).json()
    assert done["status"] == "resolved" and done["satisfaction_score"] == 4
    assert done["allowed_transitions"] == ["open"] and done["editable"] is False
    assert [(h["from_status"], h["to_status"]) for h in done["history"][1:]] == [("open", "in_progress"), ("in_progress", "resolved")]


def test_satisfaction_score_is_optional_when_resolving_but_must_be_1_to_5(seeded, client):
    incident = create(client)["id"]
    move(client, incident, "in_progress")
    for bad in (0, 6, -1):
        assert move(client, incident, "resolved", satisfaction_score=bad).status_code == 422
    assert client.get(f"{BASE}/{incident}").json()["status"] == "in_progress"
    assert move(client, incident, "resolved").json()["satisfaction_score"] is None


def test_score_only_applies_when_resolving(seeded, client):
    incident = create(client)["id"]
    response = move(client, incident, "in_progress", satisfaction_score=3)
    assert response.status_code == 422 and response.json()["detail"][0]["loc"] == ["body", "satisfaction_score"]


def test_cannot_resolve_without_working_on_it(seeded, client):
    incident = create(client)["id"]
    response = move(client, incident, "resolved")
    assert response.status_code == 409 and "cannot go from open to resolved" in response.json()["detail"]
    assert client.get(f"{BASE}/{incident}").json()["status"] == "open"


def test_discard_requires_a_reason_from_open_or_in_progress(seeded, client):
    for first in ("open", "in_progress"):
        incident = create(client)["id"]
        if first == "in_progress":
            move(client, incident, "in_progress")
        assert move(client, incident, "discarded").json()["detail"][0]["loc"] == ["body", "discard_reason"]
        assert move(client, incident, "discarded", discard_reason="ok").status_code == 422  # too short
        assert move(client, incident, "discarded", discard_reason="Duplicate of NXV-000001", satisfaction_score=3).status_code == 422
        body = move(client, incident, "discarded", discard_reason="Duplicate of NXV-000001").json()
        assert body["discard_reason"] == "Duplicate of NXV-000001" and body["history"][-1]["note"] == "Duplicate of NXV-000001"


def test_reason_only_applies_when_discarding(seeded, client):
    incident = create(client)["id"]
    response = move(client, incident, "in_progress", discard_reason="Not needed here")
    assert response.status_code == 422 and fields_in(response) == {"discard_reason"}


def test_reopen_clears_score_and_reason(seeded, client):
    incident = create(client)["id"]
    move(client, incident, "in_progress")
    move(client, incident, "resolved", satisfaction_score=2)
    reopened = move(client, incident, "open").json()
    assert reopened["status"] == "open" and reopened["satisfaction_score"] is None and reopened["editable"]
    move(client, incident, "discarded", discard_reason="Entered by mistake")
    assert move(client, incident, "open").json()["discard_reason"] is None


def test_in_progress_can_go_back_to_open(seeded, client):
    incident = create(client)["id"]
    move(client, incident, "in_progress")
    assert move(client, incident, "open").json()["status"] == "open"


@pytest.mark.parametrize("source", contract.STATUSES)
@pytest.mark.parametrize("target", contract.STATUSES)
def test_the_whole_transition_table_is_enforced(seeded, client, source, target):
    """Every (source, target) pair: allowed pairs succeed, all others are 409 and change nothing."""
    incident = create(client)["id"]
    path = {"open": [], "in_progress": ["in_progress"], "resolved": ["in_progress", "resolved"], "discarded": ["discarded"]}
    for step in path[source]:
        extra = {"discard_reason": "Not a real incident"} if step == "discarded" else {}
        assert move(client, incident, step, **extra).status_code == 200
    extra = {"discard_reason": "Not a real incident"} if target == "discarded" else {}
    response = move(client, incident, target, **extra)
    if target in contract.TRANSITIONS[source]:
        assert response.status_code == 200 and response.json()["status"] == target
    else:
        assert response.status_code == 409 and incident in response.json()["detail"]
        assert client.get(f"{BASE}/{incident}").json()["status"] == source


def test_unknown_status_is_422_and_unknown_incident_is_404(seeded, client):
    incident = create(client)["id"]
    assert move(client, incident, "closed").status_code == 422  # the CSV vocabulary is not accepted
    assert move(client, "NXV-999999", "open").status_code == 404


def test_stored_incidents_cannot_break_the_lifecycle_invariants():
    from pydantic import ValidationError
    from incidents.incident_schemas import IncidentRecord

    base = {**NEW, "id": "NXV-000001", "status": "open", "created_at": "2024-01-02T00:00:00Z", "updated_at": "2024-01-02T00:00:00Z"}
    IncidentRecord(**base)
    for broken in (
        {"satisfaction_score": 3},  # a score on an open incident
        {"status": "resolved", "discard_reason": "no longer needed"},
        {"discard_reason": "no longer needed"},
        {"updated_at": "2024-01-01T00:00:00Z"},  # modified before it was created
        {"id": "ticket-1"},
    ):
        with pytest.raises(ValidationError):
            IncidentRecord(**{**base, **broken})


# --- list / filters --------------------------------------------------------------------------

def test_list_is_paginated_sorted_and_masks_customer_emails(seeded, client):
    body = client.get(BASE, params={"page_size": 10}).json()
    assert (body["total"], body["pages"], len(body["items"])) == (96, 10, 10)
    created = [i["created_at"] for i in body["items"]]
    assert created == sorted(created, reverse=True)
    for item in body["items"]:
        assert "customer_email" not in item and item["customer_email_masked"][1:4] == "***"
    assert len(client.get(BASE, params={"page": 10, "page_size": 10}).json()["items"]) == 6
    by_id = client.get(BASE, params={"sort": "id", "order": "asc", "page_size": 3}).json()["items"]
    assert [i["id"] for i in by_id] == ["NXV-000001", "NXV-000002", "NXV-000003"]


def test_list_item_without_email_has_no_mask(empty, client):
    create(client)
    assert client.get(BASE).json()["items"][0]["customer_email_masked"] is None


def test_filters_combine_with_and(seeded, client):
    assert client.get(BASE, params={"status": "open", "page_size": 100}).json()["total"] == 27
    both = client.get(BASE, params={"status": ["open", "discarded"], "category": "BILLING", "page_size": 100}).json()
    assert both["total"] > 0
    assert {i["status"] for i in both["items"]} <= {"open", "discarded"} and {i["category"] for i in both["items"]} == {"BILLING"}


def test_filter_by_origin_and_branch(seeded, client):
    create(client, origin="branch", branch="Valencia Centro")
    create(client, origin="internal", branch="central")
    assert client.get(BASE, params={"origin": "branch"}).json()["total"] == 1
    assert client.get(BASE, params={"origin": ["branch", "internal"]}).json()["total"] == 2
    assert client.get(BASE, params={"branch": "valencia centro"}).json()["total"] == 1
    assert client.get(BASE, params={"branch": "central"}).json()["total"] == 96 + 1
    assert client.get(BASE, params={"origin": "web"}).status_code == 422


def test_text_search_matches_title_client_branch_but_never_the_email(seeded, client):
    found = create(client, title="Printer on fire", client_company="Zeta Industries", branch="Lisbon", customer_email="jane.doe@acme.com")
    assert [i["id"] for i in client.get(BASE, params={"q": "printer ON fire"}).json()["items"]] == [found["id"]]
    assert client.get(BASE, params={"q": "zeta"}).json()["total"] == 1
    assert client.get(BASE, params={"q": "lisbon"}).json()["total"] == 1
    assert client.get(BASE, params={"q": "jane.doe"}).json()["total"] == 0


def test_date_range_filters_on_creation_day_and_rejects_a_bad_range(seeded, client):
    in_range = client.get(BASE, params={"date_from": "2024-01-10", "date_to": "2024-01-12", "page_size": 100}).json()
    assert 0 < in_range["total"] < 96
    assert all("2024-01-10" <= i["created_at"][:10] <= "2024-01-12" for i in in_range["items"])
    assert client.get(BASE, params={"date_from": "2024-02-01", "date_to": "2024-01-01"}).status_code == 422


def test_invalid_query_values_are_422(seeded, client):
    assert client.get(BASE, params={"status": "OPEN"}).status_code == 422
    assert client.get(BASE, params={"page": 0}).status_code == 422
    assert client.get(BASE, params={"page_size": 1000}).status_code == 422
    assert client.get(BASE, params={"sort": "title"}).status_code == 422


def test_facets_list_branches_clients_and_agents(seeded, client):
    create(client, branch="Valencia")
    facets = client.get(f"{BASE}/facets").json()
    assert facets["branches"] == ["central", "Valencia"]
    assert "FinServ Group" in facets["clients"] and all(a.startswith("AGT-") for a in facets["agents"])


# --- summary ---------------------------------------------------------------------------------

def test_summary_matches_the_csv_report_figures(seeded, client):
    s = client.get(f"{BASE}/summary").json()
    assert s["total"] == 96
    assert s["status_counts"] == {"open": 27, "in_progress": 0, "resolved": 56, "discarded": 13}
    assert s["category_counts"] == {"TECHNICAL": 28, "BILLING": 18, "ACCESS": 21, "HR_QUERY": 17, "COMPLAINT": 12}
    assert s["origin_counts"] == {"customer": 96, "branch": 0, "internal": 0}
    assert s["satisfaction_average"] == 3.84 and s["satisfaction_scored"] == 56
    assert s["satisfaction_distribution"] == {"1": 2, "2": 5, "3": 10, "4": 22, "5": 17}
    assert sum(s["active_by_category"].values()) == 27
    assert s["top_branches"] == [{"name": "central", "count": 96}] and len(s["top_clients"]) == 5


def test_summary_counts_in_progress_in_the_backlog_and_respects_filters(seeded, client):
    incident = create(client)["id"]
    move(client, incident, "in_progress")
    s = client.get(f"{BASE}/summary").json()
    assert s["status_counts"]["in_progress"] == 1 and sum(s["active_by_category"].values()) == 28
    closed = client.get(f"{BASE}/summary", params={"status": "resolved"}).json()
    assert closed["total"] == 56 and closed["status_counts"]["open"] == 0


def test_summary_is_safe_when_nothing_matches(seeded, client):
    none = client.get(f"{BASE}/summary", params={"q": "zzzz-no-match"}).json()
    assert none["total"] == 0 and none["satisfaction_average"] is None and none["top_branches"] == []
