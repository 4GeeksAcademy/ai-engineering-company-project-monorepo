from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

VALID_COUNTRIES = ["Colombia", "USA"]

VALID_CATEGORIES = [
    "carne",
    "verduras_y_hortalizas",
    "salsas_y_condimentos",
    "bebidas",
    "packaging",
    "productos_limpieza",
    "lacteos",
    "carbon_y_combustible",
]

VALID_STATUSES = ["active", "suspended"]

CURRENCY_BY_COUNTRY = {"Colombia": "COP", "USA": "USD"}

Country = Literal["Colombia", "USA"]
Currency = Literal["COP", "USD"]
Category = Literal[
    "carne",
    "verduras_y_hortalizas",
    "salsas_y_condimentos",
    "bebidas",
    "packaging",
    "productos_limpieza",
    "lacteos",
    "carbon_y_combustible",
]
Status = Literal["active", "suspended"]


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    country: Country
    categories: list[Category] = Field(min_length=1)
    rate_per_unit: float = Field(gt=0)
    currency: Currency
    status: Status
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("categories")
    @classmethod
    def unique_categories(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def currency_matches_country(self) -> "SupplierCreate":
        expected = CURRENCY_BY_COUNTRY[self.country]
        if self.currency != expected:
            raise ValueError(
                f"Suppliers from {self.country} must use currency {expected}."
            )
        return self


class Supplier(SupplierCreate):
    model_config = ConfigDict(extra="ignore")

    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_unit: float = Field(gt=0)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Status
