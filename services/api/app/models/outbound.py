"""StockExit domain model — Brasaland's outbound-equivalent entity.

Records ingredient stock leaving a restaurant's inventory: consumed in
kitchen prep or discarded (context.md: "Fresh ingredients selected
daily" implies spoilage/waste tracking, not just consumption). Mirrors
InboundStock's shape and FK pattern (app.models.inbound).

`user_uuid` identifies the staff member who logged the exit — a real FK
to `users.id` (retrofitted in
supabase/migrations/20261106130000_add_fk_retrofit_inbound_stock_stock_exits.sql,
once `users` moved from TinyDB to SQL). Keeps its historical name
("_uuid") even though it is an integer, not a UUID — see that
migration's comments.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlmodel import Field, SQLModel

from app.models.schemas import City, Country, ExitReason
from app.models.user_storage import users_table


class StockExit(SQLModel, table=True):
    """A single ingredient withdrawal from a Brasaland location's inventory."""

    __tablename__ = "stock_exits"

    id: int | None = Field(default=None, primary_key=True)

    # FK to the product-equivalent entity (MenuItem.id in Supabase).
    ingredient_id: int = Field(foreign_key="menu_items.id", index=True)

    quantity: float = Field(gt=0)
    unit: str = Field(default="kg", description="Unit of measure: kg, L, units, ...")
    reason: ExitReason = Field(
        default="kitchen_use", sa_column=Column(String)
    )

    # FK built from the actual Column object — see inbound.py's comment
    # on why (users lives on its own separate Core MetaData).
    user_uuid: int = Field(
        sa_column=Column(Integer, ForeignKey(users_table.c.id), index=True, nullable=False),
        description="FK to users.id — the staff member who logged this exit",
    )

    # Which restaurant location the stock left from.
    country: Country = Field(sa_column=Column(String))
    city: City | None = Field(default=None, sa_column=Column(String, nullable=True))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
