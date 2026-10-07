"""Technical telemetry report: Pandas metrics, endpoint shape, 60s cache."""

from __future__ import annotations

import importlib
import json
import math
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pandas as pd
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.app import app  # noqa: E402
from services.telemetry import analysis  # noqa: E402
from services.telemetry import report as report_mod  # noqa: E402
from services.telemetry.analysis import (  # noqa: E402
    AUTH_EVENT_TYPES,
    LATENCY_EVENT_TYPES,
    VOLUME_EVENT_TYPES,
    auth_failure_rate,
    error_rate_by_type,
    events_per_day,
    latency_by_day,
    load_telemetry_events,
)

users = importlib.import_module("users")

START = datetime(2026, 10, 1, tzinfo=timezone.utc)
END = datetime(2026, 10, 8, tzinfo=timezone.utc)


@pytest.fixture()
def client():
    report_mod.clear_report_cache()
    temp_dir = tempfile.TemporaryDirectory()
    original_database_path = users.DATABASE_PATH
    users.DATABASE_PATH = Path(temp_dir.name) / "company_api.db"
    try:
        yield TestClient(app)
    finally:
        users.DATABASE_PATH = original_database_path
        temp_dir.cleanup()
        report_mod.clear_report_cache()


def _headers(client: TestClient) -> dict[str, str]:
    created = client.post(
        "/users",
        json={"email": "telemetry@brasaland.test", "password": "secret-password"},
    )
    assert created.status_code == 201
    token = client.post(
        "/auth/token",
        data={"username": "telemetry@brasaland.test", "password": "secret-password"},
    )
    assert token.status_code == 200
    return {"Authorization": f"Bearer {token.json()['access_token']}"}


def _loader(frame: pd.DataFrame):
    def load(event_types, start_date, end_date, columns):
        assert start_date == START
        assert end_date == END
        return frame

    return load


def _assert_json_safe(rows: list[dict]) -> None:
    encoded = json.dumps(rows)
    assert "NaN" not in encoded
    parsed = json.loads(encoded)
    assert parsed == rows
    for row in rows:
        for value in row.values():
            if isinstance(value, float):
                assert math.isfinite(value)


def test_events_per_day_converts_utc_and_is_deterministic():
    frame = pd.DataFrame(
        [
            {"timestamp": "2026-10-06T23:30:00+00:00", "event_type": "section_viewed"},
            {"timestamp": "2026-10-07T00:15:00+00:00", "event_type": "section_viewed"},
            # 20:30 at UTC-5 is 01:30 the next UTC day, not 6 October.
            {"timestamp": "2026-10-06T20:30:00-05:00", "event_type": "flow_step_recorded"},
            {"timestamp": "2026-10-07T01:30:00+00:00", "event_type": "flow_step_recorded"},
            {"timestamp": "2026-10-07T02:00:00+00:00", "event_type": None},
            {"timestamp": "2026-10-07T02:05:00+00:00", "event_type": "  "},
        ]
    )
    first = events_per_day(START, END, loader=_loader(frame))
    second = events_per_day(START, END, loader=_loader(frame))
    assert first == second
    assert first == [
        {"date": "2026-10-06", "event_type": "section_viewed", "events": 1},
        {"date": "2026-10-07", "event_type": "flow_step_recorded", "events": 2},
        {"date": "2026-10-07", "event_type": "section_viewed", "events": 1},
    ]
    _assert_json_safe(first)


def test_events_per_day_does_not_refilter_the_sql_window():
    frame = pd.DataFrame(
        [{"timestamp": "2026-01-01T00:00:00Z", "event_type": "section_viewed"}]
    )
    seen = {}

    def load(event_types, start_date, end_date, columns):
        seen["types"] = tuple(event_types)
        seen["start"] = start_date
        seen["end"] = end_date
        return frame

    rows = events_per_day(START, END, loader=load)
    assert seen["types"] == VOLUME_EVENT_TYPES
    assert seen["start"] == START
    assert seen["end"] == END
    assert rows == [{"date": "2026-01-01", "event_type": "section_viewed", "events": 1}]


