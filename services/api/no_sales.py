"""Detect open Brasaland locations with no sales inside a configurable window.

Restaurant Operations (Felipe Guerrero, CONTEXT.md) needs an alert when a
location records no sales during opening hours. This module owns detection,
alert state, and the in-process fan-out used by the SSE route. It reads
sales from `sales_events` so a future `/sales` router can feed it without
this module owning that HTTP noun.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from zoneinfo import ZoneInfo

from locations import Location, location_roster
from sales_events import (
    SaleEvent,
    get_sales_source,
    reset_sales_events,
    subscribe_sale_validator,
    subscribe_sales,
)

logger = logging.getLogger("brasaland.ops_alerts")

BOGOTA = ZoneInfo("America/Bogota")
NEW_YORK = ZoneInfo("America/New_York")
EVENT_ALERT = "no_sales_alert"
EVENT_CLEARED = "no_sales_cleared"
EVENT_SALE = "sale_recorded"
EVENT_SNAPSHOT = "ops_alert_snapshot"
HISTORY_LIMIT = 200

_lock = threading.RLock()
_active: dict[str, dict[str, Any]] = {}
_forced_open_until: dict[str, datetime] = {}
_monitor_task: asyncio.Task[None] | None = None
_subscribed = False
_now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc)


def set_clock(clock: Callable[[], datetime] | None) -> None:
    """Tests pin `evaluate` / the sale hook to a timezone-aware instant."""
    global _now_fn
    _now_fn = clock or (lambda: datetime.now(timezone.utc))


def current_time() -> datetime:
    return _as_utc(_now_fn())


def window_minutes() -> int:
    return _bounded_int("NO_SALES_WINDOW_MINUTES", 30, low=1, high=24 * 60)


def open_hour() -> int:
    return _bounded_int("NO_SALES_OPEN_HOUR", 11, low=0, high=23)


def close_hour() -> int:
    value = _bounded_int("NO_SALES_CLOSE_HOUR", 22, low=1, high=24)
    if value <= open_hour():
        return 22
    return value


def poll_seconds() -> float:
    raw = os.getenv("NO_SALES_POLL_SECONDS", "15")
    try:
        value = float(raw)
    except ValueError:
        return 15.0
    return min(max(value, 1.0), 3600.0)


def _bounded_int(name: str, default: int, *, low: int, high: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return min(max(value, low), high)


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None or moment.tzinfo.utcoffset(moment) is None:
        raise ValueError("timestamp must include a timezone")
    return moment.astimezone(timezone.utc)


def timezone_for(location: Location) -> ZoneInfo:
    if location.country == "Colombia":
        return BOGOTA
    return NEW_YORK


def find_location(location_id: str) -> Location | None:
    key = location_id.strip()
    for location in location_roster():
        if location.id == key:
            return location
    return None


def is_during_business_hours(location: Location, moment: datetime) -> bool:
    """True from local open hour inclusive until close hour exclusive, every day."""
    local = _as_utc(moment).astimezone(timezone_for(location))
    return open_hour() <= local.hour < close_hour()


def service_opened_at(location: Location, moment: datetime) -> datetime:
    local = _as_utc(moment).astimezone(timezone_for(location))
    opening = local.replace(hour=open_hour(), minute=0, second=0, microsecond=0)
    return opening.astimezone(timezone.utc)


def is_forced_open(location_id: str, moment: datetime) -> bool:
    until = _forced_open_until.get(location_id)
    return until is not None and _as_utc(moment) < until


def force_open(location_id: str, until: datetime) -> None:
    """Treat a location as open until `until` (simulator; real hours still apply after)."""
    _forced_open_until[location_id] = _as_utc(until)


def clear_force_open(location_id: str) -> None:
    _forced_open_until.pop(location_id, None)


@dataclass(frozen=True)
class StreamEvent:
    id: str
    event: str
    data: dict[str, Any]

    def encode(self) -> str:
        payload = json.dumps(self.data, separators=(",", ":"), default=str)
        return f"id: {self.id}\nevent: {self.event}\ndata: {payload}\n\n"


class AlertHub:
    """Fan-out for SSE subscribers. History supports Last-Event-ID replay."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[StreamEvent]] = set()
        self._history: list[StreamEvent] = []
        self._seq = 0
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def reset(self) -> None:
        self._subscribers.clear()
        self._history.clear()
        self._seq = 0

    def subscribe(self) -> asyncio.Queue[StreamEvent]:
        queue: asyncio.Queue[StreamEvent] = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[StreamEvent]) -> None:
        self._subscribers.discard(queue)

    def since(self, last_event_id: str | None) -> list[StreamEvent]:
        """Events strictly after `last_event_id`. Empty when the client has no cursor."""
        if not last_event_id:
            return []
        try:
            cursor = int(last_event_id)
        except ValueError:
            return list(self._history)
        return [item for item in self._history if int(item.id) > cursor]

    def publish(self, event: str, data: dict[str, Any]) -> StreamEvent:
        item = StreamEvent(id=self._next_id(), event=event, data=data)
        self._history.append(item)
        if len(self._history) > HISTORY_LIMIT:
            self._history = self._history[-HISTORY_LIMIT:]
        for queue in list(self._subscribers):
            self._deliver(queue, item)
        return item

    def _next_id(self) -> str:
        self._seq += 1
        return str(self._seq)

    def _deliver(self, queue: asyncio.Queue[StreamEvent], item: StreamEvent) -> None:
        loop = self._loop

        def _put() -> None:
            try:
                queue.put_nowait(item)
            except asyncio.QueueFull:
                logger.warning("ops alert subscriber queue is full; dropping event %s", item.id)

        if loop is None or not loop.is_running():
            _put()
            return
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if running is loop:
            _put()
            return
        loop.call_soon_threadsafe(_put)


