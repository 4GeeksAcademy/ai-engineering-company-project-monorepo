"""Pydantic models for HealthCore supplier records."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SupplierCountry = Literal["USA", "UK"]
SupplierStatus = Literal["active", "suspended"]
ComplianceAgreement = Literal["BAA", "DPA", "both"] | None

VALID_CATEGORIES = (
    "medical_supplies",
    "laboratory_services",
    "pharmaceutical",
    "clinical_software",
    "it_infrastructure",
    "hr_and_payroll_software",
    "cleaning_and_facilities",
    "patient_communication",
    "billing_and_coding_software",
    "training_platforms",
)


class SupplierFields(BaseModel):
    """Fields shared by supplier create and response representations."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    country: SupplierCountry
    categories: list[Literal[
        "medical_supplies",
        "laboratory_services",
        "pharmaceutical",
        "clinical_software",
        "it_infrastructure",
        "hr_and_payroll_software",
        "cleaning_and_facilities",
        "patient_communication",
        "billing_and_coding_software",
        "training_platforms",
    ]] = Field(min_length=1)
    monthly_rate: float = Field(gt=0)
    currency: Literal["USD", "GBP"]
    status: SupplierStatus
    compliance_agreement: ComplianceAgreement = None
    contract_renewal_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    contact_email: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def currency_matches_country(self) -> "SupplierFields":
        expected = "USD" if self.country == "USA" else "GBP"
        if self.currency != expected:
            raise ValueError(f"currency must be {expected} for country {self.country}")
        return self


class SupplierCreate(SupplierFields):
    """Client-supplied fields. updated_at is deliberately not accepted."""


class SupplierRateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    monthly_rate: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: SupplierStatus


class SupplierResponse(SupplierFields):
    """Stored supplier with system-managed metadata and TinyDB identifier."""

    id: int
    updated_at: datetime


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp for system-managed updates."""
    return datetime.now(timezone.utc)
