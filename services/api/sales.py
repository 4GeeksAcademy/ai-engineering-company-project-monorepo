"""Brasaland sales API — Operations / Executive domain from CONTEXT.md.

Felipe needs per-location sales in COP and USD. Mariana needs chain totals
in both currencies. Each ticket carries location, currency, amount, and a
timestamp. POS systems are not integrated; this is a seeded snapshot for the
week of 2026-09-14 (America/Bogota).
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from math import floor
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from users import get_current_user

from domain_facts import business_date, fx_recorded, timezone_for
from locations import all_locations, get_location
from menus import get_menu_item
from sales_events import parse_amount, record_sale

router = APIRouter(
    prefix="/sales",
    tags=["sales"],
    dependencies=[Depends(get_current_user)],
)

Currency = Literal["COP", "USD"]
Channel = Literal["dine_in", "takeaway", "in_store", "delivery", "digital_app"]
PlanChannel = Literal["in_store", "delivery", "digital_app"]
_LOYALTY_ID = re.compile(r"^loy_[A-Za-z0-9]{8,}$")
_CUSTOMER_ID = re.compile(r"^cus_[A-Za-z0-9]{8,}$")

# Illustrative reporting FX only — not a live feed (CONTEXT.md: no POS integration).
ILLUSTRATIVE_USD_COP = 4000
REPORTING_WEEK_START = "2026-09-14"
REPORTING_WEEK_END = "2026-09-21"
OPEN_HOURS = "11:00-22:00 local"
OPEN_HOUR_START = 11
OPEN_HOUR_END = 22

_WEIGHTS = (0.42, 0.33, 0.25)
_SLOTS: tuple[tuple[str, Channel, str], ...] = (
    ("2026-09-16T12:40:00", "dine_in", "grilled-sirloin"),
    ("2026-09-18T19:15:00", "dine_in", "bbq-ribs"),
    ("2026-09-20T13:05:00", "takeaway", "grilled-chicken"),
)

# Weekly local-currency totals and covers for the 14 CONTEXT.md locations.
# Colombia amounts are COP; Florida amounts are USD. Scale is about one week
# of a USD 6 million year at the illustrative rate above.
_WEEKLY_LOCAL: tuple[tuple[str, int, float], ...] = (
    ("co-med-centro", 412, 38_400_000),
    ("co-med-elpoblado", 388, 41_200_000),
    ("co-bog-chapinero", 355, 36_800_000),
    ("co-bog-norte", 341, 35_100_000),
    ("co-cali-norte", 298, 29_400_000),
    ("co-barranquilla", 276, 27_200_000),
    ("co-cartagena", 264, 31_600_000),
    ("co-pereira", 221, 22_800_000),
    ("us-mia-brickell", 402, 11_400),
    ("us-mia-downtown", 376, 10_250),
    ("us-orlando", 318, 8_900),
    ("us-tampa", 291, 8_150),
    ("us-ftlauderdale", 274, 7_820),
    ("us-jacksonville", 248, 6_940),
)


class SaleLineIn(BaseModel):
    menu_item_id: str | None = None
    menu_item_name: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=1)
    line_amount: float = Field(ge=0)


class SaleCreate(BaseModel):
    """One new ticket. Currency must be the location's own COP or USD.

    `channel` omitted keeps the stored channel `dine_in` (existing callers).
    A plan channel (`in_store`, `delivery`, `digital_app`) is stored as sent.
    `dine_in` maps to `in_store` on the sale_completed capture.
    """

    location_id: str = Field(min_length=1, max_length=64)
    amount: str | float | int
    currency: Currency
    occurred_at: datetime | None = None
    channel: PlanChannel | None = None
    covers: int | None = Field(default=None, ge=0)
    lines: list[SaleLineIn] | None = None
    loyalty_attached: bool = False
    loyalty_account_id: str | None = None
    customer_id: str | None = None


class Sale(BaseModel):
    id: str
    location_id: str
    location_name: str
    country: str
    region: str
    currency: Currency
    amount: float = Field(ge=0, description="Ticket total in the location currency")
    amount_cop: float = Field(ge=0)
    amount_usd: float = Field(ge=0)
    covers: int = Field(ge=0)
    occurred_at: str = Field(description="ISO-8601 timestamp with local offset")
    channel: Channel
    menu_item_id: str


class SaleRecorded(Sale):
    """POST /sales body. `capture` is the sale_completed property bag."""

    capture: dict[str, Any] | None = None


class LocationSales(BaseModel):
    location_id: str
    location_name: str
    country: str
    region: str
    currency: Currency
    sale_count: int = Field(ge=0)
    covers: int = Field(ge=0)
    amount_local: float = Field(ge=0)
    amount_cop: float = Field(ge=0)
    amount_usd: float = Field(ge=0)
    open_hours: str
    latest_sale_at: str | None = None
    no_sales_during_open_hours: bool


class SalesOverview(BaseModel):
    company: str = "Brasaland"
    reporting_week_start: str
    reporting_week_end: str
    total_locations: int
    sale_count: int
    currencies: list[Currency]
    chain_total_cop: float
    chain_total_usd: float
    colombia_total_cop: float
    florida_total_usd: float
    no_sales_alerts: list[str]
    source: str = (
        "CONTEXT.md Operations + Executive — COP and USD per location; "
        "seeded snapshot (POS not integrated)"
    )
    fx_note: str = (
        f"amount_cop/amount_usd use illustrative USD:COP={ILLUSTRATIVE_USD_COP} "
        "for dual-currency dashboards; not a live FX feed"
    )
    locations: list[LocationSales]


def _to_cop(amount: float, currency: Currency) -> float:
    if currency == "COP":
        return float(amount)
    return round(amount * ILLUSTRATIVE_USD_COP, 2)


def _to_usd(amount: float, currency: Currency) -> float:
    if currency == "USD":
        return round(float(amount), 2)
    return round(amount / ILLUSTRATIVE_USD_COP, 2)


def _split_int(total: int, weights: tuple[float, ...]) -> list[int]:
    parts = [int(total * weight) for weight in weights[:-1]]
    parts.append(total - sum(parts))
    return parts


def _occurred_at(clock: str, country: str) -> str:
    offset = "-05:00" if country == "Colombia" else "-04:00"
    return f"{clock}{offset}"


def during_open_hours(occurred_at: str) -> bool:
    moment = datetime.fromisoformat(occurred_at)
    return OPEN_HOUR_START <= moment.hour < OPEN_HOUR_END


def _build_sales() -> list[Sale]:
    sales: list[Sale] = []
    for location_id, covers, amount_local in _WEEKLY_LOCAL:
        location = get_location(location_id)
        if location is None:
            raise RuntimeError(f"Unknown location seed {location_id}")
        cover_parts = _split_int(covers, _WEIGHTS)
        if location.currency == "COP":
            money_parts = [float(part) for part in _split_int(int(amount_local), _WEIGHTS)]
        else:
            money_parts = [
                part / 100
                for part in _split_int(int(round(amount_local * 100)), _WEIGHTS)
            ]
        for index, ((clock, channel, menu_item_id), cover_count, local_amount) in enumerate(
            zip(_SLOTS, cover_parts, money_parts),
            start=1,
        ):
            sales.append(
                Sale(
                    id=f"sal-{location_id}-{index}",
                    location_id=location.id,
                    location_name=location.name,
                    country=location.country,
                    region=location.region,
                    currency=location.currency,
                    amount=local_amount,
                    amount_cop=_to_cop(local_amount, location.currency),
                    amount_usd=_to_usd(local_amount, location.currency),
                    covers=cover_count,
                    occurred_at=_occurred_at(clock, location.country),
                    channel=channel,
                    menu_item_id=menu_item_id,
                )
            )
    seeded = {location_id for location_id, _, _ in _WEEKLY_LOCAL}
    missing = {location.id for location in all_locations()} - seeded
    if missing:
        raise RuntimeError(f"Sales seed missing locations: {sorted(missing)}")
    return sales


def build_location_rollups(sales: list[Sale]) -> list[LocationSales]:
    """One row per roster location. A location with no in-hours ticket is an alert."""
    grouped: dict[str, list[Sale]] = {}
    for sale in sales:
        grouped.setdefault(sale.location_id, []).append(sale)

    rows: list[LocationSales] = []
    for location in all_locations():
        tickets = grouped.get(location.id, [])
        in_hours = [ticket for ticket in tickets if during_open_hours(ticket.occurred_at)]
        amount_local = sum(ticket.amount for ticket in tickets)
        if location.currency == "USD":
            amount_local = round(amount_local, 2)
        latest = max((ticket.occurred_at for ticket in tickets), default=None)
        rows.append(
            LocationSales(
                location_id=location.id,
                location_name=location.name,
                country=location.country,
                region=location.region,
                currency=location.currency,
                sale_count=len(tickets),
                covers=sum(ticket.covers for ticket in tickets),
                amount_local=amount_local,
                amount_cop=round(sum(ticket.amount_cop for ticket in tickets), 2),
                amount_usd=round(sum(ticket.amount_usd for ticket in tickets), 2),
                open_hours=OPEN_HOURS,
                latest_sale_at=latest,
                no_sales_during_open_hours=len(in_hours) == 0,
            )
        )
    return rows


_SALES: list[Sale] = _build_sales()


def _rollups() -> list[LocationSales]:
    return build_location_rollups(_SALES)


def _overview() -> SalesOverview:
    locations = _rollups()
    colombia = [row for row in locations if row.region == "Colombia"]
    florida = [row for row in locations if row.region == "Florida"]
    alerts = [row.location_id for row in locations if row.no_sales_during_open_hours]
    return SalesOverview(
        reporting_week_start=REPORTING_WEEK_START,
        reporting_week_end=REPORTING_WEEK_END,
        total_locations=len(locations),
        sale_count=len(_SALES),
        currencies=["COP", "USD"],
        chain_total_cop=round(sum(sale.amount_cop for sale in _SALES), 2),
        chain_total_usd=round(sum(sale.amount_usd for sale in _SALES), 2),
        colombia_total_cop=round(sum(row.amount_cop for row in colombia), 2),
        florida_total_usd=round(sum(row.amount_usd for row in florida), 2),
        no_sales_alerts=alerts,
        locations=locations,
    )


def _filtered(location_id: str | None, currency: Currency | None) -> list[Sale]:
    rows = list(_SALES)
    if location_id is not None:
        rows = [row for row in rows if row.location_id == location_id]
    if currency is not None:
        rows = [row for row in rows if row.currency == currency]
    return rows


def _next_sale_id(location_id: str) -> str:
    prefix = f"sal-{location_id}-"
    taken = {row.id for row in _SALES if row.id.startswith(prefix)}
    index = 1
    while f"{prefix}{index}" in taken:
        index += 1
    return f"{prefix}{index}"


def _aware_moment(moment: datetime) -> datetime:
    if moment.tzinfo is None or moment.tzinfo.utcoffset(moment) is None:
        raise HTTPException(status_code=400, detail="occurred_at must include a timezone")
    return moment


@router.get("", response_model=list[Sale])
def list_sales(
    location_id: str | None = Query(default=None),
    currency: Currency | None = Query(default=None),
) -> list[Sale]:
    """Ticket-level sales. Each row has location, currency (COP or USD), and occurred_at."""
    return _filtered(location_id, currency)


def _plan_channel(stored: str) -> str | None:
    if stored in ("in_store", "delivery", "digital_app"):
        return stored
    if stored == "dine_in":
        return "in_store"
    return None


def _points_earned(amount: float, currency: str) -> int:
    if currency == "COP":
        return floor(amount / 10_000)
    return floor(amount / 10)


def _capture_lines(payload: SaleCreate, amount: float) -> tuple[list[dict[str, Any]], str]:
    if payload.lines:
        built: list[dict[str, Any]] = []
        for line in payload.lines:
            if line.menu_item_id:
                get_menu_item(line.menu_item_id)
            item: dict[str, Any] = {
                "menu_item_name": line.menu_item_name.strip(),
                "quantity": line.quantity,
                "line_amount": line.line_amount,
            }
            if line.menu_item_id:
                item["menu_item_id"] = line.menu_item_id
            built.append(item)
        return built, payload.lines[0].menu_item_id or "grilled-sirloin"
    menu = get_menu_item("grilled-sirloin")
    return (
        [
            {
                "menu_item_id": menu.id,
                "menu_item_name": menu.name,
                "quantity": 1,
                "line_amount": amount,
            }
        ],
        menu.id,
    )


@router.post("", response_model=SaleRecorded, status_code=201)
def create_sale(payload: SaleCreate) -> SaleRecorded:
    """Store a ticket on the same list GET /sales reads, then notify the no-sales monitor."""
    location = get_location(payload.location_id.strip())
    if location is None:
        raise HTTPException(status_code=404, detail="Sales for that location were not found.")
    if payload.currency != location.currency:
        raise HTTPException(
            status_code=400,
            detail=f"{location.name} records sales in {location.currency}.",
        )
    try:
        amount = parse_amount(str(payload.amount))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if payload.loyalty_attached:
        if not payload.loyalty_account_id or not _LOYALTY_ID.fullmatch(payload.loyalty_account_id):
            raise HTTPException(status_code=422, detail="Loyalty account id is not valid.")
    elif payload.loyalty_account_id:
        raise HTTPException(status_code=422, detail="Loyalty account id requires loyalty_attached.")
    if payload.customer_id and not _CUSTOMER_ID.fullmatch(payload.customer_id):
        raise HTTPException(status_code=422, detail="Customer id is not valid for a ticket.")
    moment = _aware_moment(payload.occurred_at or datetime.now(timezone.utc))
    local_amount = float(amount)
    covers = 1 if payload.covers is None else payload.covers
    covers_source = "defaulted_to_one" if payload.covers is None else "pos"
    lines, menu_item_id = _capture_lines(payload, local_amount)
    stored_channel: Channel = payload.channel or "dine_in"
    sale = SaleRecorded(
        id=_next_sale_id(location.id),
        location_id=location.id,
        location_name=location.name,
        country=location.country,
        region=location.region,
        currency=location.currency,
        amount=local_amount,
        amount_cop=_to_cop(local_amount, location.currency),
        amount_usd=_to_usd(local_amount, location.currency),
        covers=covers,
        occurred_at=moment.isoformat(),
        channel=stored_channel,
        menu_item_id=menu_item_id,
    )
    plan_channel = _plan_channel(stored_channel)
    if plan_channel is not None:
        capture: dict[str, Any] = {
            "location_scope": "location",
            "location_id": location.id,
            "country": location.country,
            "currency": location.currency,
            "timezone": timezone_for(location.country),
            "ticket_id": sale.id,
            "business_date": business_date(moment, location.country),
            "channel": plan_channel,
            "covers": covers,
            "covers_source": covers_source,
            "amount": local_amount,
            **fx_recorded(local_amount, location.currency),
            "lines": lines,
            "loyalty_attached": payload.loyalty_attached,
            "points_earned": _points_earned(local_amount, location.currency),
        }
        if payload.loyalty_attached and payload.loyalty_account_id:
            capture["loyalty_account_id"] = payload.loyalty_account_id
        if payload.customer_id:
            capture["customer_id"] = payload.customer_id
        sale.capture = capture
    _SALES.append(sale)
    try:
        record_sale(
            location.id,
            amount,
            location.currency,
            occurred_at=moment,
            source="sales",
        )
    except ValueError as error:
        _SALES.pop()
        text = str(error)
        status_code = 404 if "Unknown Brasaland location" in text else 400
        raise HTTPException(status_code=status_code, detail=text) from error
    return sale


@router.get("/overview", response_model=SalesOverview)
def sales_overview() -> SalesOverview:
    overview = _overview()
    if overview.total_locations != len(all_locations()):
        raise HTTPException(status_code=500, detail="Sales snapshot is missing locations.")
    return overview


@router.get("/alerts", response_model=list[LocationSales])
def sales_alerts() -> list[LocationSales]:
    """Locations with no ticket during opening hours in the seeded week."""
    return [row for row in _rollups() if row.no_sales_during_open_hours]


@router.get("/locations/{location_id}", response_model=LocationSales)
def get_location_sales(location_id: str) -> LocationSales:
    for row in _rollups():
        if row.location_id == location_id:
            return row
    raise HTTPException(status_code=404, detail="Sales for that location were not found.")


@router.get("/{sale_id}", response_model=Sale)
def get_sale(sale_id: str) -> Sale:
    for row in _SALES:
        if row.id == sale_id:
            return row
    raise HTTPException(status_code=404, detail="Sale was not found.")
