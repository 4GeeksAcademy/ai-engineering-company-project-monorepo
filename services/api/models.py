from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class Country(str, Enum):
    USA = "USA"
    UK = "UK"


class Currency(str, Enum):
    USD = "USD"
    GBP = "GBP"


class SupplierStatus(str, Enum):
    active = "active"
    suspended = "suspended"


class Category(str, Enum):
    medical_supplies = "medical_supplies"
    laboratory_services = "laboratory_services"
    pharmaceutical = "pharmaceutical"
    clinical_software = "clinical_software"
    it_infrastructure = "it_infrastructure"
    hr_and_payroll_software = "hr_and_payroll_software"
    cleaning_and_facilities = "cleaning_and_facilities"
    patient_communication = "patient_communication"
    billing_and_coding_software = "billing_and_coding_software"
    training_platforms = "training_platforms"


class ComplianceAgreement(str, Enum):
    BAA = "BAA"
    DPA = "DPA"
    both = "both"


COUNTRY_CURRENCY = {
    Country.USA: Currency.USD,
    Country.UK: Currency.GBP,
}


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1)
    country: Country
    categories: list[Category] = Field(min_length=1)
    monthly_rate: float = Field(gt=0)
    currency: Currency
    status: SupplierStatus
    compliance_agreement: ComplianceAgreement | None = None
    contract_renewal_date: str | None = None
    contact_email: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name is required")
        return cleaned

    @field_validator("contract_renewal_date")
    @classmethod
    def validate_renewal_date(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        datetime.strptime(value, "%Y-%m-%d")
        return value

    @model_validator(mode="after")
    def currency_matches_country(self) -> SupplierCreate:
        expected = COUNTRY_CURRENCY[self.country]
        if self.currency != expected:
            raise ValueError(
                f"currency must be {expected.value} when country is {self.country.value}"
            )
        return self


class SupplierResponse(SupplierCreate):
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    monthly_rate: float = Field(gt=0)


class StatusUpdate(BaseModel):
    status: SupplierStatus
