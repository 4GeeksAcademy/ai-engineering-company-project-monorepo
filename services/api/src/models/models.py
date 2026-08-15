"""SQLModel table models for the warehouse inventory system (SKU, entries, exits).

These models represent the core logistic entities and are persisted in
Supabase (PostgreSQL).  The schema is created automatically via
``SQLModel.metadata.create_all(engine)`` at the bottom of this module.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel

from src.database import engine


# ── helpers ──────────────────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid4())


# ── SKU (product) ────────────────────────────────────────────────────────


class SKU(SQLModel, table=True):
    """Product SKU tracked in the warehouse.

    This table intentionally has **no** stock / quantity column — all
    inventory movements are recorded as entries (SKUEntry) and exits
    (SKUExit) and the balance is computed dynamically.
    """

    __tablename__ = "sku"

    id: str = Field(default_factory=_new_uuid, primary_key=True)
    name: str = Field(max_length=200, nullable=False)
    sku_code: str = Field(max_length=100, nullable=False, unique=True)
    warehouse: str = Field(
        max_length=50,
        nullable=False,
        description="Allowed values: 'Los Angeles' or 'Zaragoza'",
    )


# ── SKUEntry (inbound orders) ────────────────────────────────────────────


class SKUEntry(SQLModel, table=True):
    """Inbound order — records stock that enters a warehouse."""

    __tablename__ = "sku_entries"

    id: str = Field(default_factory=_new_uuid, primary_key=True)
    sku_id: str = Field(
        foreign_key="sku.id",
        nullable=False,
        index=True,
    )
    quantity: int = Field(
        nullable=False,
        ge=1,
        description="Positive integer — units received",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    user_uuid: str = Field(
        max_length=100,
        nullable=False,
        description="TinyDB user identifier (non-relational reference)",
    )


# ── SKUExit (outbound orders) ────────────────────────────────────────────


class SKUExit(SQLModel, table=True):
    """Outbound order — records stock that leaves a warehouse."""

    __tablename__ = "sku_exits"

    id: str = Field(default_factory=_new_uuid, primary_key=True)
    sku_id: str = Field(
        foreign_key="sku.id",
        nullable=False,
        index=True,
    )
    quantity: int = Field(
        nullable=False,
        ge=1,
        description="Positive integer — units dispatched",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    user_uuid: str = Field(
        max_length=100,
        nullable=False,
        description="TinyDB user identifier (non-relational reference)",
    )


# ── Schema initialisation ────────────────────────────────────────────────

SQLModel.metadata.create_all(engine)