def test_error_rate_by_type_uses_level_and_utc_day():
    frame = pd.DataFrame(
        [
            {
                "timestamp": "2026-10-06T23:30:00+00:00",
                "event_type": "api_latency_recorded",
                "level": "info",
            },
            {
                "timestamp": "2026-10-07T00:10:00+00:00",
                "event_type": "api_latency_recorded",
                "level": "warn",
            },
            {
                "timestamp": "2026-10-07T00:20:00+00:00",
                "event_type": "api_latency_recorded",
                "level": "info",
            },
            {
                "timestamp": "2026-10-07T03:00:00+00:00",
                "event_type": "client_exception_caught",
                "level": "error",
            },
            # 22:00 at UTC-5 is 03:00 UTC on 7 October.
            {
                "timestamp": "2026-10-06T22:00:00-05:00",
                "event_type": "user_login_failed",
                "level": "warn",
            },
            {
                "timestamp": "2026-10-07T04:00:00+00:00",
                "event_type": "direct_stock_edit_rejected",
                "level": "info",
            },
            {
                "timestamp": "2026-10-07T05:00:00+00:00",
                "event_type": None,
                "level": "error",
            },
        ]
    )
    rows = error_rate_by_type(START, END, loader=_loader(frame))
    again = error_rate_by_type(START, END, loader=_loader(frame))
    assert rows == again
    assert rows == [
        {
            "date": "2026-10-06",
            "event_type": "api_latency_recorded",
            "events": 1,
            "failures": 0,
            "error_rate": 0.0,
        },
        {
            "date": "2026-10-07",
            "event_type": "api_latency_recorded",
            "events": 2,
            "failures": 1,
            "error_rate": 0.5,
        },
        {
            "date": "2026-10-07",
            "event_type": "client_exception_caught",
            "events": 1,
            "failures": 1,
            "error_rate": 1.0,
        },
        {
            "date": "2026-10-07",
            "event_type": "direct_stock_edit_rejected",
            "events": 1,
            "failures": 0,
            "error_rate": 0.0,
        },
        {
            "date": "2026-10-07",
            "event_type": "user_login_failed",
            "events": 1,
            "failures": 1,
            "error_rate": 1.0,
        },
    ]
    _assert_json_safe(rows)


def test_latency_by_day_drops_null_routes_and_uses_utc():
    frame = pd.DataFrame(
        [
            {
                "timestamp": "2026-10-06T23:00:00+00:00",
                "value": 10,
                "tags": {"route_template": "/inventory"},
            },
            {
                "timestamp": "2026-10-06T23:10:00+00:00",
                "value": 30,
                "tags": {"route_template": "/inventory"},
            },
            {
                "timestamp": "2026-10-06T23:20:00+00:00",
                "value": 20,
                "tags": {"route_template": "/inventory"},
            },
            {
                "timestamp": "2026-10-06T23:30:00+00:00",
                "value": 40,
                "tags": {"route_template": "/inventory"},
            },
            {
                "timestamp": "2026-10-06T23:40:00+00:00",
                "value": 9999,
                "tags": {},
            },
            {
                "timestamp": "2026-10-06T23:45:00+00:00",
                "value": 9999,
                "tags": {"route_template": None},
            },
            {
                "timestamp": "2026-10-06T23:50:00+00:00",
                "value": None,
                "tags": {"route_template": "/inventory"},
            },
            {
                "timestamp": "2026-10-06T23:55:00+00:00",
                "value": 50,
                "tags": '{"route_template": "  "}',
            },
            # 20:00 at UTC-5 is 01:00 UTC on 7 October.
            {
                "timestamp": "2026-10-06T20:00:00-05:00",
                "value": 100,
                "tags": {"route_template": "/auth/login"},
            },
            {
                "timestamp": "2026-10-07T02:00:00+00:00",
                "value": 300,
                "tags": '{"route_template": "/auth/login"}',
            },
        ]
    )
    seen = {}

    def load(event_types, start_date, end_date, columns):
        seen["types"] = tuple(event_types)
        return frame

    rows = latency_by_day(START, END, loader=load)
    assert seen["types"] == LATENCY_EVENT_TYPES
    assert rows == latency_by_day(START, END, loader=load)
    assert rows == [
        {"date": "2026-10-06", "endpoint": "/inventory", "mean_ms": 25.0, "p95_ms": 38.5},
        {"date": "2026-10-07", "endpoint": "/auth/login", "mean_ms": 200.0, "p95_ms": 290.0},
    ]
    _assert_json_safe(rows)


