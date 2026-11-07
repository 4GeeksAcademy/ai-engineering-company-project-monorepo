"""Pydantic schemas for request / response contracts."""

from datetime import date, datetime, timezone
from enum import Enum
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, model_validator

T = TypeVar("T")


# ── Health ────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Generic API response wrappers ─────────────────────────
# ApiResponse[T] keeps the existing {success, message, data} envelope but
# makes `data`'s shape an explicit, validated part of each route's
# response_model instead of an untyped dict|list — see
# docs/serialization-audit.md. DataEnvelope/PaginatedResponse cover the two
# other envelope shapes already relied on by the frontend (no
# success/message wrapper): plain `{data}` and `{data, total, page, limit}`.
class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = ""
    data: T | None = None


class DataEnvelope(BaseModel, Generic[T]):
    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int
    page: int
    limit: int


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


# ── Incident Manager ──────────────────────────────────────
class IncidentOrigin(str, Enum):
    CUSTOMER = "customer"
    BRANCH = "branch"
    HEADQUARTERS = "headquarters"


class IncidentStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISCARDED = "discarded"


IncidentCategory = Literal[
    "CUSTOMER_COMPLAINT", "EQUIPMENT", "SUPPLY", "FOOD_QUALITY", "STAFF"
]

# Legal lifecycle transitions: open -> in_progress -> resolved, discarded reachable from either.
INCIDENT_STATUS_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.IN_PROGRESS, IncidentStatus.DISCARDED},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.RESOLVED, IncidentStatus.DISCARDED},
    IncidentStatus.RESOLVED: set(),
    IncidentStatus.DISCARDED: set(),
}


class IncidentFields(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=5)
    category: IncidentCategory
    status: IncidentStatus = IncidentStatus.OPEN
    origin: IncidentOrigin
    branch: str = Field(..., min_length=1)
    # Legacy fields carried over from the CSV incident-report model (incidents-context.md).
    # Optional here because manually-logged incidents (form submissions) won't have them.
    customer_id: str | None = Field(default=None, pattern=r"^CLI-\d{6}$")
    satisfaction_score: int | None = Field(default=None, ge=1, le=5)
    reporter_id: str | None = Field(default=None, pattern=r"^MGR-\d{2}$")
    incident_date: date | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def resolved_incidents_require_score(self) -> "IncidentFields":
        if self.status is IncidentStatus.RESOLVED and self.satisfaction_score is None:
            raise ValueError("Resolved incidents require a satisfaction score")
        return self


class IncidentCreate(IncidentFields):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=5)
    category: IncidentCategory | None = None
    branch: str | None = Field(default=None, min_length=1)
    customer_id: str | None = Field(default=None, pattern=r"^CLI-\d{6}$")
    reporter_id: str | None = Field(default=None, pattern=r"^MGR-\d{2}$")

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    satisfaction_score: int | None = Field(default=None, ge=1, le=5)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class IncidentResponse(IncidentFields):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# Backward-compatible name for code that uses Incident as the input schema.
Incident = IncidentCreate


class IncidentMetricsResponse(BaseModel):
    total: int
    status_counts: dict[str, int]
    category_counts: dict[str, int]
    branch_counts: dict[str, int]
    origin_counts: dict[str, int]
    avg_satisfaction_score: float | None
    avg_resolution_seconds: float | None


class InvalidBreakdownEntry(BaseModel):
    rule: str
    label: str
    count: int


class CategoryBreakdownEntry(BaseModel):
    category: str
    count: int
    percentage: float


class StatusBreakdownEntry(BaseModel):
    status: str
    count: int
    percentage: float


class ScoreDistributionEntry(BaseModel):
    score: int
    label: str
    count: int


class SatisfactionIndex(BaseModel):
    total_closed: int
    scored_cases: int
    average_score: float
    score_distribution: list[ScoreDistributionEntry]


class AnalyzeSummaryResponse(BaseModel):
    total_records: int
    valid_records: int
    invalid_records: int
    persisted_records: int
    invalid_breakdown: list[InvalidBreakdownEntry]
    category_breakdown: list[CategoryBreakdownEntry]
    status_breakdown: list[StatusBreakdownEntry]
    satisfaction_index: SatisfactionIndex
    note: str | None = None


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

