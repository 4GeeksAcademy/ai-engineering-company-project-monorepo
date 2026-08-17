"""Brasaland operational tickets — field names and values from CONTEXT.md."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

COMPANY_SLUG = "brasaland"
TICKET_ID_PREFIX = "BRS-"
TICKET_TYPES = ("emergency_order", "waste_escalation")
SSE_EVENTS = {
    "emergency_order": "emergency_order_created",
    "waste_escalation": "waste_escalation_created",
}
STATUSES = ("open", "pending_approval", "escalated")
CURRENCIES = ("USD", "COP")
WASTE_CATEGORIES = ("expiration", "kitchen_error", "unexplained_shrinkage")
PREMIUM_PROTEINS = ("tenderloin", "ribs")
EMERGENCY_APPROVAL_USD = 500.0
WASTE_ESCALATION_KG = 5.0
SHRINKAGE_WEEKS_THRESHOLD = 3
ASSIGNEE_PROCUREMENT = "Lucía Fernández"
ASSIGNEE_OPERATIONS = "Felipe Guerrero"
LOCATION_CURRENCY = {
    "miami-downtown": "USD",
    "bogota-norte": "COP",
    **{f"COL-{index:02d}": "COP" for index in range(1, 11)},
}
LOCATION_IDS = frozenset(LOCATION_CURRENCY)


def event_name_for(ticket_type: str) -> str:
    try:
        return SSE_EVENTS[ticket_type]
    except KeyError as error:
        raise ValueError("ticket_type must be emergency_order or waste_escalation") from error


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def initial_status_for_emergency_order(amount_usd: float) -> tuple[str, str | None]:
    if amount_usd > EMERGENCY_APPROVAL_USD:
        return "pending_approval", ASSIGNEE_PROCUREMENT
    return "open", None


def initial_status_for_waste_escalation(
    kg: float,
    protein: str | None = None,
    consecutive_shrinkage_weeks: int | None = None,
) -> tuple[str, str | None]:
    protein_key = (protein or "").strip().lower()
    weeks = consecutive_shrinkage_weeks or 0
    if protein_key in PREMIUM_PROTEINS and kg > WASTE_ESCALATION_KG:
        return "escalated", ASSIGNEE_OPERATIONS
    if weeks >= SHRINKAGE_WEEKS_THRESHOLD:
        return "escalated", ASSIGNEE_OPERATIONS
    return "open", None


def build_ticket(payload: dict[str, Any], ticket_id: str) -> dict[str, Any]:
    ticket_type = payload.get("ticket_type")
    location_id = (payload.get("location_id") or "").strip()
    if ticket_type not in TICKET_TYPES:
        raise ValueError("ticket_type must be emergency_order or waste_escalation")
    if location_id not in LOCATION_IDS:
        raise ValueError(
            "location_id must be a Brasaland location (miami-downtown, bogota-norte, COL-01 … COL-10)"
        )

    ticket: dict[str, Any] = {
        "ticket_id": ticket_id,
        "ticket_type": ticket_type,
        "location_id": location_id,
        "company": COMPANY_SLUG,
        "created_at": _utcnow(),
    }

    if ticket_type == "emergency_order":
        amount_usd = float(payload["amount_usd"])
        currency = payload.get("currency") or LOCATION_CURRENCY[location_id]
        expected_currency = LOCATION_CURRENCY[location_id]
        if currency not in CURRENCIES:
            raise ValueError("currency must be USD or COP")
        if currency != expected_currency:
            raise ValueError(
                f"{location_id} operates in {expected_currency}; do not convert USD and COP"
            )
        protein_days_remaining = payload.get("protein_days_remaining")
        status, assignee = initial_status_for_emergency_order(amount_usd)
        ticket.update(
            {
                "amount_usd": amount_usd,
                "currency": currency,
                "protein_days_remaining": protein_days_remaining,
                "status": status,
                "assignee": assignee,
            }
        )
        return ticket

    category = payload.get("category")
    if category not in WASTE_CATEGORIES:
        raise ValueError("category must be expiration, kitchen_error, or unexplained_shrinkage")
    kg = float(payload["kg"])
    protein = payload.get("protein")
    consecutive_weeks = payload.get("consecutive_shrinkage_weeks")
    status, assignee = initial_status_for_waste_escalation(
        kg,
        protein=protein,
        consecutive_shrinkage_weeks=int(consecutive_weeks) if consecutive_weeks is not None else None,
    )
    ticket.update(
        {
            "category": category,
            "kg": kg,
            "protein": protein,
            "consecutive_shrinkage_weeks": consecutive_weeks,
            "status": status,
            "assignee": assignee,
        }
    )
    return ticket


class TicketStore:
    def __init__(self) -> None:
        self._tickets: dict[str, dict[str, Any]] = {}
        self._seq = 0

    def reset(self) -> None:
        self._tickets.clear()
        self._seq = 0

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._seq += 1
        ticket_id = f"{TICKET_ID_PREFIX}{self._seq:06d}"
        ticket = build_ticket(payload, ticket_id)
        self._tickets[ticket_id] = ticket
        return deepcopy(ticket)

    def list(self) -> list[dict[str, Any]]:
        tickets = sorted(self._tickets.values(), key=lambda row: row["ticket_id"], reverse=True)
        return [deepcopy(row) for row in tickets]

    def get(self, ticket_id: str) -> dict[str, Any] | None:
        ticket = self._tickets.get(ticket_id)
        return deepcopy(ticket) if ticket else None

    def after(self, last_event_id: str | None) -> list[dict[str, Any]]:
        tickets = sorted(self._tickets.values(), key=lambda row: row["ticket_id"])
        if not last_event_id:
            return [deepcopy(row) for row in tickets]
        return [deepcopy(row) for row in tickets if row["ticket_id"] > last_event_id]


class NotificationHub:
    def __init__(self) -> None:
        self._queues: set[asyncio.Queue[dict[str, Any]]] = set()

    def reset(self) -> None:
        self._queues.clear()

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._queues.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._queues.discard(queue)

    async def publish(self, event: dict[str, Any]) -> None:
        for queue in list(self._queues):
            await queue.put(deepcopy(event))


store = TicketStore()
hub = NotificationHub()


def reset_tickets() -> None:
    store.reset()
    hub.reset()
