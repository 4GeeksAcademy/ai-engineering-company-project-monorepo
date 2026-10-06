"""Brasaland customers API — Marketing CRM slice from CONTEXT.md.

Camila Ospina needs customer identity, order history, and preferences.
Brasa Points still runs on physical stamp cards (CONTEXT.md). Each customer
carries a stamp-card balance. A digital wallet is not live.
"""
from __future__ import annotations

import hashlib
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from users import get_current_user

from locations import get_location

router = APIRouter(
    prefix="/customers",
    tags=["customers"],
    dependencies=[Depends(get_current_user)],
)

Market = Literal["Colombia", "Florida"]
LoyaltyTier = Literal["bronze", "silver", "gold"]


class OrderHistoryItem(BaseModel):
    menu_item_id: str
    location_id: str
    ordered_on: str


class Customer(BaseModel):
    id: str
    name: str
    market: Market
    preferred_location_id: str
    preferences: list[str]
    last_order: OrderHistoryItem | None = None
    order_history: list[OrderHistoryItem] = Field(default_factory=list)
    loyalty_program: str = "Brasa Points"
    loyalty_medium: Literal["physical_stamp_card"] = "physical_stamp_card"
    uses_stamp_card: bool
    brasa_points_balance: int = Field(
        ge=0,
        description="Stamp-card tally. 1 point per 10,000 COP or 10 USD. Not a digital wallet.",
    )
    loyalty_tier: LoyaltyTier
    digital_loyalty: bool = False


class CustomersOverview(BaseModel):
    company: str = "Brasaland"
    total_customers: int
    colombia_count: int
    florida_count: int
    stamp_card_users: int
    customers_without_stamp_card: int
    brasa_points_outstanding: int
    digital_loyalty: bool = False
    points_rule: str = (
        "Physical stamp card: 1 Brasa Point per 10,000 COP or 10 USD spent. "
        "Bronze 0–19, Silver 20–49, Gold 50+. Digital wallet is not live."
    )
    source: str = (
        "CONTEXT.md Marketing — CRM with order history; "
        "Brasa Points remains physical stamp cards (about 60% of customers do not use them)"
    )
    customers: list[Customer]


def loyalty_tier(points: int) -> LoyaltyTier:
    if points >= 50:
        return "gold"
    if points >= 20:
        return "silver"
    return "bronze"


def _customer(
    customer_id: str,
    name: str,
    market: Market,
    preferred_location_id: str,
    preferences: list[str],
    uses_stamp_card: bool,
    brasa_points_balance: int,
    order_history: list[OrderHistoryItem],
) -> Customer:
    if get_location(preferred_location_id) is None:
        raise RuntimeError(f"Unknown preferred location {preferred_location_id}")
    for item in order_history:
        if get_location(item.location_id) is None:
            raise RuntimeError(f"Unknown order location {item.location_id}")
    if not uses_stamp_card and brasa_points_balance != 0:
        raise RuntimeError(f"{customer_id} has points without a stamp card")
    history = list(order_history)
    return Customer(
        id=customer_id,
        name=name,
        market=market,
        preferred_location_id=preferred_location_id,
        preferences=preferences,
        uses_stamp_card=uses_stamp_card,
        brasa_points_balance=brasa_points_balance,
        loyalty_tier=loyalty_tier(brasa_points_balance),
        last_order=history[0] if history else None,
        order_history=history,
    )


# Sample CRM. 6 of 10 do not use a stamp card (CONTEXT.md: about 60%).
_CUSTOMERS: list[Customer] = [
    _customer(
        "cus-001",
        "Ana Morales",
        "Colombia",
        "co-med-centro",
        ["grilled-sirloin", "house-sauce"],
        True,
        32,
        [
            OrderHistoryItem(
                menu_item_id="grilled-sirloin",
                location_id="co-med-centro",
                ordered_on="2026-09-18",
            ),
            OrderHistoryItem(
                menu_item_id="corn-arepa",
                location_id="co-med-elpoblado",
                ordered_on="2026-09-11",
            ),
        ],
    ),
    _customer(
        "cus-002",
        "Camila Duarte",
        "Colombia",
        "co-med-elpoblado",
        ["tropical-salad"],
        False,
        0,
        [
            OrderHistoryItem(
                menu_item_id="tropical-salad",
                location_id="co-med-elpoblado",
                ordered_on="2026-09-17",
            )
        ],
    ),
    _customer(
        "cus-003",
        "Andrés Cano",
        "Colombia",
        "co-bog-chapinero",
        ["bbq-ribs"],
        False,
        0,
        [
            OrderHistoryItem(
                menu_item_id="bbq-ribs",
                location_id="co-bog-chapinero",
                ordered_on="2026-09-16",
            )
        ],
    ),
    _customer(
        "cus-004",
        "Valentina Gómez",
        "Colombia",
        "co-cali-norte",
        ["tropical-salad"],
        True,
        8,
        [],
    ),
    _customer(
        "cus-005",
        "Julián Pérez",
        "Colombia",
        "co-barranquilla",
        ["grilled-chicken"],
        False,
        0,
        [
            OrderHistoryItem(
                menu_item_id="grilled-chicken",
                location_id="co-barranquilla",
                ordered_on="2026-09-12",
            )
        ],
    ),
    _customer(
        "cus-006",
        "Elena Vargas",
        "Colombia",
        "co-bog-norte",
        ["corn-arepa"],
        False,
        0,
        [],
    ),
    _customer(
        "cus-007",
        "Luis Herrera",
        "Colombia",
        "co-pereira",
        ["house-sauce", "corn-arepa"],
        True,
        21,
        [
            OrderHistoryItem(
                menu_item_id="corn-arepa",
                location_id="co-pereira",
                ordered_on="2026-09-10",
            )
        ],
    ),
    _customer(
        "cus-008",
        "Sofia Alvarez",
        "Florida",
        "us-mia-brickell",
        ["grilled-sirloin", "tropical-salad"],
        True,
        54,
        [
            OrderHistoryItem(
                menu_item_id="tropical-salad",
                location_id="us-mia-brickell",
                ordered_on="2026-09-19",
            ),
            OrderHistoryItem(
                menu_item_id="grilled-sirloin",
                location_id="us-mia-downtown",
                ordered_on="2026-09-05",
            ),
        ],
    ),
    _customer(
        "cus-009",
        "James Walker",
        "Florida",
        "us-orlando",
        ["bbq-ribs"],
        False,
        0,
        [
            OrderHistoryItem(
                menu_item_id="bbq-ribs",
                location_id="us-orlando",
                ordered_on="2026-09-14",
            )
        ],
    ),
    _customer(
        "cus-010",
        "Maya Patel",
        "Florida",
        "us-tampa",
        ["grilled-chicken", "corn-arepa"],
        False,
        0,
        [],
    ),
]