# "waste" was replaced by its 3 specific causes (docs/mandatory_metrics.md's
# stock_waste_registered event requires one of expired/kitchen_error/
# theft_suspected, not a generic "waste" bucket — see docs/event-envelope.md
# section 6 and the Phase 3 telemetry gap report). No existing StockExit row
# used "waste" at the time of this change (verified against the dev DB).
ExitReason = Literal["kitchen_use", "transfer", "other", "expired", "kitchen_error", "theft_suspected"]

CITIES_BY_COUNTRY: dict[Country, set[City]] = {
    "Colombia": {"Medellín", "Bogotá", "Cali"},
    "United States": {"Miami", "Orlando"},
}

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


# ── Candidate Records (Hiring Pipeline) ──────────────────
class CandidateStatus(str, Enum):
    RECEIVED = "received"
    IN_PROGRESS = "in_progress"
    SELECTED = "selected"
    DISCARDED = "discarded"


class CandidateStage(str, Enum):
    PENDING = "pending"
    REVIEW = "review"
    PERSONAL_INTERVIEW = "personal_interview"
    TECHNICAL_INTERVIEW = "technical_interview"
    OFFER_PRESENTED = "offer_presented"


class RecordCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str = Field(..., pattern=r"^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$")
    phone: str = Field(..., min_length=1)
    position: str = Field(..., min_length=1)
    linkedin_url: str | None = None
    cv_url: str | None = None
    experience_years: int = Field(..., ge=0)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class RecordUpdate(RecordCreate):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class RecordPatch(BaseModel):
    status: CandidateStatus | None = None
    stage: CandidateStage | None = None

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class CandidateNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class CandidateNote(BaseModel):
    id: str
    record_id: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotesMeta(BaseModel):
    total: int


class NotesListResponse(BaseModel):
    data: list[CandidateNote]
    meta: NotesMeta


class CandidateResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    position: str
    linkedin_url: str | None
    cv_url: str | None
    status: CandidateStatus
    stage: CandidateStage
    experience_years: int
    notes_count: int
    applied_at: datetime
    updated_at: datetime
    notes: list[CandidateNote] = Field(default_factory=list)


# ── Menu Item (product-equivalent entity — Supabase) ─────
# Request/response contracts for app.models.menu_item.MenuItem.
class MenuItemFields(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    category: ProductCategory = "Other"
    country: Country
    city: City | None = None
    price_cop: float = Field(..., gt=0)
    price_usd: float = Field(..., gt=0)
    dietary_preferences: list[DietaryPreference] = Field(default_factory=list)
    is_available: bool = True
    minimum_stock: float = Field(
        default=5.0,
        gt=0,
        description=(
            "Threshold below which stock_threshold_triggered fires on an "
            "outbound order (docs/event-schemas.json). Defaults to a flat "
            "5 for every product until adjusted via PATCH /products/{id} — "
            "a per-product business decision, not derived from any other "
            "field."
        ),
    )

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_city_matches_country(self) -> "MenuItemFields":
        if self.city is not None and self.city not in CITIES_BY_COUNTRY[self.country]:
            raise ValueError("City must be available in the selected country")
        return self


class MenuItemCreate(MenuItemFields):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class MenuItemUpdate(BaseModel):
    """PATCH /inventory/products/{id} — only the minimum-stock threshold is
    editable today (the minimal "adjust the threshold" capability the
    stock_threshold_triggered event's own decision requires)."""

    minimum_stock: float = Field(..., gt=0)

    model_config = ConfigDict(extra="forbid")


class MenuItemResponse(MenuItemFields):
    id: int
    created_at: datetime
    updated_at: datetime
    current_stock: float = Field(
        ...,
        description=(
            "Computed at read time as sum(InboundStock.quantity) - "
            "sum(StockExit.quantity) for this ingredient_id. Not a column "
            "on menu_items — never persisted, always derived."
        ),
    )

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# ── Inbound Stock (ingredient receipts — Supabase) ───────
# Request/response contracts for app.models.inbound.InboundStock.
# Standalone Pydantic models: the API layer never serializes the ORM
# model directly, so router/db shape can evolve independently.
class InboundStockFields(BaseModel):
    # No user_uuid here: it is never client-supplied, the router sets it
    # from the authenticated user (TinyDB id) — see app.routers.inventory.
    ingredient_id: int = Field(..., gt=0, description="MenuItem.id this delivery replenishes")
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="kg", min_length=1)
    supplier_id: int | None = Field(default=None, description="FK to suppliers.id")
    country: Country
    city: City | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_city_matches_country(self) -> "InboundStockFields":
        if self.city is not None and self.city not in CITIES_BY_COUNTRY[self.country]:
            raise ValueError("City must be available in the selected country")
        return self