def test_auth_failure_rate_loads_both_outcomes():
    frame = pd.DataFrame(
        [
            {"timestamp": "2026-10-06T23:00:00+00:00", "event_type": "user_login_failed"},
            {"timestamp": "2026-10-06T23:10:00+00:00", "event_type": "user_login_succeeded"},
            {"timestamp": "2026-10-06T23:20:00+00:00", "event_type": "user_login_succeeded"},
            {"timestamp": "2026-10-06T20:00:00-05:00", "event_type": "user_login_failed"},
            {"timestamp": "2026-10-07T02:00:00+00:00", "event_type": "user_login_failed"},
        ]
    )
    seen = {}

    def load(event_types, start_date, end_date, columns):
        seen["types"] = tuple(event_types)
        return frame

    rows = auth_failure_rate(START, END, loader=load)
    assert seen["types"] == AUTH_EVENT_TYPES
    assert rows == auth_failure_rate(START, END, loader=load)
    assert rows == [
        {
            "date": "2026-10-06",
            "failed": 1,
            "succeeded": 2,
            "attempts": 3,
            "auth_failure_rate": 0.333333,
        },
        {
            "date": "2026-10-07",
            "failed": 2,
            "succeeded": 0,
            "attempts": 2,
            "auth_failure_rate": 1.0,
        },
    ]
    _assert_json_safe(rows)


