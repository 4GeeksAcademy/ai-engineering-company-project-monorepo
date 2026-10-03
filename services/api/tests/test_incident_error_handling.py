"""Error handling of the incident API: generic 500, 400 naming the field, reads on an empty database."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from incidents import incident_service as service
from incidents import incident_store as store
from main import app

URL = "/api/incidents"
VALID = {
    "title": "VPN drops",
    "description": "VPN drops every ten minutes",
    "category": "TECHNICAL",
    "origin": "customer",
    "branch": "central",
}
SECRET = "boom: /srv/nexova/secret_module.py line 42 password=hunter2"


@pytest.fixture()
def db(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield database
    database.close()


@pytest.fixture()
def client(db, auth_headers) -> TestClient:
    return TestClient(app, headers=auth_headers)


# =================================================================================================
# 500: generic, never a stack trace
# =================================================================================================

def explode(*_, **__):
    raise RuntimeError(SECRET)


@pytest.mark.parametrize(
    "method,path,target",
    [
        ("get", URL, "list_incidents"),
        ("get", f"{URL}/summary", "summarize"),
        ("get", f"{URL}/facets", "facets"),
        ("get", f"{URL}/NXV-000001", "get_incident"),
        ("post", URL, "create_incident"),
        ("patch", f"{URL}/NXV-000001", "update_incident"),
        ("patch", f"{URL}/NXV-000001/status", "change_status"),
    ],
)
def test_an_unexpected_error_is_a_generic_500_without_internals(client, monkeypatch, method, path, target):
    monkeypatch.setattr(service, target, explode)
    body_for = {"post": VALID, "patch": {"title": "New title"} if not path.endswith("status") else {"status": "in_progress"}}
    response = getattr(client, method)(path, **({"json": body_for[method]} if method in body_for else {}))
    assert response.status_code == 500
    body = response.json()
    assert set(body) == {"detail", "error_id"}
    assert body["detail"] == "Internal server error. Please try again later."
    assert len(body["error_id"]) == 8
    for leak in ("Traceback", "RuntimeError", "hunter2", "secret_module", "/srv", "line 42", ".py", "File "):
        assert leak not in response.text


def test_the_error_is_logged_with_its_id_and_trace_for_the_team(client, monkeypatch, caplog):
    monkeypatch.setattr(service, "summarize", explode)
    with caplog.at_level(logging.ERROR, logger="core.errors"):
        response = client.get(f"{URL}/summary")
    error_id = response.json()["error_id"]
    record = next(r for r in caplog.records if error_id in r.getMessage())
    assert "GET /api/incidents/summary" in record.getMessage()
    assert record.exc_info and record.exc_info[0] is RuntimeError  # the trace is in the log, not in the response


def test_every_500_has_its_own_error_id(client, monkeypatch):
    monkeypatch.setattr(service, "facets", explode)
    ids = {client.get(f"{URL}/facets").json()["error_id"] for _ in range(3)}
    assert len(ids) == 3


def test_a_500_still_carries_the_cors_headers_so_the_browser_can_read_it(client, monkeypatch):
    monkeypatch.setattr(service, "summarize", explode)
    response = client.get(f"{URL}/summary", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 500 and response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_other_domains_get_the_same_generic_500(client, monkeypatch):
    from suppliers import service as suppliers_service

    monkeypatch.setattr(suppliers_service, "list_suppliers", explode)
    response = client.get("/suppliers")
    assert response.status_code == 500 and response.json()["detail"] == "Internal server error. Please try again later."
    assert "hunter2" not in response.text and "Traceback" not in response.text


def test_expected_errors_are_not_turned_into_500(client):
    assert client.get(f"{URL}/NXV-999999").status_code == 404
    assert client.get("/no/such/route").status_code == 404
    assert TestClient(app).get(URL).status_code == 401
    assert client.post(f"{URL}/NXV-000001/status", json={}).status_code == 405


def test_a_corrupt_database_file_is_a_generic_500_not_a_trace(tmp_path, monkeypatch, auth_headers):
    broken = tmp_path / "broken.json"
    broken.write_text("{ this is not json", encoding="utf-8")
    monkeypatch.setattr(store, "_db", None)
    monkeypatch.setattr("incidents.incident_store.get_incidents_db_path", lambda: broken)
    response = TestClient(app, headers=auth_headers).get(URL)
    assert response.status_code == 500 and set(response.json()) == {"detail", "error_id"}
    assert "JSON" not in response.text and "broken.json" not in response.text


# =================================================================================================
# 400: the problematic field
# =================================================================================================

@pytest.mark.parametrize(
    "method,path,kwargs,field",
    [
        ("post", URL, {"json": {**VALID, "title": "ab"}}, "title"),
        ("post", URL, {"json": {**VALID, "category": "SPAM"}}, "category"),
        ("post", URL, {"json": {**VALID, "customer_email": "nope"}}, "customer_email"),
        ("post", URL, {"json": {**VALID, "id": "NXV-000999"}}, "id"),
        ("get", URL, {"params": {"status": "closed"}}, "status"),
        ("get", URL, {"params": {"origin": "web"}}, "origin"),
        ("get", URL, {"params": {"category": "x"}}, "category"),
        ("get", URL, {"params": {"page": 0}}, "page"),
        ("get", URL, {"params": {"page": "abc"}}, "page"),
        ("get", URL, {"params": {"page_size": 1000}}, "page_size"),
        ("get", URL, {"params": {"sort": "title"}}, "sort"),
        ("get", URL, {"params": {"date_from": "yesterday"}}, "date_from"),
        ("get", URL, {"params": {"date_from": "2024-02-01", "date_to": "2024-01-01"}}, "date_from"),
        ("get", f"{URL}/summary", {"params": {"status": "OPEN"}}, "status"),
        ("patch", "{existing}", {"json": {}}, None),
        ("patch", "{existing}", {"json": {"title": None}}, None),
        ("patch", "{existing}", {"json": {"title": "x"}}, "title"),
        ("patch", "{existing}", {"json": {"origin": "branch"}}, "branch"),  # branch is "central": the merged record is invalid
        ("patch", "{existing}/status", {"json": {"status": "closed"}}, "status"),
        ("patch", "{existing}/status", {"json": {"status": "in_progress", "title": "x"}}, "title"),
        ("patch", "{existing}/status", {"json": {"status": "in_progress", "satisfaction_score": 3}}, "satisfaction_score"),
        ("patch", "{existing}/status", {"json": {"status": "discarded", "discard_reason": "ok"}}, "discard_reason"),
        ("post", f"{URL}/analyze", {}, "file"),
    ],
)
def test_validation_errors_are_400_and_name_the_problematic_field(client, method, path, kwargs, field):
    existing = f"{URL}/{client.post(URL, json=VALID).json()['id']}"
    response = getattr(client, method)(path.replace("{existing}", existing), **kwargs)
    assert response.status_code == 400, response.text
    body = response.json()
    assert body["message"].startswith("The request is not valid: ") and body["detail"]
    if field:
        assert field in {d["field"] for d in body["detail"]}
    for d in body["detail"]:
        assert set(d) == {"field", "loc", "msg", "type"} and d["msg"]


def test_a_400_names_every_problematic_field_at_once(client):
    response = client.post(URL, json={"title": "ab", "category": "SPAM", "origin": "web", "customer_email": "x"})
    assert [d["field"] for d in response.json()["detail"]] == ["title", "description", "category", "origin", "branch", "customer_email"]


def test_the_400_never_echoes_the_values_sent(client):
    existing = client.post(URL, json=VALID).json()["id"]
    sent = {"customer_email": "secret.person@private.org@@", "category": "SECRET-CATEGORY", "title": "ab"}
    for response in (
        client.post(URL, json={**VALID, **sent}),
        client.patch(f"{URL}/{existing}", json=sent),
        client.get(URL, params={"status": "SECRET-STATUS", "date_to": "SECRET-DATE"}),
    ):
        assert response.status_code == 400
        assert "secret" not in response.text.lower()


def test_the_invalid_request_is_checked_before_the_incident_is_looked_up(client):
    assert client.patch(f"{URL}/NXV-999999/status", json={"status": "closed"}).status_code == 400
    assert client.patch(f"{URL}/NXV-999999/status", json={"status": "in_progress"}).status_code == 404


def test_the_docs_advertise_400_on_every_incident_endpoint(client):
    paths = client.get("/openapi.json").json()["paths"]
    for path, operations in paths.items():
        if path.startswith(URL):
            for method, operation in operations.items():
                responses = operation["responses"]
                assert "422" not in responses, (method, path)
                if operation.get("parameters") or operation.get("requestBody"):
                    assert "400" in responses, (method, path)


# =================================================================================================
# Reads never fail on an empty (or odd) database
# =================================================================================================

def empty_reads(client):
    listing = client.get(URL)
    assert listing.status_code == 200
    assert listing.json() == {"items": [], "total": 0, "page": 1, "page_size": 20, "pages": 0}
    summary = client.get(f"{URL}/summary")
    assert summary.status_code == 200
    facets = client.get(f"{URL}/facets")
    assert facets.status_code == 200 and facets.json() == {"branches": [], "clients": [], "agents": []}
    assert client.get(f"{URL}/NXV-000001").status_code == 404  # a missing incident is a 404, not a failure
    return summary.json()


def test_reads_on_an_empty_database(client):
    empty_reads(client)


def test_reads_with_every_filter_on_an_empty_database(client):
    params = {
        "status": ["open", "resolved"], "category": "ACCESS", "origin": "branch", "branch": "Madrid",
        "agent_id": "AGT-01", "client_company": "x", "q": "text", "date_from": "2024-01-01", "date_to": "2024-12-31",
        "sort": "id", "order": "asc", "page": 3, "page_size": 5,
    }
    assert client.get(URL, params=params).json() == {"items": [], "total": 0, "page": 3, "page_size": 5, "pages": 0}
    assert client.get(f"{URL}/summary", params=params).status_code == 200


@pytest.mark.parametrize("content", [None, "", "   \n", "{}", '{"_default": {}}'], ids=["no-file", "0-bytes", "blank", "empty-object", "empty-table"])
def test_reads_on_real_empty_files(tmp_path, monkeypatch, auth_headers, content):
    path = tmp_path / "incidents" / "db.json"
    path.parent.mkdir()
    if content is not None:
        path.write_text(content, encoding="utf-8")
    monkeypatch.setattr(store, "_db", None)
    monkeypatch.setattr("incidents.incident_store.get_incidents_db_path", lambda: path)
    empty_reads(TestClient(app, headers=auth_headers))


def test_documents_left_by_an_older_data_model_are_skipped_not_fatal(client, db):
    db.insert({"ticket_id": "NXV-000007", "status": "OPEN", "category": "ACCESS"})  # the first version of the model
    db.insert({"id": "NXV-000008"})  # half-written
    db.insert({"x": 1})  # no id at all
    created = client.post(URL, json=VALID).json()
    assert created["id"] == "NXV-000009"  # unreadable documents still reserve their id: it is never reused
    assert [i["id"] for i in client.get(URL).json()["items"]] == [created["id"]]
    assert client.get(f"{URL}/summary").json()["total"] == 1
    assert client.get(f"{URL}/facets").json()["branches"] == ["central"]
    assert client.get(f"{URL}/NXV-000008").status_code == 404


# =================================================================================================
# GET /api/incidents/summary: zeros when there is nothing
# =================================================================================================

ZERO_STATUS = {"open": 0, "in_progress": 0, "resolved": 0, "discarded": 0}
ZERO_CATEGORY = {"TECHNICAL": 0, "BILLING": 0, "ACCESS": 0, "HR_QUERY": 0, "COMPLAINT": 0}
ZERO_ORIGIN = {"customer": 0, "branch": 0, "internal": 0}


def test_the_summary_of_an_empty_database_is_all_zeros(client):
    summary = client.get(f"{URL}/summary").json()
    assert summary == {
        "total": 0,
        "status_counts": ZERO_STATUS,
        "status_percentages": ZERO_STATUS | {k: 0.0 for k in ZERO_STATUS},
        "category_counts": ZERO_CATEGORY,
        "category_percentages": {k: 0.0 for k in ZERO_CATEGORY},
        "origin_counts": ZERO_ORIGIN,
        "branch_counts": {"central": 0},
        "branch_percentages": {"central": 0.0},
        "active_by_category": ZERO_CATEGORY,
        "satisfaction_average": None,  # there is no score to average (0 would be a score nobody can give)
        "satisfaction_scored": 0,
        "satisfaction_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        "top_branches": [],
        "top_clients": [],
    }


def test_the_summary_is_zero_when_the_filters_match_nothing(client):
    client.post(URL, json=VALID)
    summary = client.get(f"{URL}/summary", params={"status": "resolved", "origin": "internal"}).json()
    assert summary["total"] == 0 and summary["status_counts"] == ZERO_STATUS and summary["branch_counts"] == {"central": 0}


def test_the_summary_totals_by_status_category_origin_and_branch(client):
    def make(origin, branch, category, steps=()):
        incident_id = client.post(URL, json={**VALID, "origin": origin, "branch": branch, "category": category}).json()["id"]
        for step in steps:
            assert client.patch(f"{URL}/{incident_id}/status", json={"status": step}).status_code == 200

    make("customer", "central", "TECHNICAL")
    make("customer", "central", "BILLING", ["in_progress"])
    make("branch", "Valencia", "ACCESS", ["in_progress", "resolved"])
    make("branch", "Valencia", "ACCESS", ["discarded"])
    make("branch", "Madrid", "TECHNICAL")
    make("internal", "central", "COMPLAINT", ["in_progress"])
    summary = client.get(f"{URL}/summary").json()

    assert summary["total"] == 6
    assert summary["status_counts"] == {"open": 2, "in_progress": 2, "resolved": 1, "discarded": 1}
    assert summary["category_counts"] == {"TECHNICAL": 2, "BILLING": 1, "ACCESS": 2, "HR_QUERY": 0, "COMPLAINT": 1}
    assert summary["origin_counts"] == {"customer": 2, "branch": 3, "internal": 1}
    assert summary["branch_counts"] == {"central": 3, "Valencia": 2, "Madrid": 1}
    assert list(summary["branch_counts"]) == ["central", "Valencia", "Madrid"]  # biggest first
    assert summary["branch_percentages"] == {"central": 50.0, "Valencia": 33.3, "Madrid": 16.7}
    assert summary["active_by_category"] == {"TECHNICAL": 2, "BILLING": 1, "ACCESS": 0, "HR_QUERY": 0, "COMPLAINT": 1}
    for counts in ("status_counts", "category_counts", "origin_counts", "branch_counts"):
        assert sum(summary[counts].values()) == summary["total"], counts


def test_a_branch_with_a_total_of_zero_still_lists_central_first(client):
    client.post(URL, json={**VALID, "origin": "branch", "branch": "Valencia"})
    assert client.get(f"{URL}/summary").json()["branch_counts"] == {"central": 0, "Valencia": 1}


def test_the_summary_requires_authentication(db):
    assert TestClient(app).get(f"{URL}/summary").status_code == 401
