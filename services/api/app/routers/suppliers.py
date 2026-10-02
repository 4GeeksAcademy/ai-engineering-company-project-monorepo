"""Suppliers CRUD router — Brasa Points supplier directory."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from tinydb import TinyDB, where

from app.core.deps import require_any_user, require_staff
from app.models.schemas import (
    ApiResponse,
    ProductCategory,
    SupplierCreate,
    SupplierRateUpdate,
    SupplierResponse,
    SupplierStatus,
    SupplierStatusUpdate,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

# ── Database ──────────────────────────────────────────────
# Shared TinyDB instance (same path used by seed.py)
import sys
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent.parent.parent / "db.json"


def _get_db() -> TinyDB:
    return TinyDB(_DB_PATH)


def _get_table(db: TinyDB):
    return db.table("suppliers")


def _doc_to_response(doc: dict) -> dict:
    """Convert a TinyDB document (with doc_id) to a SupplierResponse dict."""
    return SupplierResponse(
        id=doc.doc_id,
        full_name=doc["full_name"],
        email=doc["email"],
        phone=doc["phone"],
        country=doc["country"],
        city=doc["city"],
        favorite_location=doc.get("favorite_location"),
        dietary_preferences=doc.get("dietary_preferences", []),
        how_did_you_find_us=doc["how_did_you_find_us"],
        date_of_birth=doc["date_of_birth"],
        accepts_terms=doc["accepts_terms"],
        wants_email_offers=doc.get("wants_email_offers", False),
        product_category=doc.get("product_category", "Other"),
        rate=doc.get("rate", 0.0),
        status=doc.get("status", "active"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    ).model_dump(mode="json")


# ── POST /suppliers ───────────────────────────────────────
@router.post("/", response_model=ApiResponse, status_code=201)
async def create_supplier(
    payload: SupplierCreate,
    current_user: dict = Depends(require_staff),
):
    """Register a new supplier (staff only — manager or admin)."""
    db = _get_db()
    table = _get_table(db)

    # Check for duplicate email
    existing = table.search(where("email") == payload.email)
    if existing:
        db.close()
        raise HTTPException(
            status_code=409,
            detail=f"A supplier with email '{payload.email}' already exists.",
        )

    now = datetime.now(timezone.utc).isoformat()
    data = payload.model_dump(mode="json")
    data["date_of_birth"] = str(data["date_of_birth"])
    data["created_at"] = now
    data["updated_at"] = now

    doc_id = table.insert(data)
    doc = table.get(doc_id=doc_id)
    db.close()

    return ApiResponse(
        message="Supplier registered successfully",
        data=_doc_to_response(doc),
    )


# ── GET /suppliers ────────────────────────────────────────
@router.get("/", response_model=ApiResponse)
async def list_suppliers(
    product_category: Optional[ProductCategory] = Query(
        None, description="Filter by product category"
    ),
    status: Optional[SupplierStatus] = Query(
        None, description="Filter by status (active/suspended)"
    ),
    current_user: dict = Depends(require_any_user),
):
    """List all suppliers, optionally filtered by product category and/or status."""
    db = _get_db()
    table = _get_table(db)

    results = table.all()

    if product_category is not None:
        results = [doc for doc in results if doc.get("product_category") == product_category]

    if status is not None:
        results = [doc for doc in results if doc.get("status") == status.value]

    db.close()

    return ApiResponse(
        message=f"Found {len(results)} supplier(s)",
        data=[_doc_to_response(doc) for doc in results],
    )


# ── GET /suppliers/{supplier_id} ──────────────────────────
@router.get("/{supplier_id}", response_model=ApiResponse)
async def get_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_any_user),
):
    """Return the detail of a supplier by ID (authenticated)."""
    db = _get_db()
    table = _get_table(db)

    doc = table.get(doc_id=supplier_id)
    db.close()

    if doc is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    return ApiResponse(data=_doc_to_response(doc))


# ── PATCH /suppliers/{supplier_id}/rate ────────────────────
@router.patch("/{supplier_id}/rate", response_model=ApiResponse)
async def update_supplier_rate(
    supplier_id: int,
    payload: SupplierRateUpdate,
    current_user: dict = Depends(require_staff),
):
    """Update a supplier's rate (staff only). Records updated_at."""
    db = _get_db()
    table = _get_table(db)

    doc = table.get(doc_id=supplier_id)
    if doc is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    now = datetime.now(timezone.utc).isoformat()
    table.update({"rate": payload.rate, "updated_at": now}, doc_ids=[supplier_id])

    updated_doc = table.get(doc_id=supplier_id)
    db.close()

    return ApiResponse(
        message="Supplier rate updated successfully",
        data=_doc_to_response(updated_doc),
    )


# ── PATCH /suppliers/{supplier_id}/status ──────────────────
@router.patch("/{supplier_id}/status", response_model=ApiResponse)
async def update_supplier_status(
    supplier_id: int,
    payload: SupplierStatusUpdate,
    current_user: dict = Depends(require_staff),
):
    """Activate or suspend a supplier (staff only)."""
    db = _get_db()
    table = _get_table(db)

    doc = table.get(doc_id=supplier_id)
    if doc is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    now = datetime.now(timezone.utc).isoformat()
    table.update(
        {"status": payload.status.value, "updated_at": now}, doc_ids=[supplier_id]
    )

    updated_doc = table.get(doc_id=supplier_id)
    db.close()

    return ApiResponse(
        message=f"Supplier status changed to {payload.status.value}",
        data=_doc_to_response(updated_doc),
    )


# ── DELETE /suppliers/{supplier_id} ────────────────────────
@router.delete("/{supplier_id}", response_model=ApiResponse)
async def delete_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_staff),
):
    """Remove a supplier from the directory (staff only)."""
    db = _get_db()
    table = _get_table(db)

    doc = table.get(doc_id=supplier_id)
    if doc is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    table.remove(doc_ids=[supplier_id])
    db.close()

    return ApiResponse(message=f"Supplier {supplier_id} deleted successfully")
