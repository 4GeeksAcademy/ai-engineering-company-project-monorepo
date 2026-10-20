from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class SupplierCountry(StrEnum):
    USA = "USA"
    SPAIN = "Spain"


class SupplierCategory(StrEnum):
    CARRIER_LAST_MILE = "carrier_last_mile"
    CARRIER_INTERNATIONAL = "carrier_international"
    WAREHOUSE_SUPPLIES = "warehouse_supplies"
    PACKAGING_MATERIALS = "packaging_materials"
    REVERSE_LOGISTICS = "reverse_logistics"
    FLEET_MAINTENANCE = "fleet_maintenance"
    IT_AND_WMS_SOFTWARE = "it_and_wms_software"
    CLEANING_AND_FACILITIES = "cleaning_and_facilities"


class SupplierStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class Currency(StrEnum):
    USD = "USD"
    EUR = "EUR"


PositiveRate = Annotated[float, Field(gt=0, allow_inf_nan=False)]


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    country: SupplierCountry
    categories: list[SupplierCategory] = Field(min_length=1)
    rate_per_shipment: PositiveRate
    currency: Currency
    status: SupplierStatus
    service_zone: str | None = Field(default=None, max_length=120)
    contact_email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def currency_matches_country(self) -> "SupplierCreate":
        expected_currency = Currency.USD if self.country == SupplierCountry.USA else Currency.EUR
        if self.currency != expected_currency:
            raise ValueError(f"{self.country.value} suppliers must use {expected_currency.value}.")
        return self


class Supplier(SupplierCreate):
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupplierResponse(Supplier):
    id: int


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_shipment: PositiveRate


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus


class SupplierStatusEvent(BaseModel):
    id: int
    supplier_id: int
    previous_status: SupplierStatus
    status: SupplierStatus
    changed_at: datetime