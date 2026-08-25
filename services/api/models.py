from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from constants import COUNTRY_CURRENCY, VALID_CATEGORIES


class Country(str, Enum):
    usa = "USA"
    spain = "Spain"


class Status(str, Enum):
    active = "active"
    suspended = "suspended"


class Currency(str, Enum):
    usd = "USD"
    eur = "EUR"


class SupplierBase(BaseModel):
    name: str = Field(min_length=1)
    country: Country
    categories: list[str] = Field(min_length=1)
    rate_per_shipment: float = Field(gt=0)
    currency: Currency
    status: Status
    service_zone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_business_rules(self):
        invalid_categories = [
            category
            for category in self.categories
            if category not in VALID_CATEGORIES
        ]
        if invalid_categories:
            raise ValueError(
                "Categorias invalidas: "
                + ", ".join(invalid_categories)
            )

        expected_currency = COUNTRY_CURRENCY[self.country.value]
        if self.currency.value != expected_currency:
            raise ValueError(
                f"La moneda para {self.country.value} debe ser {expected_currency}"
            )

        return self


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    updated_at: str


class RateUpdate(BaseModel):
    rate_per_shipment: float = Field(gt=0)


class StatusUpdate(BaseModel):
    status: Status