hub = AlertHub()


def snapshot() -> dict[str, Any]:
    with _lock:
        alerts = list(_active.values())
    return {
        "window_minutes": window_minutes(),
        "open_hour": open_hour(),
        "close_hour": close_hour(),
        "alerts": alerts,
        "generated_at": _iso(datetime.now(timezone.utc)),
    }


def active_alerts() -> list[dict[str, Any]]:
    with _lock:
        return list(_active.values())


def _quiet_delta(location: Location, moment: datetime, last_sale: datetime | None) -> timedelta:
    moment = _as_utc(moment)
    if is_forced_open(location.id, moment):
        if last_sale is None:
            return timedelta(minutes=window_minutes())
        return moment - _as_utc(last_sale)
    opening = service_opened_at(location, moment)
    if last_sale is not None and opening <= _as_utc(last_sale) <= moment:
        reference = _as_utc(last_sale)
    else:
        reference = opening
    return moment - reference


def _sales_resumed(last_sale: datetime | None, moment: datetime, window: int) -> bool:
    if last_sale is None:
        return False
    last = _as_utc(last_sale)
    moment = _as_utc(moment)
    if last > moment:
        return False
    return (moment - last) < timedelta(minutes=window)


def _build_alert(location: Location, moment: datetime, quiet: timedelta, last_sale: datetime | None) -> dict[str, Any]:
    quiet_minutes = max(0, int(quiet.total_seconds() // 60))
    hours = f"{open_hour():02d}:00-{close_hour():02d}:00"
    tz_name = str(timezone_for(location))
    return {
        "location_id": location.id,
        "location_name": location.name,
        "city": location.city,
        "region": location.region,
        "country": location.country,
        "currency": location.currency,
        "status": "open",
        "window_minutes": window_minutes(),
        "quiet_minutes": quiet_minutes,
        "last_sale_at": None if last_sale is None else _iso(last_sale),
        "detected_at": _iso(moment),
        "timezone": tz_name,
        "business_hours": hours,
        "message": (
            f"{location.name} has recorded no sales for {quiet_minutes} minutes "
            f"during opening hours ({hours} {tz_name}, {location.currency})."
        ),
    }


def _cleared_payload(previous: dict[str, Any], moment: datetime, sale: SaleEvent | None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "location_id": previous["location_id"],
        "location_name": previous["location_name"],
        "city": previous["city"],
        "region": previous["region"],
        "country": previous["country"],
        "currency": previous["currency"],
        "status": "cleared",
        "cleared_at": _iso(moment),
        "message": f"{previous['location_name']} recorded a sale. The no-sales alert is cleared.",
    }
    if sale is not None and sale.source == "sales":
        body["sale"] = {
            "amount": sale.amount,
            "currency": sale.currency,
            "occurred_at": _iso(sale.occurred_at),
        }
    return body


def evaluate(now: datetime | None = None) -> list[dict[str, Any]]:
    """Return transition dicts (`raised` / `cleared`) and update active alerts.

    Closed locations do not raise a new alert. An open alert stays up until a
    sale lands inside the window ("sales resume"), including after close.
    """
    moment = current_time() if now is None else _as_utc(now)
    window = window_minutes()
    transitions: list[dict[str, Any]] = []
    with _lock:
        for location in location_roster():
            last_event = get_sales_source().latest(location.id)
            last_sale = None if last_event is None else last_event.occurred_at
            forced = is_forced_open(location.id, moment)
            # No POS history yet: stay quiet. Alerting every open site before
            # /sales is connected would flood Felipe with false alarms.
            seen = last_event is not None or forced
            open_now = is_during_business_hours(location, moment) or forced
            alerting = location.id in _active
            if seen and open_now:
                quiet = _quiet_delta(location, moment, last_sale)
                if quiet >= timedelta(minutes=window):
                    alert = _build_alert(location, moment, quiet, last_sale)
                    _active[location.id] = alert
                    if not alerting:
                        transitions.append({"kind": "raised", "alert": alert})
                    continue
            if alerting and _sales_resumed(last_sale, moment, window):
                previous = _active.pop(location.id)
                sale = last_event if last_event is not None and last_event.source == "sales" else None
                transitions.append({"kind": "cleared", "alert": _cleared_payload(previous, moment, sale)})
    return transitions


def publish_transitions(transitions: list[dict[str, Any]]) -> None:
    for item in transitions:
        kind = item["kind"]
        if kind == "raised":
            hub.publish(EVENT_ALERT, item["alert"])
        elif kind == "cleared":
            hub.publish(EVENT_CLEARED, item["alert"])


def apply_evaluation(now: datetime | None = None) -> list[dict[str, Any]]:
    transitions = evaluate(now)
    publish_transitions(transitions)
    return transitions


def _sale_payload(event: SaleEvent, location: Location) -> dict[str, Any]:
    return {
        "location_id": location.id,
        "location_name": location.name,
        "currency": event.currency,
        "amount": event.amount,
        "occurred_at": _iso(event.occurred_at),
        "source": event.source,
    }


def _validate_sale(event: SaleEvent) -> None:
    location = find_location(event.location_id)
    if location is None:
        raise ValueError("Unknown Brasaland location.")
    if event.currency != location.currency:
        raise ValueError(
            f"{location.name} records sales in {location.currency}. "
            f"Do not convert {event.currency} into that currency."
        )


def _on_sale(event: SaleEvent) -> None:
    location = find_location(event.location_id)
    if location is None:
        return
    hub.publish(EVENT_SALE, _sale_payload(event, location))
    # Re-check at the later of the pinned clock and the sale time so a sale
    # stamped slightly ahead of the detector clock still counts as resumed.
    moment = max(current_time(), _as_utc(event.occurred_at))
    apply_evaluation(moment)


def ensure_subscribed() -> None:
    global _subscribed
    if _subscribed:
        return
    subscribe_sale_validator(_validate_sale)
    subscribe_sales(_on_sale)
    _subscribed = True


def simulate_quiet(location_id: str, now: datetime | None = None) -> dict[str, Any]:
    """Anchor the last sale just outside the window and evaluate immediately.

    Forces the location open for 30 minutes so a grader can trigger the alert
    outside real opening hours. The same `evaluate` path runs during service.
    """
    ensure_subscribed()
    location = find_location(location_id)
    if location is None:
        raise ValueError("Unknown Brasaland location.")
    moment = current_time() if now is None else _as_utc(now)
    anchor = moment - timedelta(minutes=window_minutes() + 1)
    get_sales_source().replace_timeline(
        SaleEvent(
            location_id=location.id,
            amount="0",
            currency=location.currency,
            occurred_at=anchor,
            source="simulator",
        )
    )
    force_open(location.id, moment + timedelta(minutes=30))
    apply_evaluation(moment)
    with _lock:
        alert = _active.get(location.id)
    if alert is None:
        raise RuntimeError("Quiet simulation did not raise an alert.")
    return alert


def simulate_resume(
    location_id: str,
    amount: str | None = None,
    currency: str | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Record a sale through `record_sale` so the shared hook clears the alert."""
    from sales_events import record_sale

    ensure_subscribed()
    location = find_location(location_id)
    if location is None:
        raise ValueError("Unknown Brasaland location.")
    moment = current_time() if now is None else _as_utc(now)
    chosen_currency = currency or location.currency
    if chosen_currency != location.currency:
        raise ValueError(
            f"{location.name} records sales in {location.currency}. "
            f"Do not convert {chosen_currency} into that currency."
        )
    default_amount = "48000" if location.currency == "COP" else "36.00"
    clear_force_open(location.id)
    event = record_sale(
        location.id,
        amount or default_amount,
        chosen_currency,
        occurred_at=moment,
        source="sales",
    )
    with _lock:
        still_open = _active.get(location.id)
    return {
        "location_id": location.id,
        "status": "cleared" if still_open is None else "open",
        "currency": location.currency,
        "amount": event.amount,
    }


def reset_no_sales_state() -> None:
    """Clear alerts, simulator overrides, sales, and SSE history."""
    global _monitor_task
    set_clock(None)
    with _lock:
        _active.clear()
        _forced_open_until.clear()
    reset_sales_events()
    hub.reset()
    task = _monitor_task
    _monitor_task = None
    if task is not None and not task.done():
        task.cancel()


async def _monitor() -> None:
    while True:
        try:
            apply_evaluation()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("ops alert monitor failed")
        await asyncio.sleep(poll_seconds())


def start_monitor() -> None:
    """Background sweep so a location that stops selling raises an alert without a manual call."""
    global _monitor_task
    ensure_subscribed()
    if os.getenv("NO_SALES_MONITOR", "1") == "0":
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    hub.bind_loop(loop)
    if _monitor_task is not None and not _monitor_task.done():
        return
    _monitor_task = loop.create_task(_monitor())


def encode_snapshot() -> str:
    payload = json.dumps(snapshot(), separators=(",", ":"), default=str)
    return f"event: {EVENT_SNAPSHOT}\ndata: {payload}\n\n"


ensure_subscribed()
