from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

VALID_CATEGORIES = [
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]


class Country(str, Enum):
    USA = "USA"
    SPAIN = "Spain"


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierBase(BaseModel):
    name: str
    country: Country
    categories: list[str] = Field(min_length=1)
    rate_per_shipment: float = Field(gt=0)
    currency: str
    status: SupplierStatus
    service_zone: str | None = None
    contact_email: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_supplier(self) -> "SupplierBase":
        invalid_categories = [category for category in self.categories if category not in VALID_CATEGORIES]
        if invalid_categories:
            raise ValueError(f"Invalid categories: {', '.join(invalid_categories)}")

        expected_currency = "USD" if self.country == Country.USA else "EUR"
        if self.currency != expected_currency:
            raise ValueError(f"Currency for {self.country.value} must be {expected_currency}")

        return self


class SupplierCreate(SupplierBase):
    model_config = ConfigDict(extra="forbid")


class Supplier(SupplierBase):
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    rate_per_shipment: float = Field(gt=0)

    model_config = ConfigDict(extra="forbid")


class StatusUpdate(BaseModel):
    status: SupplierStatus

    model_config = ConfigDict(extra="forbid")
