from pathlib import Path
import sys

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "services" / "api"))

from app.main import app
from app.domains.analytics.incidents import service as incidents_service


client = TestClient(app)
FIXTURE = REPO_ROOT / "docs" / "incidents-brasaland.csv"


def test_analyze_fixture_returns_expected_totals() -> None:
    with FIXTURE.open("rb") as handle:
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents-brasaland.csv", handle, "text/csv")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 100
    assert payload["valid_records"] == 96
    assert payload["invalid_records"] == 4
    assert payload["satisfaction"]["average_score"] == 3.46


def test_export_requires_previous_analysis() -> None:
    incidents_service._latest_analysis = None
    fresh_client = TestClient(app)
    response = fresh_client.get("/api/incidents/results/export")

    assert response.status_code == 404
    assert response.json()["detail"] == "No analysis results are available yet."


def test_analyze_rejects_invalid_headers() -> None:
    response = client.post(
        "/api/incidents/analyze",
        files={"file": ("broken.csv", b"bad,headers\n1,2\n", "text/csv")},
    )

    assert response.status_code == 400
    assert "Invalid CSV headers" in response.json()["detail"]