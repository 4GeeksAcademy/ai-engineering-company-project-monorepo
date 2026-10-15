"""ORM tables of the inventory domain (SQLModel), stored in Supabase/PostgreSQL.

Three tables and nothing else:

* ``assets``        the catalogue. **No stock column**: stock is derived from the orders.
* ``asset_entries`` inbound orders (a purchase or delivery received). They add stock.
* ``asset_exits``   outbound orders (an allocation or a consumption). They remove stock.

The only way to change an asset's stock is to insert a row in one of the two order tables.
Orders point to their author with ``user_uuid``, the ``User.id`` kept in TinyDB. There is no
users table here and no foreign key on that column (README, "Storage rule").

These classes are persistence only. Request/response shapes live in ``schemas.py``: an ORM
object is never returned from an endpoint.
"""

from datetime import datetime, timezone
from enum import Enum

from sqlmodel import CheckConstraint, DateTime, Field, SQLModel


class Office(str, Enum):
    valencia = "Valencia"
    miami = "Miami"


class AssetCategory(str, Enum):
    hardware = "hardware"
    peripherals = "peripherals"
    office_supplies = "office_supplies"
    training_materials = "training_materials"


class ExitType(str, Enum):
    allocation = "allocation"  # assigned to an employee
    consumption = "consumption"  # used up (paper, ...)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Asset(SQLModel, table=True):
    __tablename__ = "assets"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    sku: str = Field(unique=True, index=True)
    category: str
    office: str


class AssetEntry(SQLModel, table=True):
    """Inbound order: ``quantity`` units of an asset received from ``supplier``."""

    __tablename__ = "asset_entries"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_asset_entries_quantity_positive"),)

    id: int | None = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    quantity: int
    supplier: str
    office: str
    created_at: datetime = Field(default_factory=_utcnow, sa_type=DateTime(timezone=True))
    user_uuid: str = Field(index=True)  # TinyDB User.id; deliberately not a foreign key


class AssetExit(SQLModel, table=True):
    """Outbound order: ``quantity`` units handed out or consumed."""

    __tablename__ = "asset_exits"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_asset_exits_quantity_positive"),
        CheckConstraint(
            "(exit_type = 'allocation' AND assigned_to IS NOT NULL)"
            " OR (exit_type = 'consumption' AND assigned_to IS NULL)",
            name="ck_asset_exits_assigned_to_matches_type",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    quantity: int
    exit_type: str
    assigned_to: str | None = None
    office: str
    created_at: datetime = Field(default_factory=_utcnow, sa_type=DateTime(timezone=True))
    user_uuid: str = Field(index=True)  # TinyDB User.id; deliberately not a foreign key
