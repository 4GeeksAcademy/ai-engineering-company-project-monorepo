from __future__ import annotations

import anyio

from fastapi import HTTPException
from starlette.datastructures import UploadFile as StarletteUploadFile

from conftest import auth_headers, login, register


def _headers(client):
    register(client)
    return auth_headers(login(client))


def test_incident_upload_maps_read_errors_without_leaking_details():
    from routes import incidents

    class BrokenUpload(StarletteUploadFile):
        async def read(self, size: int = -1) -> bytes:
            raise OSError("/private/data/patient-records.csv: disk unavailable")

    upload = BrokenUpload(filename="incidents.csv", file=object())
    try:
        anyio.run(lambda: incidents.analyze_incidents(file=upload))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "The uploaded file could not be read. Please try again."
        assert "/private/data" not in exc.detail
        assert "patient-records" not in exc.detail
    else:
        raise AssertionError("unreadable uploads should map to a safe HTTP error")


def test_incident_export_maps_generation_errors_safely(client, monkeypatch):
    from routes import incidents

    # A successful analysis establishes the aggregate-only result used by export.
    headers = _headers(client)
    response = client.post(
        "/api/incidents/analyze",
        headers=headers,
        files={"file": ("incidents.csv", b"clinic_id,incident_id,country,date,category,description,patient_id,status,satisfaction_score\n")},
    )
    assert response.status_code == 200, response.text

    def fail_export(_result):
        raise OSError("/private/db/healthcore.json is unavailable")

    monkeypatch.setattr(incidents, "results_csv", fail_export)
    response = client.get("/api/incidents/results/export", headers=headers)

    assert response.status_code == 500
    assert response.json() == {"detail": "The analysis results could not be exported. Please try again."}
    assert "/private/db" not in response.text


def test_incident_upload_invalid_utf8_has_safe_validation_error(client):
    response = client.post(
        "/api/incidents/analyze",
        headers=_headers(client),
        files={"file": ("incidents.csv", b"\xff\xfe")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "The file is not valid UTF-8 text. Export it as a UTF-8 CSV."


def test_incident_upload_rejects_non_csv_without_echoing_filename(client):
    response = client.post(
        "/api/incidents/analyze",
        headers=_headers(client),
        files={"file": ("patient-sensitive-name.txt", b"content")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Upload a .csv file."
    assert "patient-sensitive-name" not in response.text