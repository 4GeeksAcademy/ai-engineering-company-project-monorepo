from datetime import datetime
from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class SupplierStatus(str, Enum):
    active = "active"
    suspended = "suspended"


Category = Literal[
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]
Country = Literal["USA", "Spain"]
PositiveRate = Annotated[float, Field(gt=0, allow_inf_nan=False)]


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1)
    country: Country
    categories: list[Category] = Field(min_length=1)
    rate_per_shipment: PositiveRate
    currency: Literal["USD", "EUR"]
    status: SupplierStatus
    service_zone: str | None = None
    contact_email: EmailStr | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_currency(self) -> "SupplierCreate":
        expected = "USD" if self.country == "USA" else "EUR"
        if self.currency != expected:
            raise ValueError(f"{self.country} requiere currency={expected}")
        return self


class Supplier(SupplierCreate):
    updated_at: datetime


class SupplierResponse(Supplier):
    id: int


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rate_per_shipment: PositiveRate


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: SupplierStatus


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = Field(default=None, min_length=1)
    phone: str | None = None
    address: str | None = None


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: UserRole | None = None


class User(BaseModel):
    id: int
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    role: UserRole = UserRole.user
    created_at: datetime


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime


class Profile(BaseModel):
    id: int
    user_id: int
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1)
    phone: str | None = None
    address: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class AuthMeResponse(BaseModel):
    email: EmailStr
    role: UserRole
    profile: Profile | None