"""SQLModel table models for Supabase (PostgreSQL) persistence.

These models mirror the existing Pydantic domain models but use SQLModel's
table=True so that SQLAlchemy can manage schema creation and CRUD operations
against the Supabase PostgreSQL database.  They coexist with the TinyDB-based
models used for authentication (users / profiles).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


# ── Reusable type helpers ────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid4())


# ── Incident SQLModel table ──────────────────────────────────────────────


class IncidentTable(SQLModel, table=True):
    """SQLModel table mirroring the Incident domain model."""

    __tablename__ = "incidents"

    id: str = Field(default_factory=_new_uuid, primary_key=True)
    title: str = Field(max_length=160, nullable=False)
    description: str = Field(nullable=False)
    category: str = Field(max_length=50, nullable=False)
    status: str = Field(max_length=20, nullable=False, default="open")
    origin: str = Field(max_length=20, nullable=False)
    branch: str = Field(max_length=50, nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


# ── Supplier SQLModel table ──────────────────────────────────────────────


class SupplierTable(SQLModel, table=True):
    """SQLModel table mirroring the Supplier domain model."""

    __tablename__ = "suppliers"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=200, nullable=False)
    pais: str = Field(max_length=100, nullable=False)
    categorias: str = Field(
        max_length=500, nullable=False
    )  # JSON array stored as text
    tarifa: Decimal = Field(max_digits=12, decimal_places=2, nullable=False)
    estado: str = Field(max_length=30, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


# ── User SQLModel table ──────────────────────────────────────────────────


class UserTable(SQLModel, table=True):
    """SQLModel table mirroring the User domain model for Supabase."""

    __tablename__ = "users_supabase"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(max_length=254, nullable=False, unique=True)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    role: str = Field(max_length=20, nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)


# ── Profile SQLModel table ───────────────────────────────────────────────


class ProfileTable(SQLModel, table=True):
    """SQLModel table mirroring the Profile domain model for Supabase."""

    __tablename__ = "profiles_supabase"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(nullable=False, index=True)
    name: str = Field(max_length=200, nullable=False)
    phone: str = Field(max_length=30, nullable=False)
    address: str = Field(max_length=300, nullable=False)