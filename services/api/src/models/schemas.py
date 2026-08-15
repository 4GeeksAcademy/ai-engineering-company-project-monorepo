"""Pydantic schemas for the warehouse inventory API.

All models are pure Pydantic — completely independent from the SQLModel
ORM tables in ``models.py``.  Request schemas (``Create``) define the
payload the client sends; response schemas (``Read``) define what the API
returns, including the computed ``current_stock`` for SKU.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── SKU ──────────────────────────────────────────────────────────────────


class SKUCreate(BaseModel):
    """Payload to create a new product SKU."""

    name: str = Field(
        min_length=1,
        max_length=200,
        description="Product display name",
    )
    sku_code: str = Field(
        min_length=1,
        max_length=100,
        description="Unique SKU code (e.g. 'WH-LA-001')",
    )
    warehouse: str = Field(
        min_length=1,
        max_length=50,
        description="Warehouse location: 'Los Angeles' or 'Zaragoza'",
    )


class SKURead(BaseModel):
    """SKU data returned by the API, including the computed stock balance."""

    id: str
    name: str
    sku_code: str
    warehouse: str
    current_stock: int = Field(
        default=0,
        ge=0,
        description="Computed stock (total entries − total exits). "
        "Not stored in the database; calculated at query time.",
    )


# ── SKUEntry (inbound orders) ────────────────────────────────────────────


class SKUEntryCreate(BaseModel):
    """Payload to record an inbound stock movement."""

    sku_id: str = Field(
        min_length=1,
        description="Foreign key referencing the SKU id",
    )
    quantity: int = Field(
        ge=1,
        description="Number of units received (positive integer)",
    )
    user_uuid: str = Field(
        min_length=1,
        max_length=100,
        description="TinyDB user identifier that performed the entry",
    )


class SKUEntryRead(BaseModel):
    """Inbound order data returned by the API."""

    id: str
    sku_id: str
    quantity: int
    created_at: datetime
    user_uuid: str


# ── SKUExit (outbound orders) ────────────────────────────────────────────


class SKUExitCreate(BaseModel):
    """Payload to record an outbound stock movement."""

    sku_id: str = Field(
        min_length=1,
        description="Foreign key referencing the SKU id",
    )
    quantity: int = Field(
        ge=1,
        description="Number of units dispatched (positive integer)",
    )
    user_uuid: str = Field(
        min_length=1,
        max_length=100,
        description="TinyDB user identifier that performed the exit",
    )


class SKUExitRead(BaseModel):
    """Outbound order data returned by the API."""

    id: str
    sku_id: str
    quantity: int
    created_at: datetime
    user_uuid: str