"""Suppliers (Brasa Points directory) service layer over SQL (Postgres/Supabase).

Migrated from TinyDB — see app/models/supplier_storage.py. Before this
migration, persistence for this entity lived directly in
app/routers/suppliers.py instead of a services/*.py module (the only
entity with that inconsistency) — this module corrects that, matching
every other entity's layering.

Same per-call session pattern as app/services/users.py — see that
module's docstring for why.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import delete, select, update
from sqlmodel import Session

from app.core.database import engine
from app.models.schemas import ProductCategory, SupplierCreate, SupplierStatus
from app.models.supplier_storage import suppliers_table


def _get_session() -> Session:
    return Session(engine)


def _build_supplier_response(row) -> dict:
    return {
        "id": row.id,
        "full_name": row.full_name,
        "email": row.email,
        "phone": row.phone,
        "country": row.country,
        "city": row.city,
        "favorite_location": row.favorite_location,
        "dietary_preferences": row.dietary_preferences or [],
        "how_did_you_find_us": row.how_did_you_find_us,
        "date_of_birth": row.date_of_birth,
        "accepts_terms": row.accepts_terms,
        "wants_email_offers": row.wants_email_offers,
        "product_category": row.product_category or "Other",
        "rate": row.rate if row.rate is not None else 0.0,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def create_supplier(payload: SupplierCreate) -> dict:
    """Register a new supplier. Raises ValueError on duplicate email."""
    with _get_session() as db:
        existing = db.execute(select(suppliers_table.c.id).where(suppliers_table.c.email == payload.email)).first()
        if existing is not None:
            raise ValueError(f"A supplier with email '{payload.email}' already exists.")

        now = datetime.now(timezone.utc)
        data = payload.model_dump(mode="json")
        data["date_of_birth"] = date.fromisoformat(data["date_of_birth"])
        data["created_at"] = now
        data["updated_at"] = now

        result = db.execute(suppliers_table.insert().values(**data))
        db.commit()
        supplier_id = result.inserted_primary_key[0]

        row = db.execute(select(suppliers_table).where(suppliers_table.c.id == supplier_id)).one()
        return _build_supplier_response(row)


def list_suppliers(
    *,
    product_category: ProductCategory | None = None,
    status: SupplierStatus | None = None,
) -> list[dict]:
    """List suppliers, optionally filtered by product category and/or status."""
    with _get_session() as db:
        stmt = select(suppliers_table)
        if product_category is not None:
            stmt = stmt.where(suppliers_table.c.product_category == product_category)
        if status is not None:
            stmt = stmt.where(suppliers_table.c.status == status.value)
        rows = db.execute(stmt).all()
        return [_build_supplier_response(row) for row in rows]


def get_supplier_by_id(supplier_id: int) -> dict | None:
    """Return a single supplier by id, or None."""
    with _get_session() as db:
        row = db.execute(select(suppliers_table).where(suppliers_table.c.id == supplier_id)).first()
        return _build_supplier_response(row) if row is not None else None


def update_supplier_rate(supplier_id: int, rate: float) -> dict | None:
    """Update a supplier's rate. Returns None if not found."""
    with _get_session() as db:
        existing = db.execute(select(suppliers_table.c.id).where(suppliers_table.c.id == supplier_id)).first()
        if existing is None:
            return None

        now = datetime.now(timezone.utc)
        db.execute(update(suppliers_table).where(suppliers_table.c.id == supplier_id).values(rate=rate, updated_at=now))
        db.commit()

        row = db.execute(select(suppliers_table).where(suppliers_table.c.id == supplier_id)).one()
        return _build_supplier_response(row)


def update_supplier_status(supplier_id: int, status: SupplierStatus) -> dict | None:
    """Activate or suspend a supplier. Returns None if not found."""
    with _get_session() as db:
        existing = db.execute(select(suppliers_table.c.id).where(suppliers_table.c.id == supplier_id)).first()
        if existing is None:
            return None

        now = datetime.now(timezone.utc)
        db.execute(
            update(suppliers_table)
            .where(suppliers_table.c.id == supplier_id)
            .values(status=status.value, updated_at=now)
        )
        db.commit()

        row = db.execute(select(suppliers_table).where(suppliers_table.c.id == supplier_id)).one()
        return _build_supplier_response(row)


def delete_supplier(supplier_id: int) -> bool:
    """Remove a supplier from the directory. Returns False if not found."""
    with _get_session() as db:
        existing = db.execute(select(suppliers_table.c.id).where(suppliers_table.c.id == supplier_id)).first()
        if existing is None:
            return False

        db.execute(delete(suppliers_table).where(suppliers_table.c.id == supplier_id))
        db.commit()
        return True
