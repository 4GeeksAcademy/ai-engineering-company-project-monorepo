# services/api/models/incident.py
#
# Modelo Pydantic para el gestor de incidencias centralizado de TrackFlow.
# Define la estructura exacta de datos con restricciones de integridad.
# Las constantes de validaci├│n coinciden EXACTAMENTE con CONTEXT-trackflow.
#
# Ciclo de vida: open -> in_progress -> resolved|discarded
#   - resolved y discarded son estados FINALES

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, field_validator

# --- Constantes del CONTEXT-trackflow (NO MODIFICAR) ----------

VALID_STATUSES = {"open", "in_progress", "resolved", "discarded"}
VALID_ORIGINS = {"customer", "branch", "internal"}
VALID_CATEGORIES = {
    "lost_parcel", "delivery_failure", "inventory_discrepancy",
    "carrier_issue", "returns_issue", "system_failure",
    "client_complaint", "other",
}
VALID_BRANCHES = {
    "central", "la_warehouse", "la_office",
    "zaragoza_warehouse", "zaragoza_office",
}

STATUS_TRANSITIONS = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),
    "discarded": set(),
}

STATUS_FINAL = {"resolved", "discarded"}


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(...)
    origin: str = Field(...)
    branch: str = Field(...)
    status: str = Field(default="open")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(
                f"Categor├¡a inv├ílida: '{v}'. V├ílidas: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        return v

    @field_validator("origin")
    @classmethod
    def validate_origin(cls, v: str) -> str:
        if v not in VALID_ORIGINS:
            raise ValueError(
                f"Origen inv├ílido: '{v}'. V├ílidos: {', '.join(sorted(VALID_ORIGINS))}"
            )
        return v

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, v: str) -> str:
        if v not in VALID_BRANCHES:
            raise ValueError(
                f"Sede inv├ílida: '{v}'. V├ílidas: {', '.join(sorted(VALID_BRANCHES))}"
            )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(
                f"Estado inv├ílido: '{v}'. V├ílidos: {', '.join(sorted(VALID_STATUSES))}"
            )
        return v


class IncidentUpdateStatus(BaseModel):
    status: str = Field(...)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(
                f"Estado inv├ílido: '{v}'. V├ílidos: {', '.join(sorted(VALID_STATUSES))}"
            )
        return v


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: str
    updated_at: str


class SummaryResponse(BaseModel):
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]