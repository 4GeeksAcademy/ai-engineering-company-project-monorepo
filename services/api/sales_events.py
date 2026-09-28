"""In-process sales events for Brasaland location telemetry.

Technology's `/sales` router (built separately) should call `record_sale`
after it accepts a sale. This module does not expose that noun. The
no-sales detector subscribes here so a quiet open location can raise an
alert, and so the alert clears when sales resume.

Import from a module that shares the central API path (`services/api` is
inserted on `sys.path` by `api/app.py`):

    from sales_events import record_sale

    record_sale(
        location_id="co-med-centro",
        amount="48000",
        currency="COP",
        occurred_at=sold_at,
    )
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Callable, Protocol


def _aware(moment: datetime) -> datetime:
    if moment.tzinfo is None or moment.tzinfo.utcoffset(moment) is None:
        raise ValueError("occurred_at must include a timezone")
    return moment.astimezone(timezone.utc)


def parse_amount(amount: str) -> str:
    """Return a plain decimal string. Rejects blank, non-numeric, and non-positive values."""
    text = str(amount).strip()
    try:
        value = Decimal(text)
    except (InvalidOperation, ValueError) as error:
        raise ValueError("amount must be a number") from error
    if not value.is_finite() or value <= 0:
        raise ValueError("amount must be greater than zero")
    return format(value, "f")


@dataclass(frozen=True)
class SaleEvent:
    """One recorded sale. `amount` is a decimal string so COP and USD are not floats."""

    location_id: str
    amount: str
    currency: str
    occurred_at: datetime
    source: str = "sales"


class SalesEventSource(Protocol):
    """Storage the detector reads. Tests and the simulator can replace it."""

    def record(self, event: SaleEvent) -> None:
        """Append a sale. Later sales win when timestamps differ."""

    def replace_timeline(self, event: SaleEvent) -> None:
        """Drop prior events for this location and keep a single anchor."""

    def last_sale_at(self, location_id: str) -> datetime | None:
        """Latest `occurred_at` for the location, or None when nothing is recorded."""

    def latest(self, location_id: str) -> SaleEvent | None:
        """Latest event for the location."""

    def clear(self) -> None:
        """Remove every stored event."""


class InMemorySalesEventSource:
    """Process-local feed. Enough for the grader simulator and unit tests."""

    def __init__(self) -> None:
        self._events: list[SaleEvent] = []

    def record(self, event: SaleEvent) -> None:
        self._events.append(event)

    def replace_timeline(self, event: SaleEvent) -> None:
        self._events = [row for row in self._events if row.location_id != event.location_id]
        self._events.append(event)

    def last_sale_at(self, location_id: str) -> datetime | None:
        latest = self.latest(location_id)
        return None if latest is None else latest.occurred_at

    def latest(self, location_id: str) -> SaleEvent | None:
        rows = [row for row in self._events if row.location_id == location_id]
        if not rows:
            return None
        return max(rows, key=lambda row: row.occurred_at)

    def clear(self) -> None:
        self._events.clear()


_source: SalesEventSource = InMemorySalesEventSource()
_listeners: list[Callable[[SaleEvent], None]] = []
_validators: list[Callable[[SaleEvent], None]] = []


def get_sales_source() -> SalesEventSource:
    return _source


def set_sales_source(source: SalesEventSource) -> None:
    """Swap the feed (tests). Listeners stay registered."""
    global _source
    _source = source


def subscribe_sales(listener: Callable[[SaleEvent], None]) -> None:
    if listener not in _listeners:
        _listeners.append(listener)


def subscribe_sale_validator(validator: Callable[[SaleEvent], None]) -> None:
    """Run before the event is stored. Raise ValueError to reject the sale."""
    if validator not in _validators:
        _validators.append(validator)


def reset_sales_events() -> None:
    """Clear stored sales. Does not remove detector subscriptions."""
    _source.clear()


def record_sale(
    location_id: str,
    amount: str,
    currency: str,
    occurred_at: datetime | None = None,
    *,
    source: str = "sales",
) -> SaleEvent:
    """Record a sale and notify subscribers (the no-sales detector).

    `currency` is `COP` or `USD` and must match the location. The detector
    enforces that match when it handles the event; this function stores the
    caller's values and notifies listeners.
    """
    moment = _aware(occurred_at or datetime.now(timezone.utc))
    event = SaleEvent(
        location_id=location_id.strip(),
        amount=parse_amount(amount),
        currency=currency.strip().upper(),
        occurred_at=moment,
        source=source,
    )
    if not event.location_id:
        raise ValueError("location_id is required")
    if event.currency not in {"COP", "USD"}:
        raise ValueError("currency must be COP or USD")
    for validator in list(_validators):
        validator(event)
    _source.record(event)
    for listener in list(_listeners):
        listener(event)
    return event
