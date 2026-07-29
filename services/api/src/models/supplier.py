"""Supplier models and enums for the providers directory."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class SupplierCategory(str, Enum):
    """Business service categories offered by TrackFlow."""

    GESTION_ALMACENES = "Gestión de almacenes"
    ULTIMA_MILLA = "Entregas de última milla"
    LOGISTICA_INVERSA = "Logística inversa"


class SupplierCountry(str, Enum):
    """Countries where suppliers operate."""

    ESTADOS_UNIDOS = "Estados Unidos"
    ESPANA = "España"


class SupplierStatus(str, Enum):
    """Current supplier status."""

    ACTIVO = "Activo"
    SUSPENDIDO = "Suspendido"


class SupplierCreate(BaseModel):
    """Input model to create or update suppliers."""

    nombre: str
    pais: SupplierCountry
    categorias: list[SupplierCategory]
    tarifa: float = Field(gt=0)
    estado: SupplierStatus


class SupplierResponse(SupplierCreate):
    """Output model returned by the API."""

    id: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupplierRateUpdate(BaseModel):
    """Request payload for supplier rate updates."""

    tarifa: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
    """Request payload for supplier status updates."""

    estado: SupplierStatus
