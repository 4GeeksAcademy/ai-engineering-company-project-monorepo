"""API tests: analysis endpoint, export endpoint and error handling."""

from __future__ import annotations

import csv
import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
from routes import incidents
from incident_analysis import analyze_csv_text

CSV_PATH = Path(__file__).resolve().parents[3] / "scripts" / "incidents-nexova.csv"


@pytest.fixture()
def client():
    incidents._last_result = None
    return TestClient(main.app)


def _upload(client: TestClient, content: bytes, name: str = "incidents.csv", content_type: str = "text/csv"):
    return client.post("/api/incidents/analyze", files={"file": (name, content, content_type)})


def test_analyze_returns_context_values(client):
    response = _upload(client, CSV_PATH.read_bytes())
    assert response.status_code == 200
    body = response.json()
    assert (body["total_records"], body["valid_records"], body["invalid_records"]) == (100, 96, 4)
    assert body["by_category"] == {"TECHNICAL": 28, "BILLING": 18, "ACCESS": 21, "HR_QUERY": 17, "COMPLAINT": 12}
    assert body["by_status"] == {"OPEN": 27, "CLOSED": 56, "DISCARDED": 13}
    assert body["average_score"] == 3.84
    assert body["invalid_by_field"]["customer_email"] == {"invalid": 1}
    assert body["labels"]["rules"]["closed_without_score"] == "Closed ticket, no score"
    assert "@" not in response.text


def test_api_uses_the_same_logic_as_the_script(client):
    body = _upload(client, CSV_PATH.read_bytes()).json()
    body.pop("labels")
    expected = analyze_csv_text(CSV_PATH.read_text(encoding="utf-8")).to_dict()
    expected["score_breakdown"] = {str(k): v for k, v in expected["score_breakdown"].items()}
    assert body == expected


def test_export_returns_last_analysis_as_csv(client):
    _upload(client, CSV_PATH.read_bytes())
    response = client.get("/api/incidents/results/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "results.csv" in response.headers["content-disposition"]
    rows = list(csv.reader(io.StringIO(response.text)))
    assert rows[0] == ["metric", "value", "description"]
    assert ["valid_records", "96", "Valid records"] in rows
    assert all(len(row) == 3 for row in rows)
    assert "@" not in response.text


def test_export_without_analysis_is_404(client):
    assert client.get("/api/incidents/results/export").status_code == 404


@pytest.mark.parametrize(
    ("content", "name", "content_type", "status"),
    [
        (b"", "incidents.csv", "text/csv", 400),
        (b"\xff\xfe\x00bad", "incidents.csv", "text/csv", 400),
        (b"a,b\n1,2\n", "incidents.pdf", "application/pdf", 415),
        (b"a,b\n1,2\n", "incidents.csv", "image/png", 415),
        (b"ticket_id,date\nNXV-000001,2024-01-01\n", "incidents.csv", "text/csv", 422),
    ],
)
def test_bad_input_returns_descriptive_error(client, content, name, content_type, status):
    response = _upload(client, content, name, content_type)
    assert response.status_code == status
    assert response.json()["detail"]


def test_missing_columns_are_named(client):
    response = _upload(client, b"ticket_id,date\nNXV-000001,2024-01-01\n")
    assert "client_company" in response.json()["detail"]


def test_missing_file_field_is_422(client):
    assert client.post("/api/incidents/analyze").status_code == 422


def test_cors_allows_backoffice_origin(client):
    response = client.options(
        "/api/incidents/analyze",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
