"""Pydantic contracts for the suppliers domain (Directorio de Proveedores).

These are the only gate the data has: anything that doesn't fit — a
missing country, a status outside the two allowed values, a currency that
doesn't match the country — is rejected with a 422 before it reaches TinyDB.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Country(str, Enum):
    SPAIN = "Spain"
    USA = "USA"


class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierCategory(str, Enum):
    JOB_BOARDS = "job_boards"
    ATS_SOFTWARE = "ats_software"
    ASSESSMENT_TOOLS = "assessment_tools"
    TRAINING_PLATFORMS = "training_platforms"
    PAYROLL_AND_HR_SOFTWARE = "payroll_and_hr_software"
    VIDEO_INTERVIEW = "video_interview"
    BACKGROUND_CHECK = "background_check"
    OFFICE_AND_FACILITIES = "office_and_facilities"
    IT_AND_SOFTWARE_LICENSES = "it_and_software_licenses"


COUNTRY_CURRENCY = {Country.SPAIN: Currency.EUR, Country.USA: Currency.USD}


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    country: Country
    categories: list[SupplierCategory] = Field(min_length=1)
    monthly_rate: float = Field(gt=0)
    currency: Currency
    status: SupplierStatus
    contract_renewal_date: date | None = None
    contact_email: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def currency_matches_country(self) -> Self:
        expected = COUNTRY_CURRENCY[self.country]
        if self.currency != expected:
            raise ValueError(
                f"currency must be {expected.value} for country {self.country.value}"
            )
        return self


class SupplierUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    country: Country | None = None
    categories: list[SupplierCategory] | None = Field(default=None, min_length=1)
    monthly_rate: float | None = Field(default=None, gt=0)
    currency: Currency | None = None
    status: SupplierStatus | None = None
    contract_renewal_date: date | None = None
    contact_email: str | None = None
    notes: str | None = None


class SupplierRateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_rate: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus


class Supplier(SupplierCreate):
    """Full supplier record: the validated input plus the system-generated
    ``updated_at`` (stamped whenever ``monthly_rate`` changes)."""

    updated_at: datetime


class SupplierOut(Supplier):
    id: int
