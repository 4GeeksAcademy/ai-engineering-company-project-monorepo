"""Operational tickets: polling list + JWT-protected SSE notifications."""

from __future__ import annotations

from collections.abc import AsyncIterable
from typing import Annotated, Any, Literal

from auth import require_backoffice_sse_user, require_backoffice_user
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel, ConfigDict, Field
from tickets import event_name_for, hub, store

router = APIRouter(tags=["tickets"])


def sse_payload(ticket: dict[str, Any]) -> dict[str, Any]:
    """Stable SSE body from CONTEXT.md: ticket identifier + initial status first."""
    return {
        "ticket_id": ticket["ticket_id"],
        "status": ticket["status"],
        **{key: value for key, value in ticket.items() if key not in {"ticket_id", "status"}},
    }


class EmergencyOrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_type: Literal["emergency_order"]
    location_id: str = Field(min_length=1)
    amount_usd: float = Field(gt=0)
    currency: Literal["USD", "COP"] | None = None
    protein_days_remaining: float | None = Field(default=None, ge=0)


class WasteEscalationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_type: Literal["waste_escalation"]
    location_id: str = Field(min_length=1)
    category: Literal["expiration", "kitchen_error", "unexplained_shrinkage"]
    kg: float = Field(gt=0)
    protein: str | None = None
    consecutive_shrinkage_weeks: int | None = Field(default=None, ge=0)


TicketCreate = Annotated[EmergencyOrderCreate | WasteEscalationCreate, Field(discriminator="ticket_type")]


@router.get("/tickets")
def list_tickets(_user: Annotated[dict, Depends(require_backoffice_user)]) -> dict[str, list[dict[str, Any]]]:
    """Snapshot used on dashboard load and reconnect recovery; live updates come from SSE."""
    return {"tickets": store.list()}


@router.post("/tickets", status_code=201)
async def create_ticket(
    payload: TicketCreate,
    _user: Annotated[dict, Depends(require_backoffice_user)],
) -> dict[str, Any]:
    try:
        ticket = store.create(payload.model_dump(exclude_none=True))
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    await hub.publish(ticket)
    return ticket


@router.get("/notifications/stream", response_class=EventSourceResponse)
async def stream_notifications(
    _user: Annotated[dict, Depends(require_backoffice_sse_user)],
    last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
) -> AsyncIterable[ServerSentEvent]:
    """Emit `emergency_order_created` or `waste_escalation_created` (CONTEXT.md).

    FastAPI's EventSourceResponse sets ``Content-Type: text/event-stream``,
    ``Cache-Control: no-cache``, ``X-Accel-Buffering: no``, and sends keep-alive
    ping comments every 15 seconds so proxies do not close the connection.
    """
    queue = hub.subscribe()
    try:
        yield ServerSentEvent(comment="keep-alive")
        for ticket in store.after(last_event_id):
            body = sse_payload(ticket)
            yield ServerSentEvent(
                data=body,
                event=event_name_for(ticket["ticket_type"]),
                id=body["ticket_id"],
            )
        while True:
            ticket = await queue.get()
            body = sse_payload(ticket)
            yield ServerSentEvent(
                data=body,
                event=event_name_for(ticket["ticket_type"]),
                id=body["ticket_id"],
            )
    finally:
        hub.unsubscribe(queue)