def test_load_telemetry_events_uses_postgrest_where(monkeypatch):
    captured = {}

    def fake_get(url, **kwargs):
        captured["url"] = url
        captured["params"] = kwargs["params"]
        captured["headers"] = kwargs["headers"]
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json=[{"timestamp": "2026-10-06T12:00:00+00:00", "event_type": "section_viewed"}],
            request=request,
        )

    monkeypatch.setenv("SUPABASE_URL", "https://brasaland.example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    monkeypatch.setattr(analysis.httpx, "get", fake_get)

    frame = load_telemetry_events(AUTH_EVENT_TYPES, START, END, ("timestamp", "event_type"))
    assert captured["url"] == "https://brasaland.example.supabase.co/rest/v1/telemetry_events"
    params = captured["params"]
    assert ("event_type", "in.(user_login_failed,user_login_succeeded)") in params
    assert ("timestamp", "gte.2026-10-01T00:00:00Z") in params
    assert ("timestamp", "lt.2026-10-08T00:00:00Z") in params
    assert ("select", "timestamp,event_type") in params
    assert captured["headers"]["apikey"] == "service-role-test"
    assert list(frame["event_type"]) == ["section_viewed"]


def test_load_telemetry_events_requires_supabase_env(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(analysis.TelemetryNotConfigured):
        load_telemetry_events(LATENCY_EVENT_TYPES, START, END)


def _patch_metrics(monkeypatch, calls: dict):
    def fake_events(start, end, loader=None):
        calls["n"] += 1
        calls["window"] = (start, end)
        return [{"date": "2026-10-06", "event_type": "section_viewed", "events": calls["n"]}]

    def fake_empty(start, end, loader=None):
        calls["windows"].append((start, end))
        return []

    monkeypatch.setattr(analysis, "events_per_day", fake_events)
    monkeypatch.setattr(analysis, "error_rate_by_type", fake_empty)
    monkeypatch.setattr(analysis, "latency_by_day", fake_empty)
    monkeypatch.setattr(analysis, "auth_failure_rate", fake_empty)


def test_report_shape_defaults_and_cache(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://brasaland.example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    calls = {"n": 0, "windows": []}
    _patch_metrics(monkeypatch, calls)
    clock = {"now": 1_000.0}
    monkeypatch.setattr(report_mod, "_clock", lambda: clock["now"])
    frozen = datetime(2026, 10, 6, 15, 4, 50, tzinfo=timezone.utc)
    monkeypatch.setattr(report_mod, "_utcnow", lambda: frozen)
    headers = _headers(client)

    anonymous = client.get("/telemetry/report")
    assert anonymous.status_code == 401

    first = client.get("/telemetry/report", headers=headers)
    assert first.status_code == 200
    body = first.json()
    assert body["period"] == {"from": "2026-09-29T15:04:00Z", "to": "2026-10-06T15:04:00Z"}
    assert set(body["metrics"]) == {
        "events_per_day",
        "error_rate_by_type",
        "latency_by_day",
        "auth_failure_rate",
    }
    assert body["metrics"]["events_per_day"] == [
        {"date": "2026-10-06", "event_type": "section_viewed", "events": 1}
    ]
    assert body["metrics"]["error_rate_by_type"] == []
    assert body["metrics"]["latency_by_day"] == []
    assert body["metrics"]["auth_failure_rate"] == []
    assert calls["n"] == 1
    assert all(window == calls["window"] for window in calls["windows"])

    # Still inside 60s, and the wall clock has crossed a minute. Cache holds.
    clock["now"] = 1_030.0
    monkeypatch.setattr(
        report_mod,
        "_utcnow",
        lambda: datetime(2026, 10, 6, 15, 5, 20, tzinfo=timezone.utc),
    )
    second = client.get("/telemetry/report", headers=headers)
    assert second.status_code == 200
    assert second.json() == body
    assert calls["n"] == 1

    clock["now"] = 1_061.0
    third = client.get("/telemetry/report", headers=headers)
    assert third.status_code == 200
    refreshed = third.json()
    assert refreshed["period"] == {"from": "2026-09-29T15:05:00Z", "to": "2026-10-06T15:05:00Z"}
    assert refreshed["metrics"]["events_per_day"][0]["events"] == 2
    assert calls["n"] == 2


def test_report_explicit_window_is_cached(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://brasaland.example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    calls = {"n": 0, "windows": []}
    _patch_metrics(monkeypatch, calls)
    clock = {"now": 50.0}
    monkeypatch.setattr(report_mod, "_clock", lambda: clock["now"])
    headers = _headers(client)
    params = {"start_date": "2026-10-01T00:00:00Z", "end_date": "2026-10-08T05:00:00-05:00"}

    first = client.get("/telemetry/report", params=params, headers=headers)
    assert first.status_code == 200
    assert first.json()["period"] == {
        "from": "2026-10-01T00:00:00Z",
        "to": "2026-10-08T10:00:00Z",
    }
    assert calls["window"] == (
        datetime(2026, 10, 1, tzinfo=timezone.utc),
        datetime(2026, 10, 8, 10, tzinfo=timezone.utc),
    )
    clock["now"] = 60.0
    second = client.get("/telemetry/report", params=params, headers=headers)
    assert second.json()["metrics"]["events_per_day"][0]["events"] == 1
    assert calls["n"] == 1

    clock["now"] = 120.0
    third = client.get("/telemetry/report", params=params, headers=headers)
    assert third.json()["metrics"]["events_per_day"][0]["events"] == 2
    assert calls["n"] == 2


def test_report_rejects_bad_dates_and_missing_env(client, monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    calls = {"n": 0, "windows": []}
    _patch_metrics(monkeypatch, calls)
    headers = _headers(client)

    missing = client.get("/telemetry/report", headers=headers)
    assert missing.status_code == 503
    assert missing.json()["code"] == "service_unavailable"
    assert calls["n"] == 0

    monkeypatch.setenv("SUPABASE_URL", "https://brasaland.example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    bad = client.get("/telemetry/report", params={"start_date": "yesterday", "end_date": "tomorrow"}, headers=headers)
    assert bad.status_code == 422
    assert bad.json()["code"] == "validation_error"
    one_sided = client.get("/telemetry/report", params={"start_date": "2026-10-01T00:00:00Z"}, headers=headers)
    assert one_sided.status_code == 422
    backwards = client.get(
        "/telemetry/report",
        params={"start_date": "2026-10-08T00:00:00Z", "end_date": "2026-10-01T00:00:00Z"},
        headers=headers,
    )
    assert backwards.status_code == 422
    assert calls["n"] == 0
