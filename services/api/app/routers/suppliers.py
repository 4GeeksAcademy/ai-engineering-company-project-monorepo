"""Suppliers CRUD router — Brasa Points supplier directory.

Migrated from TinyDB: persistence now lives in app/services/suppliers.py
(this router used to own it directly — the only entity with that
inconsistency; fixed as part of the SQL migration).
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core import cache
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
from app.services import suppliers as suppliers_service

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

# See docs/cache-evaluation.md: the supplier directory changes rarely
# (occasional create/rate/status updates), so the list is cached with a
# longer TTL and invalidated on any write. Cached per filter combination.
_LIST_CACHE_PREFIX = "suppliers:list"
_LIST_CACHE_TTL_SECONDS = 180


# ── POST /suppliers ───────────────────────────────────────
@router.post("", response_model=ApiResponse[SupplierResponse], status_code=201)
async def create_supplier(
    payload: SupplierCreate,
    current_user: dict = Depends(require_staff),
):
    """Register a new supplier (staff only — manager or admin)."""
    try:
        supplier = suppliers_service.create_supplier(payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    cache.invalidate_prefix(_LIST_CACHE_PREFIX)
    return ApiResponse(
        message="Supplier registered successfully",
        data=supplier,
    )


# ── GET /suppliers ────────────────────────────────────────
@router.get("", response_model=ApiResponse[list[SupplierResponse]])
async def list_suppliers(
    product_category: Optional[ProductCategory] = Query(
        None, description="Filter by product category"
    ),
    status: Optional[SupplierStatus] = Query(
        None, description="Filter by status (active/suspended)"
    ),
    current_user: dict = Depends(require_any_user),
):
    """List all suppliers, optionally filtered by product category and/or status (cached, see docs/cache-evaluation.md)."""
    cache_key = f"{_LIST_CACHE_PREFIX}:{product_category}:{status}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    results = suppliers_service.list_suppliers(product_category=product_category, status=status)

    response = ApiResponse(
        message=f"Found {len(results)} supplier(s)",
        data=results,
    )
    cache.set(cache_key, response, _LIST_CACHE_TTL_SECONDS)
    return response


# ── GET /suppliers/{supplier_id} ──────────────────────────
@router.get("/{supplier_id}", response_model=ApiResponse[SupplierResponse])
async def get_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_any_user),
):
    """Return the detail of a supplier by ID (authenticated)."""
    supplier = suppliers_service.get_supplier_by_id(supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    return ApiResponse(data=supplier)


# ── PATCH /suppliers/{supplier_id}/rate ────────────────────
@router.patch("/{supplier_id}/rate", response_model=ApiResponse[SupplierResponse])
async def update_supplier_rate(
    supplier_id: int,
    payload: SupplierRateUpdate,
    current_user: dict = Depends(require_staff),
):
    """Update a supplier's rate (staff only). Records updated_at."""
    supplier = suppliers_service.update_supplier_rate(supplier_id, payload.rate)
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    cache.invalidate_prefix(_LIST_CACHE_PREFIX)
    return ApiResponse(
        message="Supplier rate updated successfully",
        data=supplier,
    )


# ── PATCH /suppliers/{supplier_id}/status ──────────────────
@router.patch("/{supplier_id}/status", response_model=ApiResponse[SupplierResponse])
async def update_supplier_status(
    supplier_id: int,
    payload: SupplierStatusUpdate,
    current_user: dict = Depends(require_staff),
):
    """Activate or suspend a supplier (staff only)."""
    supplier = suppliers_service.update_supplier_status(supplier_id, payload.status)
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    cache.invalidate_prefix(_LIST_CACHE_PREFIX)
    return ApiResponse(
        message=f"Supplier status changed to {payload.status.value}",
        data=supplier,
    )


# ── DELETE /suppliers/{supplier_id} ────────────────────────
@router.delete("/{supplier_id}", response_model=ApiResponse[None])
async def delete_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_staff),
):
    """Remove a supplier from the directory (staff only)."""
    if not suppliers_service.delete_supplier(supplier_id):
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")

    cache.invalidate_prefix(_LIST_CACHE_PREFIX)
    return ApiResponse(message=f"Supplier {supplier_id} deleted successfully")
