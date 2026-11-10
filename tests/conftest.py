"""Shared fixtures for the TrackFlow API test suites.

These fixtures isolate the TinyDB/SQLite storage from the real data files and
provide a ready-made authenticated/unauthenticated API client so every endpoint
test can focus on business logic rather than setup plumbing.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from services.api import auth as auth_module
from services.api import database as database_module
from services.api import telemetry as telemetry_module
from services.api.main import app
from services.api.models import UserCreate


def _make_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}@trackflow.test"


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Point every storage backend at a fresh temp location per test.

    Replaces the real suppliers/users JSON files and the incidents SQLite DB so
    tests never touch committed data and never leak records between tests.
    """
    monkeypatch.setattr(database_module, "USER_DB_PATH", tmp_path / "users.json")
    monkeypatch.setattr(database_module, "DB_PATH", tmp_path / "suppliers.json")
    monkeypatch.setattr(telemetry_module, "persist_events", lambda events: len(events))
    from services.api import incidents as incidents_module

    monkeypatch.setattr(incidents_module, "DB_PATH", tmp_path / "incidents.sqlite3")
    from services.api import inventory_database as inventory_database_module

    inventory_engine = inventory_database_module.create_database_engine(
        f"sqlite:///{(tmp_path / 'inventory.sqlite3').as_posix()}"
    )
    monkeypatch.setattr(inventory_database_module, "engine", inventory_engine)
    yield
    inventory_engine.dispose()


@pytest.fixture
def make_email() -> str:
    return _make_email


@pytest.fixture
def client():
    """A TestClient that surfaces server exceptions so logic errors fail loudly."""
    with TestClient(app) as test_client:
        yield test_client


def register_user(client, email: str, password: str = "StrongPass123!", **overrides) -> dict:
    """Helper to create a user through the public /users endpoint and return the JSON."""
    payload = {"email": email, "password": password, **overrides}
    response = client.post("/users", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def create_user(client, make_email):
    """Factory fixture: creates a user and returns their dict plus credentials."""
    def _create(password: str = "StrongPass123!", **overrides):
        email = make_email("user")
        user = register_user(client, email, password, **overrides)
        return {"email": email, "password": password, "user": user}
    return _create


@pytest.fixture
def auth_headers(client, create_user):
    """Authenticated headers (Bearer token) for a freshly registered user."""
    account = create_user()
    response = client.post(
        "/auth/login",
        data={"username": account["email"], "password": account["password"]},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, account


@pytest.fixture
def frozen_now():
    """Freeze the clock to a fixed instant so expiry tests are deterministic.

    Returns a UTC-aware datetime so it can be compared directly with the
    UTC-aware timestamps produced by auth.py (datetime.now(timezone.utc)).
    """
    from datetime import datetime, timezone

    from freezegun import freeze_time

    fixed = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
    frozen = freeze_time(fixed)
    frozen.start()
    yield fixed
    frozen.stop()


@pytest.fixture
def admin_account(client, make_email):
    """A manager/admin-level user used to exercise backoffice access control."""
    email = make_email("admin")
    user = register_user(client, email, "AdminPass123!", role="admin")
    response = client.post(
        "/auth/login", data={"username": email, "password": "AdminPass123!"}
    )
    assert response.status_code == 200, response.text
    return {
        "email": email,
        "password": "AdminPass123!",
        "user": user,
        "headers": {"Authorization": f"Bearer {response.json()['access_token']}"},
    }


@pytest.fixture
def manager_account(client, make_email):
    email = make_email("manager")
    user = register_user(client, email, "ManagerPass123!", role="manager")
    response = client.post(
        "/auth/login", data={"username": email, "password": "ManagerPass123!"}
    )
    assert response.status_code == 200, response.text
    return {
        "email": email,
        "password": "ManagerPass123!",
        "user": user,
        "headers": {"Authorization": f"Bearer {response.json()['access_token']}"},
    }