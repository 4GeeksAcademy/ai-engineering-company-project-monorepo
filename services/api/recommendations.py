"""One suggested menu item for a location, then an acceptance of that suggestion."""

from __future__ import annotations

import secrets
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from users import get_current_user

from customers import find_customer, telemetry_customer_id
from domain_facts import timezone_for
from locations import get_location
from menus import list_menu_items

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(get_current_user)],
)

Surface = Literal["checkout", "kiosk", "app_home"]


class SuggestionCreate(BaseModel):
    location_id: str = Field(min_length=1, max_length=64)
    surface: Surface
    customer_id: str | None = None


class Suggestion(BaseModel):
    recommendation_id: str
    capture: dict


class Acceptance(BaseModel):
    capture: dict


class _Stored(BaseModel):
    recommendation_id: str
    location_id: str
    menu_item_name: str
    customer_token: str | None
    accepted: bool = False


_ROWS: dict[str, _Stored] = {}


def _token() -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "recm_" + "".join(secrets.choice(alphabet) for _ in range(8))


def _suggest_name(customer_id: str | None) -> str:
    items = {item.id: item.name for item in list_menu_items()}
    customer = find_customer(customer_id) if customer_id else None
    if customer is not None:
        for preference in customer.preferences:
            if preference in items:
                return items[preference]
        for order in customer.order_history:
            if order.menu_item_id in items:
                return items[order.menu_item_id]
    return items["grilled-sirloin"]


@router.post("", response_model=Suggestion, status_code=201)
def show_recommendation(payload: SuggestionCreate) -> Suggestion:
    location = get_location(payload.location_id.strip())
    customer_id = payload.customer_id.strip() if payload.customer_id else None
    surface = payload.surface
    if location is None:
        raise HTTPException(status_code=404, detail="That location was not found.")
    customer_token = None
    if customer_id:
        if find_customer(customer_id) is None:
            raise HTTPException(status_code=404, detail="That customer was not found.")
        customer_token = telemetry_customer_id(customer_id)
    name = _suggest_name(customer_id)
    row = _Stored(
        recommendation_id=_token(),
        location_id=location.id,
        menu_item_name=name,
        customer_token=customer_token,
    )
    _ROWS[row.recommendation_id] = row
    capture = {
        "location_scope": "location",
        "location_id": location.id,
        "country": location.country,
        "currency": location.currency,
        "timezone": timezone_for(location.country),
        "recommendation_id": row.recommendation_id,
        "menu_item_name": name,
        "surface": surface,
    }
    if customer_token:
        capture["customer_id"] = customer_token
    return Suggestion(recommendation_id=row.recommendation_id, capture=capture)


@router.post("/{recommendation_id}/accept", response_model=Acceptance)
def accept_recommendation(recommendation_id: str) -> Acceptance:
    row = _ROWS.get(recommendation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="That suggestion was not found.")
    if row.accepted:
        raise HTTPException(status_code=409, detail="That suggestion was already accepted.")
    location = get_location(row.location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="That location was not found.")
    row.accepted = True
    capture = {
        "location_scope": "location",
        "location_id": location.id,
        "country": location.country,
        "currency": location.currency,
        "timezone": timezone_for(location.country),
        "recommendation_id": row.recommendation_id,
        "menu_item_name": row.menu_item_name,
        "accepted": True,
    }
    if row.customer_token:
        capture["customer_id"] = row.customer_token
    return Acceptance(capture=capture)
