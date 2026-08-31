from datetime import datetime
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator


Country = Literal["USA", "Spain"]

Currency = Literal["USD", "EUR"]

SupplierStatus = Literal["active", "suspended"]

SupplierCategory = Literal[
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]


class SupplierBase(BaseModel):
    name: str
    country: Country
    categories: list[SupplierCategory] = Field(min_length=1)
    rate_per_shipment: float = Field(gt=0)
    currency: Currency
    status: SupplierStatus
    service_zone: str | None = None
    contact_email: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_currency_for_country(self) -> Self:
        expected_currency = {
            "USA": "USD",
            "Spain": "EUR",
        }[self.country]

        if self.currency != expected_currency:
            raise ValueError(
                f"currency must be {expected_currency} for country {self.country}"
            )

        return self


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    updated_at: datetime


class SupplierRateUpdate(BaseModel):
    rate_per_shipment: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
    status: SupplierStatus


# ──────────────────────────────────────────────
# UserRole
# ──────────────────────────────────────────────

UserRole = Literal["admin", "manager", "user"]


# ──────────────────────────────────────────────
# User models
# ──────────────────────────────────────────────


class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole = "user"
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    role: UserRole
    created_at: datetime


class UserInDB(BaseModel):
    id: int
    email: str
    hashed_password: str
    is_active: bool
    role: UserRole
    created_at: datetime


class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None


# ──────────────────────────────────────────────
# Profile models
# ──────────────────────────────────────────────


class ProfileInDB(BaseModel):
    id: int
    user_id: int
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None


# ──────────────────────────────────────────────
# Auth models
# ──────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