class InboundStockCreate(InboundStockFields):
    # unit_cost lives here (required), not on the shared InboundStockFields
    # base: pre-existing rows have no cost on file (the column was added
    # after they were created) and must stay nullable in the response —
    # see InboundStockResponse below. Every NEW order must specify it.
    unit_cost: float = Field(
        ...,
        gt=0,
        description="Cost paid per unit, in the order's local currency (COP for Colombia, USD for US).",
    )

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class InboundStockResponse(InboundStockFields):
    id: int
    user_uuid: int = Field(..., description="FK to users.id — the authenticated user who logged the receipt")
    created_at: datetime
    unit_cost: float | None = Field(
        default=None, description="Null for deliveries logged before this field existed."
    )
    unit_cost_historical: float | None = Field(
        default=None,
        description=(
            "Average unit_cost of the last 5 prior deliveries for the same "
            "product+supplier. Null when there is no supplier_id on this "
            "order, or no prior delivery exists for that product+supplier "
            "to compare against — never guessed."
        ),
    )
    variance_pct: float | None = Field(
        default=None, description="(unit_cost - unit_cost_historical) / unit_cost_historical * 100."
    )
    price_variance_detected: bool = Field(
        default=False,
        description="True when abs(variance_pct) >= 10 (docs/event-schemas.json variance_threshold_pct).",
    )

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# ── Outbound Stock (ingredient exits — Supabase) ─────────
# Request/response contracts for app.models.outbound.StockExit.
class StockExitFields(BaseModel):
    # No user_uuid here: it is never client-supplied, the router sets it
    # from the authenticated user (TinyDB id) — see app.routers.inventory.
    ingredient_id: int = Field(..., gt=0, description="MenuItem.id this withdrawal is taken from")
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="kg", min_length=1)
    reason: ExitReason = "kitchen_use"
    country: Country
    city: City | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_city_matches_country(self) -> "StockExitFields":
        if self.city is not None and self.city not in CITIES_BY_COUNTRY[self.country]:
            raise ValueError("City must be available in the selected country")
        return self


class StockExitCreate(StockExitFields):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class StockExitResponse(StockExitFields):
    id: int
    user_uuid: int = Field(..., description="FK to users.id — the authenticated user who logged the exit")
    created_at: datetime
    minimum_stock: float = Field(..., description="The product's configured threshold at the time of this exit.")
    current_stock_after: float = Field(..., description="current_stock immediately after this withdrawal.")
    threshold_crossed: bool = Field(
        default=False,
        description=(
            "True only on the transition: stock was >= minimum_stock before "
            "this withdrawal and is < minimum_stock after it. Repeated "
            "withdrawals while already below the threshold do not re-fire."
        ),
    )

    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# ── Orders (unified inbound + outbound feed) ─────────────
# Combines InboundStock/StockExit rows with the MenuItem they reference,
# for a single GET /inventory/orders listing.
OrderType = Literal["inbound", "outbound"]


class OrderResponse(BaseModel):
    id: int
    order_type: OrderType
    ingredient_id: int
    product_name: str
    product_sku: str
    quantity: float
    unit: str
    user_uuid: int
    country: Country
    city: City | None
    created_at: datetime
    # Present only for the matching order_type.
    supplier_id: int | None = None
    reason: ExitReason | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    model_config = ConfigDict(from_attributes=True)
