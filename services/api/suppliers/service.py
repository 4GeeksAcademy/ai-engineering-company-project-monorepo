"""Business logic for the suppliers domain (Directorio de Proveedores).

Backed by TinyDB rather than a full RDBMS: a small internal directory with a
still-settling data model doesn't need more, and Postgres comes later once the
ORM is ready.

The database is seeded (``seed.py``) the first time it's opened, and
``get_db()`` is called once at import time (bottom of file) so the directory is
populated as soon as the app starts — the demo must never show an empty DB.

Suspending is the preferred way to retire a supplier (it keeps the history of
commercial relationships); ``delete_supplier`` exists for entries made by mistake.
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import ValidationError
from tinydb import Query, TinyDB

from core.config import get_suppliers_db_path
from seed import seed_database

from .schemas import (
    SupplierCategory,
    SupplierCreate,
    SupplierOut,
    SupplierStatus,
    SupplierUpdate,
)

_db: TinyDB | None = None


class SupplierNotFoundError(Exception):
    def __init__(self, supplier_id: int):
        self.supplier_id = supplier_id
        super().__init__(f"Supplier {supplier_id} not found")


class InvalidSupplierUpdateError(Exception):
    """The update would leave the supplier in an invalid state."""

    def __init__(self, errors: list):
        self.errors = errors
        super().__init__("Update would produce an invalid supplier")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_suppliers_db_path())
        if len(_db) == 0:
            seed_database(_db)
    return _db


def list_suppliers(
    country: str | None = None, category: SupplierCategory | None = None
) -> list[SupplierOut]:
    """All suppliers, optionally filtered by country and/or category (AND)."""
    conditions = []
    if country is not None:
        conditions.append(Query().country == country)
    if category is not None:
        conditions.append(Query().categories.any([category.value]))

    if not conditions:
        docs = get_db().all()
    else:
        combined = conditions[0]
        for condition in conditions[1:]:
            combined = combined & condition
        docs = get_db().search(combined)
    return [_to_out(doc) for doc in docs]


def get_supplier(supplier_id: int) -> SupplierOut:
    doc = get_db().get(doc_id=supplier_id)
    if doc is None:
        raise SupplierNotFoundError(supplier_id)
    return _to_out(doc)


def search_by_country(country: str) -> list[SupplierOut]:
    return list_suppliers(country=country)


def search_by_category(category: SupplierCategory) -> list[SupplierOut]:
    return list_suppliers(category=category)


def create_supplier(payload: SupplierCreate) -> SupplierOut:
    doc_id = get_db().insert({**payload.model_dump(mode="json"), "updated_at": _now()})
    return get_supplier(doc_id)


def update_supplier(supplier_id: int, payload: SupplierUpdate) -> SupplierOut:
    db = get_db()
    doc = db.get(doc_id=supplier_id)
    if doc is None:
        raise SupplierNotFoundError(supplier_id)

    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        return _to_out(doc)

    # Re-validate the merged record so cross-field rules (currency vs.
    # country) hold even when only one of the two fields is being changed.
    merged = {k: v for k, v in doc.items() if k != "updated_at"} | changes
    try:
        validated = SupplierCreate(**merged)
    except ValidationError as exc:
        raise InvalidSupplierUpdateError(exc.errors(include_url=False, include_context=False)) from exc

    new_doc = validated.model_dump(mode="json")
    if "monthly_rate" in changes and changes["monthly_rate"] != doc["monthly_rate"]:
        new_doc["updated_at"] = _now()
    else:
        new_doc["updated_at"] = doc["updated_at"]

    db.update(new_doc, doc_ids=[supplier_id])
    return get_supplier(supplier_id)


def update_rate(supplier_id: int, monthly_rate: float) -> SupplierOut:
    """Set a new monthly rate and stamp ``updated_at`` with the time of the change."""
    db = get_db()
    if db.get(doc_id=supplier_id) is None:
        raise SupplierNotFoundError(supplier_id)
    db.update({"monthly_rate": monthly_rate, "updated_at": _now()}, doc_ids=[supplier_id])
    return get_supplier(supplier_id)


def set_status(supplier_id: int, status: SupplierStatus) -> SupplierOut:
    db = get_db()
    if db.get(doc_id=supplier_id) is None:
        raise SupplierNotFoundError(supplier_id)
    db.update({"status": status.value}, doc_ids=[supplier_id])
    return get_supplier(supplier_id)


def delete_supplier(supplier_id: int) -> None:
    db = get_db()
    if db.get(doc_id=supplier_id) is None:
        raise SupplierNotFoundError(supplier_id)
    db.remove(doc_ids=[supplier_id])


def _to_out(doc) -> SupplierOut:
    return SupplierOut(id=doc.doc_id, **doc)


# Seed immediately on import so the directory is never empty (see docstring).
get_db()
