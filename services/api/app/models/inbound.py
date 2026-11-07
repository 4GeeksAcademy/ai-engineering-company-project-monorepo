"""InboundStock domain model — Brasaland's inbound-equivalent entity.

Records a delivery of ingredients received at a restaurant from a
supplier (context.md: "Fresh ingredients selected daily"). Each row
links back to the MenuItem the stock replenishes.

`user_uuid` identifies the staff member who logged the receipt — a real
FK to `users.id` (retrofitted in
supabase/migrations/20261106130000_add_fk_retrofit_inbound_stock_stock_exits.sql,
once `users` moved from TinyDB to SQL). Keeps its historical name
("_uuid") even though it is an integer, not a UUID, to avoid rippling
the rename across app code/tests for no functional gain — see that
migration's comments.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlmodel import Field, SQLModel

from app.models.schemas import City, Country
from app.models.supplier_storage import suppliers_table
from app.models.user_storage import users_table


class InboundStock(SQLModel, table=True):
    """A single ingredient delivery received at a Brasaland location."""

    __tablename__ = "inbound_stock"

    id: int | None = Field(default=None, primary_key=True)

    # FK to the product-equivalent entity (MenuItem.id in Supabase).
    ingredient_id: int = Field(foreign_key="menu_items.id", index=True)

    quantity: float = Field(gt=0)
    unit: str = Field(default="kg", description="Unit of measure: kg, L, units, ...")
    unit_cost: float | None = Field(
        default=None,
        description=(
            "Cost paid per unit, in the order's local currency. Nullable "
            "at the DB level only for rows created before this column "
            "existed — the API requires it on every new order."
        ),
    )

    # Who supplied and who logged the delivery. FKs built from the actual
    # Column objects (not SQLModel's `foreign_key="tablename.col"` string
    # sugar) — `suppliers`/`users` live on their own separate Core
    # `MetaData` (see supplier_storage.py/user_storage.py), so a
    # string-based FK can't be resolved within `SQLModel.metadata` at
    # `create_all()` time; an explicit Column reference resolves directly
    # and needs no by-name metadata lookup.
    supplier_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey(suppliers_table.c.id), nullable=True),
        description="FK to suppliers.id",
    )
    user_uuid: int = Field(
        sa_column=Column(Integer, ForeignKey(users_table.c.id), index=True, nullable=False),
        description="FK to users.id — the staff member who logged this receipt",
    )

    # Which restaurant location received the stock.
    country: Country = Field(sa_column=Column(String))
    city: City | None = Field(default=None, sa_column=Column(String, nullable=True))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
