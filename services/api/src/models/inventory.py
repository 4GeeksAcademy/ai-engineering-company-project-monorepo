"""Inventory and product models for warehouse management in TrackFlow."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class WarehouseLocation(str, Enum):
    """Warehouse locations available in TrackFlow."""

    CENTRAL = "Central"
    ZARAGOZA = "Zaragoza"
    LOS_ANGELES = "Los Ángeles"


class ProductCategory(str, Enum):
    """Product categories available in TrackFlow."""

    ELECTRONICA = "Electrónica"
    ROPA = "Ropa"
    ALIMENTACION = "Alimentación"
    HOGAR = "Hogar"
    OTROS = "Otros"


class StockMovementType(str, Enum):
    """Types of stock movements."""

    INBOUND = "inbound"
    OUTBOUND = "outbound"
    RESERVATION = "reservation"
    RELEASE = "release"
    ADJUSTMENT = "adjustment"


class ProductCreate(BaseModel):
    """Input model to create a new product."""

    nombre: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=50)
    descripcion: str = Field(default="", max_length=500)
    cantidad: int = Field(ge=0, default=0)
    precio: float = Field(ge=0, default=0.0)
    categoria: ProductCategory = ProductCategory.OTROS
    ubicacion: WarehouseLocation = WarehouseLocation.CENTRAL
    stock_minimo: int = Field(ge=0, default=10)


class Product(ProductCreate):
    """Product model persisted in TinyDB and exposed by the API."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockReservation(BaseModel):
    """Stock reservation model for pending orders."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    product_id: str
    sku: str
    cantidad: int = Field(gt=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime | None = None


class StockMovement(BaseModel):
    """Record of a stock movement operation."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    product_id: str
    sku: str
    tipo: StockMovementType
    cantidad: int = Field(gt=0)
    motivo: str = Field(default="", max_length=300)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))