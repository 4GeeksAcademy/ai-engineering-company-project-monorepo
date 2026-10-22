from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Literal
from uuid import UUID, uuid4

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class IncidentStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    discarded = "discarded"


IncidentCategory = Literal[
    "lost_parcel",
    "delivery_failure",
    "inventory_discrepancy",
    "carrier_issue",
    "returns_issue",
    "warehouse_incident",
    "system_failure",
    "client_complaint",
    "other",
]
IncidentOrigin = Literal["customer", "branch", "internal"]
IncidentBranch = Literal[
    "central",
    "la_warehouse",
    "la_office",
    "zaragoza_warehouse",
    "zaragoza_office",
]


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: IncidentCategory
    status: IncidentStatus = IncidentStatus.open
    origin: IncidentOrigin
    branch: IncidentBranch

    @field_validator("title", "description")
    @classmethod
    def validate_incident_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("El texto no puede estar vacio ni contener solo espacios.")
        return value


class IncidentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus


class Incident(IncidentCreate):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    id: UUID = Field(default_factory=uuid4, frozen=True)
    created_at: AwareDatetime = Field(default_factory=lambda: datetime.now(timezone.utc), frozen=True)
    updated_at: AwareDatetime = Field(default_factory=lambda data: data["created_at"])

    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name in IncidentCreate.model_fields:
            super().__setattr__("updated_at", datetime.now(timezone.utc))


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


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class NewPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contrasena no puede superar 72 bytes UTF-8.")
        return value


class ResetPasswordRequest(NewPasswordRequest):
    token: str


class ChangePasswordRequest(NewPasswordRequest):
    current_password: str


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