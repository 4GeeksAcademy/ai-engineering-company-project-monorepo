from io import BytesIO

from fastapi.testclient import TestClient
import pandas as pd

from ai_engineering_company_project_monorepo.api.main import app
from ai_engineering_company_project_monorepo.services.incident_analysis import (
    analyze_dataframe,
)


VALID_CSV = b"incident_id,category,title,description,status,priority,created_at,assigned_to,satisfaction_score\nINC-001,training,Title,Description,resolved,high,2026-09-25,team,4\nINC-002,leave,Title,Description,open,low,2026-09-26,team,\n"


def test_analyze_incidents_accepts_multipart_csv() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", VALID_CSV, "text/csv")},
        )

    assert response.status_code == 200
    assert response.json() == {
        "total_processed": 2,
        "valid_records": 2,
        "invalid_records": 0,
        "by_category": {"leave": 1, "training": 1},
        "by_status": {"abierto": 1, "cerrado": 1},
        "average_satisfaction_closed": 4.0,
        "satisfaction_scored_closed_cases": 1,
        "validation_issues": {},
    }


def test_analyze_incidents_rejects_missing_columns() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", b"incident_id,title\nINC-001,Title\n", "text/csv")},
        )

    assert response.status_code == 200
    assert response.json()["invalid_records"] == 1
    assert "columnas obligatorias ausentes" in response.json()["validation_issues"]


def test_endpoint_returns_shared_analysis_summary() -> None:
    expected = analyze_dataframe(pd.read_csv(BytesIO(VALID_CSV)))

    with TestClient(app) as client:
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", VALID_CSV, "text/csv")},
        )

    assert response.status_code == 200
    assert response.json() == expected


def test_export_returns_last_analysis_as_csv() -> None:
    with TestClient(app) as client:
        analysis = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", VALID_CSV, "text/csv")},
        )
        response = client.get("/api/incidents/results/export")

    assert analysis.status_code == 200
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == "attachment; filename=results.csv"
    assert "total_procesados,2," in response.text
    assert "satisfaccion_media_casos_cerrados,4.0," in response.text


def test_export_without_previous_analysis_returns_not_found() -> None:
    app.state._state.pop("last_incident_analysis", None)

    with TestClient(app) as client:
        response = client.get("/api/incidents/results/export")

    assert response.status_code == 404
    assert response.json()["detail"] == "No hay ningún análisis disponible para exportar"


def test_analyze_rejects_empty_and_malformed_csv() -> None:
    with TestClient(app) as client:
        empty_response = client.post(
            "/api/incidents/analyze",
            files={"file": ("empty.csv", b"", "text/csv")},
        )
        malformed_response = client.post(
            "/api/incidents/analyze",
            files={"file": ("broken.csv", b'"unclosed', "text/csv")},
        )

    assert empty_response.status_code == 400
    assert "CSV inválido" in empty_response.json()["detail"]
    assert malformed_response.status_code == 400
    assert "CSV inválido" in malformed_response.json()["detail"]
