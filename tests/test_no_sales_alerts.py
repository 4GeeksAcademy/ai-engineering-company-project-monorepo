"""No-sales detection and the staff SSE stream (Operations + Technology)."""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = REPO_ROOT / "services" / "api"
for path in (str(API_ROOT), str(REPO_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

os.environ.setdefault("NO_SALES_MONITOR", "0")

from api.app import app  # noqa: E402
from locations import location_roster  # noqa: E402
from no_sales import (  # noqa: E402
    active_alerts,
    evaluate,
    hub,
    reset_no_sales_state,
    set_clock,
    simulate_quiet,
    simulate_resume,
)
from no_sales_router import iter_ops_alerts  # noqa: E402
from sales_events import SaleEvent, get_sales_source, record_sale  # noqa: E402
import users  # noqa: E402

BOGOTA = ZoneInfo("America/Bogota")
NEW_YORK = ZoneInfo("America/New_York")
SERVICE_DAY = datetime(2026, 9, 28, 18, 0, tzinfo=BOGOTA)


@pytest.fixture(autouse=True)
def _isolated(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setenv("NO_SALES_MONITOR", "0")
    monkeypatch.setenv("NO_SALES_WINDOW_MINUTES", "30")
    monkeypatch.setenv("NO_SALES_OPEN_HOUR", "11")
    monkeypatch.setenv("NO_SALES_CLOSE_HOUR", "22")
    monkeypatch.setattr(users, "DATABASE_PATH", tmp_path / "company_api.db")
    reset_no_sales_state()
    yield
    reset_no_sales_state()


def _at(zone: ZoneInfo, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 9, 28, hour, minute, tzinfo=zone)


def _anchor(location_id: str, moment: datetime, *, source: str = "sales") -> None:
    location = next(row for row in location_roster() if row.id == location_id)
    get_sales_source().replace_timeline(
        SaleEvent(
            location_id=location.id,
            amount="1000",
            currency=location.currency,
            occurred_at=moment,
            source=source,
        )
    )


def _cover_other_locations(skip: str, moment: datetime) -> None:
    """Give every other site a sale at `moment` so only `skip` can go quiet."""
    for location in location_roster():
        if location.id == skip:
            continue
        get_sales_source().replace_timeline(
            SaleEvent(
                location_id=location.id,
                amount="1000",
                currency=location.currency,
                occurred_at=moment,
                source="sales",
            )
        )


def test_open_location_with_stale_sale_raises_alert() -> None:
    moment = _at(BOGOTA, 18, 0)
    set_clock(lambda: moment)
    _anchor("co-med-centro", moment - timedelta(minutes=45))
    _cover_other_locations("co-med-centro", moment)

    transitions = evaluate(moment)

    raised = [row for row in transitions if row["kind"] == "raised"]
    assert len(raised) == 1
    alert = raised[0]["alert"]
    assert alert["location_id"] == "co-med-centro"
    assert alert["location_name"] == "Medellín Centro"
    assert alert["currency"] == "COP"
    assert alert["region"] == "Colombia"
    assert alert["quiet_minutes"] == 45
    assert alert["window_minutes"] == 30
    assert "no sales" in alert["message"]
    assert evaluate(moment) == []


def test_florida_location_uses_usd_and_new_york_hours() -> None:
    moment = _at(NEW_YORK, 18, 0)
    _anchor("us-mia-brickell", moment - timedelta(minutes=50))
    _cover_other_locations("us-mia-brickell", moment)

    transitions = evaluate(moment)

    alert = next(row["alert"] for row in transitions if row["kind"] == "raised")
    assert alert["location_id"] == "us-mia-brickell"
    assert alert["currency"] == "USD"
    assert alert["timezone"] == "America/New_York"
    assert alert["country"] == "United States"


def test_closed_hours_do_not_raise() -> None:
    moment = _at(BOGOTA, 8, 0)
    _anchor("co-med-centro", moment - timedelta(hours=3))
    _cover_other_locations("co-med-centro", moment - timedelta(hours=3))

    assert evaluate(moment) == []
    assert active_alerts() == []


def test_recent_sale_during_service_does_not_raise() -> None:
    moment = _at(BOGOTA, 18, 0)
    _anchor("co-med-centro", moment - timedelta(minutes=10))
    _cover_other_locations("co-med-centro", moment)

    assert evaluate(moment) == []


def test_grace_after_opening_does_not_raise_without_a_sale_today() -> None:
    moment = _at(BOGOTA, 11, 10)
    yesterday = moment - timedelta(hours=20)
    _anchor("co-med-centro", yesterday)
    _cover_other_locations("co-med-centro", moment)

    assert evaluate(moment) == []


def test_quiet_since_opening_raises_after_the_window() -> None:
    moment = _at(BOGOTA, 11, 40)
    _anchor("co-med-centro", moment - timedelta(hours=18))
    _cover_other_locations("co-med-centro", moment)

    transitions = evaluate(moment)

    alert = next(row["alert"] for row in transitions if row["kind"] == "raised")
    assert alert["location_id"] == "co-med-centro"
    assert alert["quiet_minutes"] == 40
    assert alert["last_sale_at"] is not None


def test_location_without_telemetry_does_not_alert() -> None:
    moment = _at(BOGOTA, 18, 0)
    assert evaluate(moment) == []
    assert active_alerts() == []


def test_window_is_configurable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NO_SALES_WINDOW_MINUTES", "10")
    moment = _at(BOGOTA, 18, 0)
    _anchor("co-bog-norte", moment - timedelta(minutes=12))
    _cover_other_locations("co-bog-norte", moment)

    transitions = evaluate(moment)

    assert [row["alert"]["location_id"] for row in transitions] == ["co-bog-norte"]
    assert transitions[0]["alert"]["window_minutes"] == 10
    assert transitions[0]["alert"]["currency"] == "COP"


def test_recording_a_sale_clears_the_alert() -> None:
    moment = _at(BOGOTA, 18, 0)
    set_clock(lambda: moment)
    _anchor("co-med-centro", moment - timedelta(minutes=60), source="simulator")
    _cover_other_locations("co-med-centro", moment)
    raised = evaluate(moment)
    assert raised[0]["kind"] == "raised"

    event = record_sale("co-med-centro", "48000", "COP", occurred_at=moment)

    assert event.amount == "48000"
    assert active_alerts() == []
    names = [item.event for item in hub.since("0")]
    assert "sale_recorded" in names
    assert "no_sales_cleared" in names
    cleared = next(item for item in hub.since("0") if item.event == "no_sales_cleared")
    assert cleared.data["currency"] == "COP"
    assert cleared.data["sale"]["amount"] == "48000"
    assert "cleared" in cleared.data["message"]


def test_currency_must_match_the_location() -> None:
    moment = _at(BOGOTA, 18, 0)
    with pytest.raises(ValueError, match="COP"):
        record_sale("co-med-centro", "10", "USD", occurred_at=moment)
    assert get_sales_source().last_sale_at("co-med-centro") is None

    with pytest.raises(ValueError, match="Unknown Brasaland location"):
        record_sale("not-a-site", "10", "COP", occurred_at=moment)


def test_openapi_lists_ops_alerts_and_the_sales_noun() -> None:
    """SSE stays on /realtime. The seeded /sales router from the central API stays mounted too."""
    paths = app.openapi()["paths"]
    joined = " ".join(paths)
    assert "/realtime/ops-alerts" in joined
    assert "/realtime/ops-alerts/stream" in paths
    assert "/sales" in paths


def test_alerts_snapshot_requires_jwt() -> None:
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/realtime/ops-alerts")
    assert response.status_code == 401


def test_stream_requires_jwt() -> None:
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/realtime/ops-alerts/stream")
    assert response.status_code == 401
    assert "text/event-stream" not in response.headers.get("content-type", "")


def test_simulate_unknown_location_is_404() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        token = client.post(
            "/auth/register",
            json={"email": "felipe.404@brasaland.test", "password": "secret-password"},
        ).json()["access_token"]
        response = client.post(
            "/realtime/ops-alerts/simulate",
            headers={"Authorization": f"Bearer {token}"},
            json={"location_id": "not-a-site", "action": "quiet"},
        )
    assert response.status_code == 404


def test_http_simulate_raises_then_clears() -> None:
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        token = client.post(
            "/auth/register",
            json={"email": "felipe.live@brasaland.test", "password": "secret-password"},
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        quiet = client.post(
            "/realtime/ops-alerts/simulate",
            headers=headers,
            json={"location_id": "us-mia-downtown", "action": "quiet"},
        )
        assert quiet.status_code == 200, quiet.text
        alert = quiet.json()["alert"]
        assert alert["currency"] == "USD"
        assert alert["location_name"] == "Miami Downtown"
        listed = client.get("/realtime/ops-alerts", headers=headers)
        assert listed.status_code == 200
        assert [row["location_id"] for row in listed.json()["alerts"]] == ["us-mia-downtown"]
        resume = client.post(
            "/realtime/ops-alerts/simulate",
            headers=headers,
            json={
                "location_id": "us-mia-downtown",
                "action": "resume",
                "amount": "36.50",
                "currency": "USD",
            },
        )
        assert resume.status_code == 200, resume.text
        assert resume.json()["status"] == "cleared"
        cleared = client.get("/realtime/ops-alerts", headers=headers)
        assert cleared.json()["alerts"] == []


def test_sse_stream_emits_alert_then_clear() -> None:
    asyncio.run(_sse_round_trip())


async def _next_frame(generator) -> str:
    return await asyncio.wait_for(generator.__anext__(), timeout=2)


async def _sse_round_trip() -> None:
    frames = iter_ops_alerts(None)
    try:
        assert (await _next_frame(frames)).startswith(": keep-alive")
        snapshot = await _next_frame(frames)
        assert snapshot.startswith("event: ops_alert_snapshot")
        assert '"alerts":[]' in snapshot.replace(" ", "")

        simulate_quiet("us-mia-downtown")
        alert_frame = await _next_frame(frames)
        assert "event: no_sales_alert" in alert_frame
        assert "us-mia-downtown" in alert_frame
        assert '"currency":"USD"' in alert_frame

        resumed = simulate_resume("us-mia-downtown", amount="36.50", currency="USD")
        assert resumed["status"] == "cleared"
        saw_clear = False
        combined = alert_frame
        for _ in range(4):
            frame = await _next_frame(frames)
            combined += frame
            if "event: no_sales_cleared" in frame:
                saw_clear = True
                assert "36.50" in frame or "36.5" in frame
                break
        assert saw_clear, combined
        assert active_alerts() == []
    finally:
        await frames.aclose()


def test_last_event_id_replays_only_newer_events() -> None:
    from no_sales import EVENT_ALERT

    first = hub.publish(EVENT_ALERT, {"location_id": "co-med-centro"})
    second = hub.publish(EVENT_ALERT, {"location_id": "us-orlando"})
    assert [item.id for item in hub.since(None)] == []
    assert [item.id for item in hub.since(first.id)] == [second.id]
    assert hub.since(second.id) == []
    encoded = second.encode()
    assert encoded.startswith(f"id: {second.id}\n")
    assert "event: no_sales_alert\n" in encoded
    assert "us-orlando" in encoded
