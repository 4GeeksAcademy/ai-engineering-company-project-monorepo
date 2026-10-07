"""Inbound supplier orders for Procurement.

One line per request. Price variance is emitted only when this line's unit
price moves at least 1 percent from the supplier's latest price for that
product and currency.
"""

from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from users import get_current_user

from domain_facts import fx_recorded, timezone_for
from inventory import load_products
from locations import get_location
from suppliers import get_supplier_row

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(get_current_user)],
)

OrderKind = Literal["scheduled", "emergency"]
Category = Literal[
    "proteins",
    "vegetables_fruit",
    "beverages_packaging",
    "imported_sauces",
    "cleaning",
    "other",
]
_SUPPLIER_TOKEN = re.compile(r"^sup_[a-z0-9_]{2,64}$")

_ORDERS: list[dict] = []
_LAST_PRICE: dict[tuple[int, str, str], float] = {}
_SEQ = 0


class InboundLineCreate(BaseModel):
    location_id: str = Field(min_length=1, max_length=64)
    supplier_id: str = Field(min_length=1, max_length=64)
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1)
    order_kind: OrderKind
    category: Category
    unit_price: float = Field(gt=0)


class InboundLineResult(BaseModel):
    order_id: str
    inbound: dict
    price_variance: dict | None = None


def telemetry_supplier_id(supplier_id: str) -> str:
    """Seed ids use a hyphen (`sup-001`). The event token uses an underscore."""
    token = supplier_id.replace("-", "_")
    if not _SUPPLIER_TOKEN.fullmatch(token):
        raise HTTPException(status_code=400, detail="That supplier cannot be recorded on an order line.")
    return token


def _next_order_id() -> str:
    global _SEQ
    _SEQ += 1
    return f"in-{1000 + _SEQ}"


@router.post("/inbound", response_model=InboundLineResult, status_code=201)
def create_inbound_line(payload: InboundLineCreate) -> InboundLineResult:
    location = get_location(payload.location_id.strip())
    if location is None:
        raise HTTPException(status_code=404, detail="That location was not found.")
    supplier = get_supplier_row(payload.supplier_id.strip())
    if supplier is None:
        raise HTTPException(status_code=404, detail="That supplier was not found.")
    if supplier.currency != location.currency:
        raise HTTPException(
            status_code=400,
            detail=f"{supplier.name} prices in {supplier.currency}, not {location.currency}.",
        )
    product = next(
        (row for row in load_products() if row["product_id"] == payload.product_id),
        None,
    )
    if product is None:
        raise HTTPException(status_code=404, detail="That product was not found.")

    surcharge = 0.08 if payload.order_kind == "emergency" else 0.0
    list_cost = round(float(supplier.latest_unit_price) * payload.quantity, 2)
    cost = round(payload.unit_price * payload.quantity * (1 + surcharge), 2)
    approval_required = payload.order_kind == "emergency"
    approval_state = "pending" if approval_required else "not_required"
    order_id = _next_order_id()
    supplier_token = telemetry_supplier_id(supplier.id)
    facts = {
        "location_scope": "location",
        "location_id": location.id,
        "country": location.country,
        "currency": location.currency,
        "timezone": timezone_for(location.country),
    }
    inbound = {
        **facts,
        "order_id": order_id,
        "line_index": 0,
        "product_id": int(product["product_id"]),
        "product_name": str(product["name"]),
        "quantity": payload.quantity,
        "unit": str(product["unit"]),
        "supplier_id": supplier_token,
        "category": payload.category,
        "order_kind": payload.order_kind,
        "list_cost": list_cost,
        "surcharge_rate": surcharge,
        "cost": cost,
        "unit_price": payload.unit_price,
        **fx_recorded(cost, location.currency),
        "approval_required": approval_required,
        "approval_state": approval_state,
    }
    price_key = (int(product["product_id"]), supplier.id, location.currency)
    previous = _LAST_PRICE.get(price_key, float(supplier.latest_unit_price))
    variance = None
    if previous > 0 and abs(payload.unit_price - previous) / previous >= 0.01:
        variance = {
            **facts,
            "product_id": int(product["product_id"]),
            "product_name": str(product["name"]),
            "supplier_id": supplier_token,
            "order_id": order_id,
            "previous_unit_price": previous,
            "unit_price": payload.unit_price,
            "variance_pct": (payload.unit_price - previous) / previous,
        }
    _LAST_PRICE[price_key] = payload.unit_price
    _ORDERS.append(inbound)
    return InboundLineResult(order_id=order_id, inbound=inbound, price_variance=variance)
