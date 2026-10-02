"""Pydantic schemas for request / response contracts."""

from datetime import date, datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Health ────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Generic API response wrapper ──────────────────────────
class ApiResponse(BaseModel):
    success: bool = True
    message: str = ""
    data: dict | list | None = None


# ── Example domain models (replace with your company models) ──
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w.-]+@[\w.-]+\.\w+$")
    role: str = "member"

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Incident records ─────────────────────────────────────
class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    DISCARDED = "DISCARDED"


IncidentCategory = Literal[
    "CUSTOMER_COMPLAINT", "EQUIPMENT", "SUPPLY", "FOOD_QUALITY", "STAFF"
]


class IncidentFields(BaseModel):
    incident_id: str = Field(..., pattern=r"^BRS-\d{6}$")
    date: date
    location_id: str = Field(..., pattern=r"^(COL-(?:0[1-9]|10)|FLA-0[1-4])$")
    category: IncidentCategory
    description: str = Field(..., min_length=5)
    status: IncidentStatus
    customer_id: str | None = Field(default=None, pattern=r"^CLI-\d{6}$")
    satisfaction_score: int | None = Field(default=None, gt=0, le=5, strict=True)
    reporter_id: str = Field(..., pattern=r"^MGR-\d{2}$")

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def closed_incidents_require_score(self) -> "IncidentFields":
        if self.status is IncidentStatus.CLOSED and self.satisfaction_score is None:
            raise ValueError("Closed incidents require a satisfaction score")
        return self


class IncidentCreate(IncidentFields):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class IncidentResponse(IncidentFields):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# Backward-compatible name for code that uses Incident as the input schema.
Incident = IncidentCreate


# ── Brasa Points registration ────────────────────────────
Country = Literal["Colombia", "United States"]
City = Literal["Medellín", "Bogotá", "Cali", "Miami", "Orlando"]
DietaryPreference = Literal["No restrictions", "Vegetarian", "Gluten-free", "Other"]
ReferralSource = Literal[
    "Social media", "Recommendation", "Walked by", "Internet search", "Other"
]


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


ProductCategory = Literal[
    "Meat", "Produce", "Beverages", "Dairy", "Seafood", "Spices", "Other"
]

LOCATIONS_BY_CITY: dict[tuple[Country, City], set[str]] = {
    ("Colombia", "Medellín"): {
        "Brasaland El Poblado",
        "Brasaland Laureles",
        "Brasaland Envigado",
        "Brasaland Sabaneta",
    },
    ("Colombia", "Bogotá"): {
        "Brasaland Usaquén",
        "Brasaland Chapinero",
        "Brasaland Zona Rosa",
    },
    ("Colombia", "Cali"): {
        "Brasaland Granada",
        "Brasaland Ciudad Jardín",
        "Brasaland Unicentro",
    },
    ("United States", "Miami"): {
        "Brasaland Brickell",
        "Brasaland Coral Gables",
    },
    ("United States", "Orlando"): {
        "Brasaland Downtown",
        "Brasaland International Drive",
    },
}


class SupplierFields(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., pattern=r"^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$")
    phone: str = Field(..., pattern=r"^\+[1-9]\d{0,2}(?: \d+)+$")
    country: Country
    city: City
    favorite_location: str | None = None
    dietary_preferences: list[DietaryPreference] = Field(default_factory=list)
    how_did_you_find_us: ReferralSource
    date_of_birth: date
    accepts_terms: Literal[True]
    wants_email_offers: bool = False
    product_category: ProductCategory = "Other"
    rate: float = Field(..., gt=0, description="Supplier rate (must be > 0)")
    status: SupplierStatus = SupplierStatus.ACTIVE

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_registration(self) -> "SupplierFields":
        if len(self.full_name.split()) < 2:
            raise ValueError("Enter your full name (first and last name)")

        country_codes = {"Colombia": "+57", "United States": "+1"}
        if not self.phone.startswith(country_codes[self.country] + " "):
            raise ValueError("Phone country code must match the selected country")

        valid_cities: dict[Country, set[City]] = {
            "Colombia": {"Medellín", "Bogotá", "Cali"},
            "United States": {"Miami", "Orlando"},
        }
        if self.city not in valid_cities[self.country]:
            raise ValueError("City must be available in the selected country")

        if self.favorite_location is not None and self.favorite_location not in LOCATIONS_BY_CITY[
            (self.country, self.city)
        ]:
            raise ValueError("Favorite location must match the selected country and city")

        today = date.today()
        age = today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
        if age < 18:
            raise ValueError("You must be 18 or older to register for Brasa Points")

        return self


class SupplierCreate(SupplierFields):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class SupplierResponse(SupplierFields):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


class SupplierRateUpdate(BaseModel):
    rate: float = Field(..., gt=0, description="New rate for the supplier (must be > 0)")

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class SupplierStatusUpdate(BaseModel):
    status: SupplierStatus = Field(..., description="New status: active or suspended")

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# Backward-compatible name for code that uses Supplier as the input schema.
Supplier = SupplierCreate