def _overview() -> CustomersOverview:
    colombia = [row for row in _CUSTOMERS if row.market == "Colombia"]
    florida = [row for row in _CUSTOMERS if row.market == "Florida"]
    stamp_users = [row for row in _CUSTOMERS if row.uses_stamp_card]
    return CustomersOverview(
        total_customers=len(_CUSTOMERS),
        colombia_count=len(colombia),
        florida_count=len(florida),
        stamp_card_users=len(stamp_users),
        customers_without_stamp_card=len(_CUSTOMERS) - len(stamp_users),
        brasa_points_outstanding=sum(row.brasa_points_balance for row in _CUSTOMERS),
        customers=list(_CUSTOMERS),
    )


@router.get("", response_model=list[Customer])
def list_customers() -> list[Customer]:
    return list(_CUSTOMERS)


@router.get("/overview", response_model=CustomersOverview)
def customers_overview() -> CustomersOverview:
    return _overview()


PreferenceCode = Literal["diet", "favorite_menu_item", "preferred_channel", "preferred_language"]
_DIET = {"gluten_free", "dairy_free", "nut_free", "no_restriction"}
_CHANNEL = {"in_store", "delivery", "digital_app"}
_LANGUAGE = {"es", "en"}


def telemetry_customer_id(customer_id: str) -> str:
    """Opaque token for events. Seed ids such as cus-001 are not valid event ids."""
    digest = hashlib.sha256(customer_id.encode("utf-8")).hexdigest()[:8]
    return f"cus_{digest}"


def find_customer(customer_id: str) -> Customer | None:
    for row in _CUSTOMERS:
        if row.id == customer_id:
            return row
    return None


class PreferenceCreate(BaseModel):
    preference_code: PreferenceCode
    preference_value: str = Field(min_length=1, max_length=80)


class PreferenceResult(BaseModel):
    customer_id: str
    capture: dict


_PREFERENCES: list[dict[str, str]] = []


def _check_preference(payload: PreferenceCreate) -> None:
    value = payload.preference_value.strip()
    if payload.preference_code == "preferred_language" and value not in _LANGUAGE:
        raise HTTPException(status_code=422, detail="Language must be es or en.")
    if payload.preference_code == "preferred_channel" and value not in _CHANNEL:
        raise HTTPException(status_code=422, detail="Channel must be in_store, delivery, or digital_app.")
    if payload.preference_code == "diet" and value not in _DIET:
        raise HTTPException(status_code=422, detail="Diet must be a listed restriction.")
    if payload.preference_code == "favorite_menu_item":
        from menus import list_menu_items

        names = {item.name for item in list_menu_items()}
        if value not in names:
            raise HTTPException(status_code=422, detail="Pick a menu item from the catalogue.")


@router.post("/{customer_id}/preferences", response_model=PreferenceResult, status_code=201)
def record_preference(customer_id: str, payload: PreferenceCreate) -> PreferenceResult:
    customer = find_customer(customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer was not found.")
    _check_preference(payload)
    value = payload.preference_value.strip()
    if not re.fullmatch(r"^cus_[A-Za-z0-9]{8,}$", telemetry_customer_id(customer.id)):
        raise HTTPException(status_code=500, detail="Customer token could not be built.")
    stored = {
        "customer_id": customer.id,
        "preference_code": payload.preference_code,
        "preference_value": value,
    }
    _PREFERENCES.append(stored)
    return PreferenceResult(
        customer_id=customer.id,
        capture={
            "location_scope": "none",
            "customer_id": telemetry_customer_id(customer.id),
            "preference_code": payload.preference_code,
            "preference_value": value,
        },
    )


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: str) -> Customer:
    row = find_customer(customer_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Customer was not found.")
    return row
