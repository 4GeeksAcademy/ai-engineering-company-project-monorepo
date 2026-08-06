"""Incident models and enums for the incidents workflow."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class IncidentCategory(str, Enum):
    """Business categories supported by TrackFlow incidents."""

    ALMACEN = "Almacen"
    ULTIMA_MILLA = "Ultima_Milla"
    LOGISTICA_INVERSA = "Logistica_Inversa"
    CX = "CX"
    COMERCIAL = "Comercial"
    TECNOLOGIA = "Tecnologia"


class IncidentStatus(str, Enum):
    """Lifecycle status for incidents."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISCARDED = "discarded"


class IncidentOrigin(str, Enum):
    """Source that originated the incident."""

    CUSTOMER = "customer"
    BRANCH = "branch"
    INTERNAL = "internal"


class IncidentBranch(str, Enum):
    """Operational branches where incidents are registered."""

    LOS_ANGELES = "Los Ángeles"
    ZARAGOZA = "Zaragoza"
    CENTRAL = "Central"


class Incident(BaseModel):
    """Incident model persisted in TinyDB and exposed by the API."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: IncidentBranch
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))