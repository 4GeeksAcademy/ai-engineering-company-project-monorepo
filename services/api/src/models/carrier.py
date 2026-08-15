"""Carrier assignment and shipment models for TrackFlow logistics."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class CarrierStatus(str, Enum):
    """Operational status of a transport carrier."""

    DISPONIBLE = "Disponible"
    EN_RUTA = "En ruta"
    INACTIVO = "Inactivo"


class PackageSize(str, Enum):
    """Package size categories affecting shipping costs."""

    PEQUENO = "Pequeño"
    MEDIANO = "Mediano"
    GRANDE = "Grande"


class ShipmentPriority(str, Enum):
    """Priority levels for shipments."""

    BAJA = "baja"
    NORMAL = "normal"
    ALTA = "alta"
    URGENTE = "urgente"


class Carrier(BaseModel):
    """Carrier model representing a transport provider."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    nombre: str = Field(min_length=1, max_length=100)
    tarifa_kg: float = Field(gt=0)
    capacidad_kg: float = Field(gt=0)
    peso_actual_kg: float = Field(ge=0, default=0)
    estado: CarrierStatus = CarrierStatus.DISPONIBLE
    regiones: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def peso_disponible(self) -> float:
        """Return the remaining weight capacity."""
        return self.capacidad_kg - self.peso_actual_kg

    def puede_asignar(self, peso_paquete_kg: float) -> bool:
        """Check if the carrier can take a package of the given weight."""
        if self.estado != CarrierStatus.DISPONIBLE:
            return False
        return self.peso_disponible() >= peso_paquete_kg


class ShipmentRequest(BaseModel):
    """Input model to request a carrier assignment."""

    carrier_id: str
    peso_kg: float = Field(gt=0)
    dimensiones: str = Field(default="", max_length=200)
    origen: str = Field(min_length=1, max_length=200)
    destino: str = Field(min_length=1, max_length=200)
    prioridad: ShipmentPriority = ShipmentPriority.NORMAL


class CarrierAssignment(BaseModel):
    """Result model for a completed carrier assignment."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    carrier_id: str
    carrier_nombre: str
    peso_kg: float
    origen: str
    destino: str
    prioridad: ShipmentPriority
    coste_envio: float
    estado: str = "asignado"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))