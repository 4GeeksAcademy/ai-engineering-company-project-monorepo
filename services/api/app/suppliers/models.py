"""Pydantic models for the supplier directory.

Field names and allowed values mirror 09-lightweight-storage/CONTEXT-nexova.md.
All validation happens here, before anything reaches the storage layer.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator, model_validator


class Country(StrEnum):
    SPAIN = "Spain"
    USA = "USA"


class Currency(StrEnum):
    EUR = "EUR"
    USD = "USD"


class SupplierStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class Category(StrEnum):
    JOB_BOARDS = "job_boards"
    ATS_SOFTWARE = "ats_software"
    ASSESSMENT_TOOLS = "assessment_tools"
    TRAINING_PLATFORMS = "training_platforms"
    PAYROLL_AND_HR_SOFTWARE = "payroll_and_hr_software"
    VIDEO_INTERVIEW = "video_interview"
    BACKGROUND_CHECK = "background_check"
    OFFICE_AND_FACILITIES = "office_and_facilities"
    IT_AND_SOFTWARE_LICENSES = "it_and_software_licenses"


CURRENCY_BY_COUNTRY = {Country.SPAIN: Currency.EUR, Country.USA: Currency.USD}
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SupplierCreate(BaseModel):
    """Payload a client sends to register a supplier. `id` and `updated_at` are system-owned."""

    model_config = ConfigDict(extra="forbid")

    name: NonEmptyStr
    country: Country
    categories: list[Category] = Field(min_length=1)
    monthly_rate: float = Field(gt=0)
    currency: Currency
    status: SupplierStatus
    contract_renewal_date: date | None = None
    contact_email: EmailStr | None = None
    notes: str | None = None

    @field_validator("contract_renewal_date", mode="before")
    @classmethod
    def _strict_iso_date(cls, value: object) -> object:
        if value is None or isinstance(value, date):
            return value
        if isinstance(value, str) and ISO_DATE.fullmatch(value):
            return value
        raise ValueError("contract_renewal_date must use the YYYY-MM-DD format")

    @model_validator(mode="after")
    def _currency_matches_country(self) -> SupplierCreate:
        expected = CURRENCY_BY_COUNTRY[self.country]
        if self.currency != expected:
            raise ValueError(f"Suppliers from {self.country} must use {expected}, not {self.currency}")
        return self


class Supplier(SupplierCreate):
    """Supplier as returned by the API: the stored fields plus `id` and `updated_at`."""

    model_config = ConfigDict(extra="ignore")

    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_rate: float = Field(gt=0)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus
