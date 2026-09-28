"""Staff SSE stream for Brasaland no-sales alerts.

Notifications are server → client only, so this route uses Server-Sent Events
(named events, keep-alive comments, Last-Event-ID replay) rather than a
second WebSocket protocol. The staff console sends the same Bearer JWT with
`fetch` + `ReadableStream`, because `EventSource` cannot set Authorization.

Paths deliberately avoid the `/sales` noun. That router is owned separately
and should call `sales_events.record_sale`.
"""
from __future__ import annotations

import asyncio
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from users import get_current_user

from no_sales import (
    encode_snapshot,
    hub,
    simulate_quiet,
    simulate_resume,
    snapshot,
    start_monitor,
)

router = APIRouter(prefix="/realtime", tags=["ops-alerts"])


class SimulateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_id: str = Field(min_length=1, max_length=64)
    action: Literal["quiet", "resume"]
    amount: str | None = Field(default=None, max_length=24)
    currency: Literal["COP", "USD"] | None = None


def _as_http(error: ValueError) -> HTTPException:
    text = str(error)
    status_code = 404 if text == "Unknown Brasaland location." else 400
    return HTTPException(status_code=status_code, detail=text)


@router.get("/ops-alerts")
def list_ops_alerts(_user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
    """Current no-sales alerts. The live path is `/realtime/ops-alerts/stream`."""
    return snapshot()


@router.post("/ops-alerts/simulate")
def simulate_ops_alert(
    body: SimulateBody,
    _user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> dict[str, Any]:
    """Grader hook: mark one location quiet, or record a sale so the alert clears."""
    try:
        if body.action == "quiet":
            alert = simulate_quiet(body.location_id)
            return {"action": "quiet", "alert": alert}
        resumed = simulate_resume(body.location_id, amount=body.amount, currency=body.currency)
    except ValueError as error:
        raise _as_http(error) from error
    return {"action": "resume", **resumed}


async def iter_ops_alerts(last_event_id: str | None):
    """SSE frames: snapshot (or Last-Event-ID replay), then live alerts.

    Keep-alive comments every 15s stop proxies from closing an idle stream.
    """
    hub.bind_loop(asyncio.get_running_loop())
    queue = hub.subscribe()
    sent: set[str] = set()
    try:
        yield ": keep-alive\n\n"
        if last_event_id:
            for item in hub.since(last_event_id):
                sent.add(item.id)
                yield item.encode()
        else:
            yield encode_snapshot()
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=15)
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
                continue
            if item.id in sent:
                continue
            sent.add(item.id)
            yield item.encode()
    finally:
        hub.unsubscribe(queue)


@router.get("/ops-alerts/stream")
async def stream_ops_alerts(
    _user: Annotated[dict[str, Any], Depends(get_current_user)],
    last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
) -> StreamingResponse:
    """Push `no_sales_alert` and `no_sales_cleared` as `text/event-stream`."""
    return StreamingResponse(
        iter_ops_alerts(last_event_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def register(app: FastAPI) -> None:
    """Mount the router and start the business-hours sweep on API startup."""
    app.include_router(router)

    @app.on_event("startup")
    async def _start_ops_alert_monitor() -> None:
        start_monitor()
