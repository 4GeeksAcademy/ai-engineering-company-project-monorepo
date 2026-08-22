from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.app import app
from tickets import reset_tickets
import telemetry_capture


@pytest.fixture(autouse=True)
def _clean_ticket_state():
    reset_tickets()
    yield
    reset_tickets()


@pytest.fixture(autouse=True)
def _isolate_telemetry_capture(tmp_path: Path, monkeypatch):
    capture_file = tmp_path / "captured_telemetry.jsonl"
    monkeypatch.setattr(telemetry_capture, "CAPTURE_PATH", capture_file)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"username": "mariana", "password": "brasaland"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
