from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.api.database import close_database
from services.api.main import app


@pytest.fixture()
def temp_db_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db_path = tmp_path / "suppliers.json"
    monkeypatch.setenv("TRACKFLOW_TINYDB_PATH", str(db_path))
    close_database()
    yield db_path
    close_database()
    os.environ.pop("TRACKFLOW_TINYDB_PATH", None)


@pytest.fixture()
def client(temp_db_path: Path) -> TestClient:
    return TestClient(app)
