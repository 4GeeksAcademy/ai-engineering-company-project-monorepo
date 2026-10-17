"""Pydantic request/response shapes of the inventory API.

Kept apart from ``models.py`` on purpose: endpoints take and return these, never ORM objects.
``current_stock`` exists only here, in a response; no request can carry it and no table stores it.
``user_uuid`` is not an input either: it is always the authenticated user, whatever the body says.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .models import AssetCategory, ExitType, Office


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=50)
    category: AssetCategory
    office: Office

    @field_validator("name", "sku")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class AssetOut(BaseModel):
    id: int
    name: str
    sku: str
    category: AssetCategory
    office: Office
    current_stock: int  # computed from the orders on every read, never stored


class AssetEntryCreate(BaseModel):
    """Inbound order. The author and the timestamp are set by the server."""

    asset_id: int
    quantity: int = Field(gt=0)
    supplier: str = Field(min_length=1, max_length=200)
    office: Office

    @field_validator("supplier")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class AssetExitCreate(BaseModel):
    """Outbound order. ``assigned_to`` is required for an allocation and must be null for a
    consumption (business rule 3)."""

    asset_id: int
    quantity: int = Field(gt=0)
    exit_type: ExitType
    assigned_to: str | None = Field(default=None, max_length=200)
    office: Office

    @model_validator(mode="after")
    def _assigned_to_matches_exit_type(self) -> AssetExitCreate:
        self.assigned_to = _blank_to_none(self.assigned_to)
        if self.exit_type is ExitType.allocation and self.assigned_to is None:
            raise ValueError("assigned_to is required when exit_type is 'allocation'")
        if self.exit_type is ExitType.consumption and self.assigned_to is not None:
            raise ValueError("assigned_to must be null when exit_type is 'consumption'")
        return self


class AssetBrief(BaseModel):
    id: int
    name: str
    sku: str
    category: AssetCategory
    office: Office


class OrderOut(BaseModel):
    """One inbound or outbound order with its asset. ``supplier`` is set on inbound orders,
    ``exit_type``/``assigned_to`` on outbound ones."""

    type: Literal["inbound", "outbound"]
    id: int
    asset: AssetBrief
    quantity: int
    office: Office
    created_at: datetime
    user_uuid: str
    supplier: str | None = None
    exit_type: ExitType | None = None
    assigned_to: str | None = None

    @field_validator("created_at")
    @classmethod
    def _as_utc(cls, value: datetime) -> datetime:
        # SQLite hands timestamps back without a zone; they were stored as UTC.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
