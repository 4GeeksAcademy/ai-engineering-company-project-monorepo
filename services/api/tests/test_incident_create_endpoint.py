"""POST /api/incidents: creates an incident, or answers 400 with a message that says what to fix."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

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


@pytest.fixture()
def db(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield database
    database.close()


@pytest.fixture()
def client(db, auth_headers) -> TestClient:
    return TestClient(app, headers=auth_headers)


# --- success ---------------------------------------------------------------------------------

def test_creates_the_incident_with_201_location_and_server_set_fields(client):
    response = client.post(URL, json=VALID)
    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"] == f"/api/incidents/{body['id']}"
    assert body["id"] == "NXV-000001" and body["status"] == "open"
    assert body["created_at"] and body["created_at"] == body["updated_at"]
    assert {k: body[k] for k in VALID} == VALID
    assert client.get(response.headers["location"]).json() == body
    assert len(store.all_docs()) == 1


def test_each_call_creates_a_new_incident(client):
    ids = [client.post(URL, json=VALID).json()["id"] for _ in range(3)]
    assert ids == ["NXV-000001", "NXV-000002", "NXV-000003"]


# --- 400: shape of the answer ----------------------------------------------------------------

def test_400_has_a_readable_message_and_a_detail_per_field(client):
    response = client.post(URL, json={})
    assert response.status_code == 400
    body = response.json()
    assert body["message"] == (
        "The request is not valid: title is required; description is required; "
        "category is required; origin is required; branch is required."
    )
    assert body["detail"][0] == {"field": "title", "loc": ["body", "title"], "msg": "title is required", "type": "missing"}
    assert [d["loc"][-1] for d in body["detail"]] == ["title", "description", "category", "origin", "branch"]
    assert set(body) == {"message", "detail"} and all(set(d) == {"field", "loc", "msg", "type"} for d in body["detail"])
    assert store.all_docs() == []


@pytest.mark.parametrize(
    "overrides,sentence",
    [
        ({"title": ""}, "title must have at least 3 characters"),
        ({"title": "ab"}, "title must have at least 3 characters"),
        ({"title": "x" * 121}, "title must have at most 120 characters"),
        ({"description": "abc"}, "description must have at least 5 characters"),
        ({"category": "SPAM"}, "category must be one of: 'TECHNICAL', 'BILLING', 'ACCESS', 'HR_QUERY' or 'COMPLAINT'"),
        ({"origin": "web"}, "origin must be one of: 'customer', 'branch' or 'internal'"),
        ({"branch": "   "}, "branch cannot be empty"),
        ({"agent_id": "AGT-7"}, "agent_id does not have a valid format"),
        ({"customer_email": "nope"}, "customer_email must be a valid email address"),
        ({"title": 42}, "title has the wrong type"),
        ({"title": None}, "title has the wrong type"),
        ({"status": "resolved"}, "status is not a field you can set"),
        ({"id": "NXV-000999"}, "id is not a field you can set"),
        ({"origin": "branch", "branch": "central"}, "An incident that comes from a branch must name it ('central' is for when it does not apply)"),
    ],
)
def test_each_problem_is_explained_in_a_sentence(client, overrides, sentence):
    response = client.post(URL, json={**VALID, **overrides})
    assert response.status_code == 400
    body = response.json()
    assert sentence in [d["msg"] for d in body["detail"]]
    assert body["message"] == f"The request is not valid: {sentence}."
    assert store.all_docs() == []


def test_all_the_problems_are_reported_at_once(client):
    response = client.post(URL, json={**VALID, "title": "ab", "category": "SPAM", "customer_email": "nope"})
    assert [d["loc"][-1] for d in response.json()["detail"]] == ["title", "category", "customer_email"]
    assert response.json()["message"].count(";") == 2


@pytest.mark.parametrize(
    "kwargs,sentence",
    [
        ({}, "The request body is required: send a JSON object"),
        ({"json": [1, 2]}, "The request body must be a valid JSON object"),
        ({"json": "text"}, "The request body must be a valid JSON object"),
        ({"content": b"{oops", "headers": {"content-type": "application/json"}}, "The request body must be a valid JSON object"),
    ],
)
def test_a_missing_or_malformed_body_is_a_400_too(client, kwargs, sentence):
    response = client.post(URL, **kwargs)
    assert response.status_code == 400
    assert response.json()["message"] == f"The request is not valid: {sentence}."


def test_the_400_never_echoes_what_was_sent(client):
    response = client.post(
        URL,
        json={**VALID, "customer_email": "secret.person@private.org@@", "category": "SECRET-CATEGORY", "title": "ab"},
    )
    assert response.status_code == 400
    assert "secret.person" not in response.text and "private.org" not in response.text and "SECRET-CATEGORY" not in response.text


# --- scope of the change ---------------------------------------------------------------------

def test_authentication_is_checked_before_the_body(db):
    assert TestClient(app).post(URL, json={}).status_code == 401
    assert TestClient(app).post(URL, json=VALID).status_code == 401
    assert store.all_docs() == []


def test_the_whole_incident_api_uses_400_but_other_domains_keep_422(client):
    created = client.post(URL, json=VALID).json()["id"]
    assert client.patch(f"{URL}/{created}", json={}).status_code == 400
    assert client.patch(f"{URL}/{created}/status", json={"status": "closed"}).status_code == 400
    assert client.get(URL, params={"page": 0}).status_code == 400
    assert client.post(f"{URL}/analyze").status_code == 400  # the CSV analysis upload: no file sent
    assert client.post("/suppliers", json={}).status_code == 422  # other domains are untouched


def test_the_docs_advertise_400_not_422_for_creation(client):
    responses = client.get("/openapi.json").json()["paths"]["/api/incidents"]["post"]["responses"]
    assert "400" in responses and "422" not in responses and "201" in responses
