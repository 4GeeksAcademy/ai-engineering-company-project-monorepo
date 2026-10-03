"""GET /api/incidents: list incidents, filtered by status, origin, branch and category."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from incidents import incident_store as store
from main import app

URL = "/api/incidents"

# id -> (category, origin, branch, status)
CASES = {
    "NXV-000001": ("technical_failure", "customer", "central", "open"),
    "NXV-000002": ("process_error", "customer", "central", "in_progress"),
    "NXV-000003": ("client_complaint", "branch", "valencia_operations", "open"),
    "NXV-000004": ("technical_failure", "branch", "miami_office", "resolved"),
    "NXV-000005": ("staff_issue", "internal", "central", "discarded"),
    "NXV-000006": ("sla_breach", "branch", "valencia_operations", "in_progress"),
}


@pytest.fixture()
def client(tmp_path, monkeypatch, auth_headers) -> TestClient:
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    api = TestClient(app, headers=auth_headers)
    for i, (category, origin, branch, status) in enumerate(CASES.values(), start=1):
        body = {"title": f"Incident {i}", "description": f"Description of incident {i}", "category": category, "origin": origin, "branch": branch}
        assert api.post(URL, json=body).status_code == 201
        path = {"open": [], "in_progress": ["in_progress"], "resolved": ["in_progress", "resolved"], "discarded": ["discarded"]}[status]
        for step in path:
            extra = {"discard_reason": "Not a real incident"} if step == "discarded" else {}
            assert api.patch(f"{URL}/NXV-{i:06d}/status", json={"status": step, **extra}).status_code == 200
    yield api
    database.close()


def ids(response) -> set[str]:
    assert response.status_code == 200, response.text
    return {item["id"] for item in response.json()["items"]}


def expected(**wanted) -> set[str]:
    """The ids of CASES matching every given criterion (each a set of allowed values)."""
    keys = ("category", "origin", "branch", "status")
    return {
        incident_id
        for incident_id, values in CASES.items()
        if all(values[keys.index(k)] in allowed for k, allowed in wanted.items())
    }


def test_without_filters_lists_everything_with_page_metadata(client):
    body = client.get(URL).json()
    assert {i["id"] for i in body["items"]} == set(CASES)
    assert (body["total"], body["page"], body["page_size"], body["pages"]) == (6, 1, 20, 1)
    assert {"id", "title", "description", "category", "status", "origin", "branch", "created_at", "updated_at"} <= set(body["items"][0])


def test_requires_authentication():
    assert TestClient(app).get(URL).status_code == 401


# --- one filter at a time ----------------------------------------------------------------------

@pytest.mark.parametrize("status", ["open", "in_progress", "resolved", "discarded"])
def test_filter_by_status(client, status):
    assert ids(client.get(URL, params={"status": status})) == expected(status={status}) != set()


@pytest.mark.parametrize("origin", ["customer", "branch", "internal"])
def test_filter_by_origin(client, origin):
    assert ids(client.get(URL, params={"origin": origin})) == expected(origin={origin}) != set()


@pytest.mark.parametrize("branch", ["central", "valencia_operations", "miami_office"])
def test_filter_by_branch(client, branch):
    assert ids(client.get(URL, params={"branch": branch})) == expected(branch={branch}) != set()


@pytest.mark.parametrize("category", ["technical_failure", "process_error", "client_complaint", "staff_issue", "sla_breach"])
def test_filter_by_category(client, category):
    assert ids(client.get(URL, params={"category": category})) == expected(category={category}) != set()


def test_remote_is_a_valid_filter_even_with_no_incidents(client):
    assert client.get(URL, params={"branch": "remote"}).json()["total"] == 0


@pytest.mark.parametrize("branch", ["Valencia", "valencia", "CENTRAL", "  central ", "Valencia — Operaciones", "x" * 61])
def test_the_branch_filter_takes_the_exact_value_of_an_office(client, branch):
    response = client.get(URL, params={"branch": branch})
    assert response.status_code == 400 and response.json()["detail"][0]["field"] == "branch"
    assert "must be one of: 'central', 'valencia_operations', 'miami_office' or 'remote'" in response.json()["message"]


# --- several values of the same filter (OR) ----------------------------------------------------

def test_a_repeated_parameter_matches_any_of_the_values(client):
    assert ids(client.get(URL, params={"status": ["open", "in_progress"]})) == expected(status={"open", "in_progress"})
    assert ids(client.get(URL, params={"origin": ["branch", "internal"]})) == expected(origin={"branch", "internal"})
    assert ids(client.get(URL, params={"category": ["technical_failure", "client_complaint"]})) == expected(category={"technical_failure", "client_complaint"})


# --- combinations (AND) ------------------------------------------------------------------------

@pytest.mark.parametrize(
    "params,wanted",
    [
        ({"status": "open", "origin": "branch"}, {"status": {"open"}, "origin": {"branch"}}),
        ({"status": "in_progress", "branch": "valencia_operations"}, {"status": {"in_progress"}, "branch": {"valencia_operations"}}),
        ({"origin": "customer", "category": "technical_failure"}, {"origin": {"customer"}, "category": {"technical_failure"}}),
        ({"category": "technical_failure", "branch": "central", "status": "open"}, {"category": {"technical_failure"}, "branch": {"central"}, "status": {"open"}}),
        (
            {"status": ["open", "resolved"], "origin": ["branch", "customer"], "branch": "miami_office", "category": "technical_failure"},
            {"status": {"open", "resolved"}, "origin": {"branch", "customer"}, "branch": {"miami_office"}, "category": {"technical_failure"}},
        ),
    ],
)
def test_filters_combine_with_and(client, params, wanted):
    result = ids(client.get(URL, params=params))
    assert result == expected(**wanted) and result  # non-empty: the cases above all have a match


def test_a_combination_without_matches_is_an_empty_page_not_an_error(client):
    body = client.get(URL, params={"status": "resolved", "origin": "internal"}).json()
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 20, "pages": 0}


def test_blank_filters_are_ignored(client):
    assert ids(client.get(URL, params={"q": "  "})) == set(CASES)


# --- invalid values ----------------------------------------------------------------------------

@pytest.mark.parametrize(
    "params,field",
    [
        ({"status": "OPEN"}, "status"),
        ({"status": "closed"}, "status"),  # the CSV vocabulary is not accepted
        ({"origin": "web"}, "origin"),
        ({"category": "technical"}, "category"),
        ({"branch": "Valencia"}, "branch"),
    ],
)
def test_values_outside_the_allowed_lists_are_rejected_naming_the_filter(client, params, field):
    response = client.get(URL, params=params)
    assert response.status_code == 400 and response.json()["detail"][0]["loc"][:2] == ["query", field]


# --- filters with paging and sorting -----------------------------------------------------------

def test_total_and_pages_describe_the_filtered_set(client):
    body = client.get(URL, params={"origin": ["customer", "branch"], "page_size": 2, "page": 2, "sort": "id", "order": "asc"}).json()
    assert (body["total"], body["pages"], body["page"]) == (5, 3, 2)
    assert [i["id"] for i in body["items"]] == ["NXV-000003", "NXV-000004"]


def test_the_summary_endpoint_takes_the_same_filters(client):
    summary = client.get(f"{URL}/summary", params={"origin": "branch", "status": "in_progress"}).json()
    assert summary["total"] == 1 and summary["status_counts"]["in_progress"] == 1


def test_the_docs_describe_the_four_filters(client):
    spec = client.get("/openapi.json").json()
    params = {p["name"]: p for p in spec["paths"]["/api/incidents"]["get"]["parameters"]}
    assert {"status", "origin", "branch", "category"} <= set(params)
    assert all(params[name].get("description") for name in ("status", "origin", "branch", "category"))
    assert set(spec["components"]["schemas"]["IncidentStatus"]["enum"]) == {"open", "in_progress", "resolved", "discarded"}
    assert set(spec["components"]["schemas"]["IncidentOrigin"]["enum"]) == {"customer", "branch", "internal"}
