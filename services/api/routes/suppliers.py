from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from services.api.database import (
    create_supplier,
    delete_supplier,
    get_supplier_by_id,
    list_suppliers,
    update_supplier_rate,
    update_supplier_status,
)
from services.api.models import VALID_CATEGORIES, Country, Supplier, SupplierCreate, SupplierRateUpdate, SupplierStatusUpdate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("", response_model=Supplier, status_code=status.HTTP_201_CREATED)
def post_supplier(payload: SupplierCreate) -> Supplier:
    return create_supplier(payload)


@router.get("", response_model=list[Supplier])
def get_suppliers(
    country: Country | None = None,
    category: str | None = Query(default=None),
) -> list[Supplier]:
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=422, detail="Invalid category filter.")
    return list_suppliers(country.value if country else None, category)


@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: int) -> Supplier:
    supplier = get_supplier_by_id(supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


@router.patch("/{supplier_id}/rate", response_model=Supplier)
def patch_supplier_rate(supplier_id: int, payload: SupplierRateUpdate) -> Supplier:
    supplier = update_supplier_rate(supplier_id, payload.rate_per_shipment)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


@router.patch("/{supplier_id}/status", response_model=Supplier)
def patch_supplier_status(supplier_id: int, payload: SupplierStatusUpdate) -> Supplier:
    supplier = update_supplier_status(supplier_id, payload.status)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


@router.delete("/{supplier_id}")
def remove_supplier(supplier_id: int) -> dict[str, object]:
    deleted = delete_supplier(supplier_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return {"deleted": True, "id": supplier_id}
