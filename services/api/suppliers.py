"""Brasaland suppliers API — Procurement domain from CONTEXT.md.

Lucía Fernández needs about 20 suppliers across Colombia and Florida, price
history, and consolidated visibility. Categories follow the briefing plus
the kitchen ordering procedure (proteins, produce, beverages, packaging, sauces, cleaning).
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from users import get_current_user

router = APIRouter(
    prefix="/suppliers",
    tags=["suppliers"],
    dependencies=[Depends(get_current_user)],
)

Country = Literal["Colombia", "United States"]
Category = Literal[
    "proteins",
    "vegetables_and_fruit",
    "sauces",
    "beverages",
    "packaging",
    "cleaning",
]
Currency = Literal["COP", "USD"]
SupplierStatus = Literal["active", "preferred", "inactive"]


class PricePoint(BaseModel):
    as_of: str
    unit: str
    unit_price: float = Field(ge=0)
    currency: Currency


class Supplier(BaseModel):
    id: str
    name: str
    country: Country
    market: Literal["Colombia", "Florida"]
    categories: list[Category]
    status: SupplierStatus
    emergency_surcharge_pct: int = Field(ge=0, description="Emergency-order surcharge from the ordering procedure")
    currency: Currency
    price_history: list[PricePoint]
    price_alert: bool
    latest_unit_price: float
    latest_currency: Currency


class SuppliersOverview(BaseModel):
    company: str = "Brasaland"
    total_suppliers: int
    colombia_count: int
    florida_count: int
    price_alerts: int
    categories: list[Category]
    source: str = (
        "CONTEXT.md Procurement — about 20 suppliers, two markets; "
        "price history and alerts (seeded, invoices are not live)"
    )
    suppliers: list[Supplier]


def _supplier(
    supplier_id: str,
    name: str,
    country: Country,
    categories: list[Category],
    older: float,
    newer: float,
    unit: str,
    status: SupplierStatus = "active",
) -> Supplier:
    currency: Currency = "COP" if country == "Colombia" else "USD"
    market: Literal["Colombia", "Florida"] = "Colombia" if country == "Colombia" else "Florida"
    history = [
        PricePoint(as_of="2026-08-01", unit=unit, unit_price=older, currency=currency),
        PricePoint(as_of="2026-09-15", unit=unit, unit_price=newer, currency=currency),
    ]
    alert = newer > older * 1.08
    return Supplier(
        id=supplier_id,
        name=name,
        country=country,
        market=market,
        categories=categories,
        status=status,
        emergency_surcharge_pct=8,
        currency=currency,
        price_history=history,
        price_alert=alert,
        latest_unit_price=newer,
        latest_currency=currency,
    )


# Twenty suppliers split across Colombia and Florida (CONTEXT.md: around 20).
_SUPPLIERS: list[Supplier] = [
    _supplier("sup-001", "Carnes del Valle", "Colombia", ["proteins"], 18_500, 19_200, "kg"),
    _supplier("sup-002", "Avícola Antioquia", "Colombia", ["proteins"], 12_400, 12_400, "kg"),
    _supplier("sup-003", "Verde Andina Produce", "Colombia", ["vegetables_and_fruit"], 3_200, 3_850, "kg"),
    _supplier("sup-004", "Frutas del Caribe", "Colombia", ["vegetables_and_fruit"], 4_100, 4_100, "kg"),
    _supplier("sup-005", "Salsas Medellín", "Colombia", ["sauces"], 8_800, 9_900, "L"),
    _supplier("sup-006", "Bebidas Río Negro", "Colombia", ["beverages"], 2_400, 2_400, "case"),
    _supplier("sup-007", "Empaques Paisa", "Colombia", ["packaging"], 420, 460, "unit"),
    _supplier("sup-008", "Limpieza HQ Medellín", "Colombia", ["cleaning"], 18_000, 18_000, "kit"),
    _supplier("sup-009", "Café y Cítricos Pereira", "Colombia", ["beverages", "vegetables_and_fruit"], 9_500, 9_500, "kg"),
    _supplier("sup-010", "Proteínas Bogotá Norte", "Colombia", ["proteins"], 19_000, 21_200, "kg", "preferred"),
    _supplier("sup-011", "Gulf Coast Beef", "United States", ["proteins"], 6.4, 6.4, "lb"),
    _supplier("sup-012", "Sunshine Poultry FL", "United States", ["proteins"], 3.8, 4.2, "lb"),
    _supplier("sup-013", "Gulf Coast Produce", "United States", ["vegetables_and_fruit"], 1.1, 1.1, "lb"),
    _supplier("sup-014", "Orlando Greens", "United States", ["vegetables_and_fruit"], 0.95, 1.15, "lb"),
    _supplier("sup-015", "Imported Sauce Co.", "United States", ["sauces"], 12.5, 12.5, "L"),
    _supplier("sup-016", "Atlantic Beverages", "United States", ["beverages"], 18.0, 18.0, "case"),
    _supplier("sup-017", "Miami Packaging", "United States", ["packaging"], 0.22, 0.27, "unit"),
    _supplier("sup-018", "Florida Sanitation Supply", "United States", ["cleaning"], 42.0, 42.0, "kit"),
    _supplier("sup-019", "Tampa Dry Goods", "United States", ["packaging", "cleaning"], 15.0, 15.0, "case", "inactive"),
    _supplier("sup-020", "Brickell Specialty Meats", "United States", ["proteins"], 8.1, 8.9, "lb", "preferred"),
]


def _filtered(
    country: Country | None,
    category: Category | None,
    status: str | None,
) -> list[Supplier]:
    rows = list(_SUPPLIERS)
    if country is not None:
        rows = [row for row in rows if row.country == country]
    if category is not None:
        rows = [row for row in rows if category in row.categories]
    if status is not None:
        rows = [row for row in rows if row.status == status]
    return rows


@router.get("", response_model=list[Supplier])
def list_suppliers(
    country: Country | None = Query(default=None),
    category: Category | None = Query(default=None),
    status: SupplierStatus | None = Query(default=None),
) -> list[Supplier]:
    return _filtered(country, category, status)


@router.get("/overview", response_model=SuppliersOverview)
def suppliers_overview() -> SuppliersOverview:
    colombia = [row for row in _SUPPLIERS if row.country == "Colombia"]
    florida = [row for row in _SUPPLIERS if row.country == "United States"]
    return SuppliersOverview(
        total_suppliers=len(_SUPPLIERS),
        colombia_count=len(colombia),
        florida_count=len(florida),
        price_alerts=sum(1 for row in _SUPPLIERS if row.price_alert),
        categories=[
            "proteins",
            "vegetables_and_fruit",
            "sauces",
            "beverages",
            "packaging",
            "cleaning",
        ],
        suppliers=list(_SUPPLIERS),
    )


@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: str) -> Supplier:
    for row in _SUPPLIERS:
        if row.id == supplier_id:
            return row
    raise HTTPException(status_code=404, detail="Supplier was not found.")
