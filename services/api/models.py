"""Pydantic models for the Brasaland supplier directory (CONTEXT.md)."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PRODUCT_CATEGORIES = (
    "proteins",
    "vegetables_and_fruit",
    "beverages_and_packaging",
    "imported_sauces_and_condiments",
)


class SupplierStatus(str, Enum):
    """Allowed CONTEXT statuses: active, preferred, inactive."""

    ACTIVE = "active"
    PREFERRED = "preferred"
    INACTIVE = "inactive"


STATUS_ALIASES = {
    "preferred": SupplierStatus.PREFERRED,
    "active": SupplierStatus.ACTIVE,
    "inactive": SupplierStatus.INACTIVE,
    "suspend": SupplierStatus.INACTIVE,
    "suspended": SupplierStatus.INACTIVE,
}
STATUS_ACTION_STORED = {
    "active": SupplierStatus.ACTIVE.value,
    "suspend": SupplierStatus.INACTIVE.value,
}
STATUSES = tuple(item.value for item in SupplierStatus)
COUNTRIES = ("Colombia", "United States")

SEED_SUPPLIERS: list[dict[str, Any]] = [
    {
        "supplier_id": "SUP-001",
        "name": "Carnes del Valle",
        "country": "Colombia",
        "product_categories": ["proteins"],
        "emergency_surcharge_pct": 8,
        "status": "preferred",
    },
    {
        "supplier_id": "SUP-002",
        "name": "Florida Prime Meats",
        "country": "United States",
        "product_categories": ["proteins"],
        "emergency_surcharge_pct": 8,
        "status": "active",
    },
    {
        "supplier_id": "SUP-003",
        "name": "Huerta Andina",
        "country": "Colombia",
        "product_categories": ["vegetables_and_fruit"],
        "emergency_surcharge_pct": 8,
        "status": "active",
    },
    {
        "supplier_id": "SUP-004",
        "name": "Gulf Coast Produce",
        "country": "United States",
        "product_categories": ["vegetables_and_fruit"],
        "emergency_surcharge_pct": 8,
        "status": "preferred",
    },
    {
        "supplier_id": "SUP-005",
        "name": "Empaques Caribe",
        "country": "Colombia",
        "product_categories": ["beverages_and_packaging"],
        "emergency_surcharge_pct": 8,
        "status": "active",
    },
    {
        "supplier_id": "SUP-006",
        "name": "Sabores Importados",
        "country": "Colombia",
        "product_categories": ["imported_sauces_and_condiments"],
        "emergency_surcharge_pct": 8,
        "status": "inactive",
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_supplier_status(value: Any) -> SupplierStatus:
    if isinstance(value, SupplierStatus):
        return value
    key = str(value).strip().lower()
    if key in STATUS_ALIASES:
        return STATUS_ALIASES[key]
    allowed = ", ".join(STATUSES)
    raise ValueError(
        f"status must be one of: {allowed} (suspend and suspended are stored as inactive)"
    )


class SupplierInput(BaseModel):
    """Client create payload. `supplier_id` and `updated_at` are not client fields."""

    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    name: str = Field(min_length=1)
    country: str
    product_categories: list[str] = Field(min_length=1)
    emergency_surcharge_pct: float = Field(
        gt=0,
        description="CONTEXT emergency-order rate. Must be a positive number; 0 and negatives are rejected.",
    )
    status: SupplierStatus = SupplierStatus.ACTIVE

    @field_validator("emergency_surcharge_pct")
    @classmethod
    def rate_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("emergency_surcharge_pct must be a positive number")
        return value

    @field_validator("status", mode="before")
    @classmethod
    def status_must_be_context_value(cls, value: Any) -> SupplierStatus:
        return parse_supplier_status(value)

    @field_validator("country")
    @classmethod
    def country_must_be_context_value(cls, value: str) -> str:
        if value not in COUNTRIES:
            raise ValueError(f"country must be one of: {', '.join(COUNTRIES)}")
        return value

    @field_validator("product_categories")
    @classmethod
    def categories_must_be_context_values(cls, value: list[str]) -> list[str]:
        unknown = [item for item in value if item not in PRODUCT_CATEGORIES]
        if unknown:
            raise ValueError(f"product_categories must be from: {', '.join(PRODUCT_CATEGORIES)}")
        return value


class SupplierUpdate(BaseModel):
    """Client patch payload. Partial; system fields are ignored if sent."""

    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    name: str | None = Field(default=None, min_length=1)
    country: str | None = None
    product_categories: list[str] | None = Field(default=None, min_length=1)
    emergency_surcharge_pct: float | None = Field(default=None, gt=0)
    status: SupplierStatus | None = None

    @field_validator("status", mode="before")
    @classmethod
    def status_must_be_context_value(cls, value: Any) -> SupplierStatus | None:
        if value is None:
            return None
        return parse_supplier_status(value)

    @field_validator("emergency_surcharge_pct")
    @classmethod
    def rate_must_be_positive(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if value <= 0:
            raise ValueError("emergency_surcharge_pct must be a positive number")
        return value


class SupplierRateUpdate(BaseModel):
    """PATCH /suppliers/{id}/rate. Field name is CONTEXT `emergency_surcharge_pct`."""

    model_config = ConfigDict(extra="ignore")

    emergency_surcharge_pct: float = Field(gt=0)

    @field_validator("emergency_surcharge_pct")
    @classmethod
    def rate_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("emergency_surcharge_pct must be a positive number")
        return value


class SupplierStatusPatch(BaseModel):
    """Body for PATCH /suppliers/{id}/status. Only CONTEXT activate/suspend values."""

    model_config = ConfigDict(extra="ignore")

    status: Literal["active", "suspend"]


class SupplierResponse(BaseModel):
    """Stored record returned by the API. `id` is TinyDB's document id."""

    model_config = ConfigDict(use_enum_values=True)

    id: int
    supplier_id: str
    name: str
    country: str
    product_categories: list[str]
    emergency_surcharge_pct: float
    status: SupplierStatus
    updated_at: str

    @field_validator("status", mode="before")
    @classmethod
    def status_must_be_context_value(cls, value: Any) -> SupplierStatus:
        return parse_supplier_status(value)


SupplierCreate = SupplierInput
Supplier = SupplierResponse
