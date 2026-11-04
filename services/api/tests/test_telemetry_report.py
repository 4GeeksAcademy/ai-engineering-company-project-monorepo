"""Tests for GET /telemetry/report: period resolution/validation, the
auth gate, and the 60s in-memory cache.

Metric *calculation* correctness is covered by test_telemetry_analysis.py
against app.services.telemetry_analysis directly — these tests mock
`fetch_telemetry_events_dataframe` (the DB retrieval call) so the router
layer is exercised (auth, query-param parsing/validation, caching,
response shape) without needing a live database, following the same
pattern test_telemetry.py already established for POST /telemetry/events
(fake `get_db` session, no real Postgres connection).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pandas as pd
import pytest
from httpx import ASGITransport, AsyncClient

from app.core import cache
from app.core.database import get_db
from app.core.deps import get_current_user
from app.main import app
from app.routers import telemetry as telemetry_router

DF_COLUMNS = ["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]


def _empty_df() -> pd.DataFrame:
    return pd.DataFrame(columns=DF_COLUMNS)


def _latency_df(endpoint: str, status_code: int, duration_ms: float, when: datetime) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "event_id": "00000000-0000-0000-0000-000000000001",
                "timestamp": when,
                "session_id": "s1",
                "user_id": "1",
                "event_type": "api_latency_recorded",
                "schema_version": "1.0.0",
                "request_id": None,
                "tags": {
                    "endpoint": endpoint,
                    "method": "GET",
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "cache_hit": False,
                },
            }
        ],
        columns=DF_COLUMNS,
    )


def _fake_user(role: str) -> dict:
    return {"id": 1, "email": "test@test.com", "role": role, "is_active": True}


@pytest.fixture(autouse=True)
def fake_db_session():
    def _fake_get_db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _fake_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def clear_report_cache():
    cache.invalidate_prefix(telemetry_router._REPORT_CACHE_PREFIX)
    yield
    cache.invalidate_prefix(telemetry_router._REPORT_CACHE_PREFIX)


@pytest.fixture
def as_staff():
    """Authenticate as an admin (passes require_staff)."""
    app.dependency_overrides[get_current_user] = lambda: _fake_user("admin")
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_fetch(monkeypatch):
    mock = MagicMock(return_value=_empty_df())
    monkeypatch.setattr(telemetry_router, "fetch_telemetry_events_dataframe", mock)
    return mock


async def _get(path: str, headers: dict | None = None):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get(f"/api/v1{path}", headers=headers or {})


# ── Auth gate ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_report_requires_authentication(mock_fetch):
    response = await _get("/telemetry/report")
    assert response.status_code == 401
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_report_rejects_non_staff_role(mock_fetch):
    app.dependency_overrides[get_current_user] = lambda: _fake_user("user")
    try:
        response = await _get("/telemetry/report")
    finally:
        app.dependency_overrides.pop(get_current_user, None)
    assert response.status_code == 403
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_report_allows_staff_roles(as_staff, mock_fetch):
    for role in ("admin", "manager"):
        app.dependency_overrides[get_current_user] = lambda role=role: _fake_user(role)
        response = await _get("/telemetry/report")
        assert response.status_code == 200, role


# ── Period resolution and validation ────────────────────────────────────


@pytest.mark.asyncio
async def test_report_defaults_to_last_7_days_ending_now(as_staff, mock_fetch):
    before = datetime.now(timezone.utc)
    response = await _get("/telemetry/report")
    after = datetime.now(timezone.utc)

    assert response.status_code == 200
    body = response.json()
    period_from = datetime.fromisoformat(body["period"]["from"])
    period_to = datetime.fromisoformat(body["period"]["to"])

    assert before <= period_to <= after
    assert period_from == period_to - timedelta(days=7)


@pytest.mark.asyncio
async def test_report_uses_explicit_start_and_end(as_staff, mock_fetch):
    response = await _get(
        "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["period"]["from"] == "2026-10-01T00:00:00+00:00"
    assert body["period"]["to"] == "2026-10-08T00:00:00+00:00"


@pytest.mark.asyncio
async def test_report_normalizes_non_utc_offsets_to_utc(as_staff, mock_fetch):
    response = await _get(
        "/telemetry/report?start_date=2026-10-01T00:00:00-05:00&end_date=2026-10-08T00:00:00-05:00"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["period"]["from"] == "2026-10-01T05:00:00+00:00"
    assert body["period"]["to"] == "2026-10-08T05:00:00+00:00"


@pytest.mark.asyncio
async def test_report_accepts_partial_params_start_only(as_staff, mock_fetch):
    response = await _get("/telemetry/report?start_date=2026-10-01T00:00:00Z")
    assert response.status_code == 200
    body = response.json()
    assert body["period"]["from"] == "2026-10-01T00:00:00+00:00"
    # end_date defaults to "now" — just assert it's after start_date.
    assert datetime.fromisoformat(body["period"]["to"]) > datetime.fromisoformat(body["period"]["from"])


@pytest.mark.asyncio
async def test_report_accepts_partial_params_end_only(as_staff, mock_fetch):
    # end_date far enough in the future that "now - 7 days" (the default
    # start_date, computed from the real clock) is always still before it.
    before = datetime.now(timezone.utc)
    future_end = (before + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    response = await _get(f"/telemetry/report?end_date={future_end}")
    after = datetime.now(timezone.utc)

    assert response.status_code == 200
    body = response.json()
    assert body["period"]["to"] == future_end.replace("Z", "+00:00")
    # start_date defaults from "now - 7 days", independent of end_date.
    resolved_start = datetime.fromisoformat(body["period"]["from"])
    assert before - timedelta(days=7) <= resolved_start <= after - timedelta(days=7)


@pytest.mark.asyncio
async def test_report_rejects_naive_start_date(as_staff, mock_fetch):
    response = await _get("/telemetry/report?start_date=2026-10-01T00:00:00&end_date=2026-10-08T00:00:00Z")
    assert response.status_code == 422
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_report_rejects_malformed_date(as_staff, mock_fetch):
    response = await _get("/telemetry/report?start_date=not-a-date")
    assert response.status_code == 422
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_report_rejects_reversed_period(as_staff, mock_fetch):
    response = await _get(
        "/telemetry/report?start_date=2026-10-08T00:00:00Z&end_date=2026-10-01T00:00:00Z"
    )
    assert response.status_code == 422
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_report_rejects_empty_period(as_staff, mock_fetch):
    response = await _get(
        "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-01T00:00:00Z"
    )
    assert response.status_code == 422
    mock_fetch.assert_not_called()


# ── Response shape ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_report_response_shape_and_metric_keys(as_staff, mock_fetch):
    response = await _get(
        "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z"
    )
    body = response.json()
    assert set(body.keys()) == {"period", "metrics"}
    assert set(body["period"].keys()) == {"from", "to"}
    assert set(body["metrics"].keys()) == {
        "events_per_day",
        "api_latency_by_operation",
        "error_rate_by_operation",
        "frontend_error_counts_by_type",
    }


@pytest.mark.asyncio
async def test_report_computes_metrics_from_retrieved_data(as_staff, monkeypatch):
    when = datetime(2026, 10, 2, tzinfo=timezone.utc)
    mock = MagicMock(return_value=_latency_df("/inventory/products", 500, 120.0, when))
    monkeypatch.setattr(telemetry_router, "fetch_telemetry_events_dataframe", mock)

    response = await _get(
        "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z"
    )
    body = response.json()

    assert body["metrics"]["error_rate_by_operation"] == [
        {"endpoint": "/inventory/products", "method": "GET", "request_count": 1, "error_count": 1, "error_rate": 1.0}
    ]
    mock.assert_called_once()
    called_start, called_end = mock.call_args.args[1], mock.call_args.args[2]
    assert called_start.isoformat() == "2026-10-01T00:00:00+00:00"
    assert called_end.isoformat() == "2026-10-08T00:00:00+00:00"


# ── Cache behavior ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_repeated_request_with_same_period_is_served_from_cache(as_staff, mock_fetch):
    path = "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z"

    first = await _get(path)
    second = await _get(path)

    assert first.json() == second.json()
    mock_fetch.assert_called_once()


@pytest.mark.asyncio
async def test_different_periods_are_not_cross_cached(as_staff, mock_fetch):
    await _get("/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z")
    await _get("/telemetry/report?start_date=2026-09-01T00:00:00Z&end_date=2026-09-08T00:00:00Z")

    assert mock_fetch.call_count == 2


@pytest.mark.asyncio
async def test_cache_entry_expires_after_60_seconds(as_staff, mock_fetch, monkeypatch):
    path = "/telemetry/report?start_date=2026-10-01T00:00:00Z&end_date=2026-10-08T00:00:00Z"
    fake_clock = {"now": 1_000.0}
    monkeypatch.setattr("app.core.cache.time.monotonic", lambda: fake_clock["now"])

    await _get(path)
    fake_clock["now"] += 59
    await _get(path)
    assert mock_fetch.call_count == 1  # still cached, just under the TTL

    fake_clock["now"] += 2  # now 61s after the first call
    await _get(path)
    assert mock_fetch.call_count == 2  # expired, recomputed


@pytest.mark.asyncio
async def test_default_period_requests_do_not_share_a_cache_key(as_staff, mock_fetch, monkeypatch):
    """Two default-window requests resolve `now` independently (captured
    once per request, never rounded) — they must not collide on a shared
    cache key even if issued back-to-back."""
    times = iter(
        [
            datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc),
            datetime(2026, 11, 1, 12, 0, 1, tzinfo=timezone.utc),
        ]
    )
    monkeypatch.setattr(telemetry_router, "datetime", MagicMock(now=lambda tz: next(times), fromisoformat=datetime.fromisoformat))

    await _get("/telemetry/report")
    await _get("/telemetry/report")

    assert mock_fetch.call_count == 2
