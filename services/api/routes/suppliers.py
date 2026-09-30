"""CRUD endpoints for the persistent supplier directory."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response, status

import database
from models import SupplierCreate, SupplierRateUpdate, SupplierResponse, SupplierStatusUpdate, utc_now

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def serialize(record: dict[str, Any]) -> SupplierResponse:
    return SupplierResponse.model_validate({**record, "updated_at": datetime.fromisoformat(record["updated_at"])})


def require_supplier(supplier_id: int) -> dict[str, Any]:
    supplier = database.get_supplier(supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
    record = database.insert_supplier({**payload.model_dump(), "updated_at": utc_now().isoformat()})
    return serialize(record)


@router.get("", response_model=list[SupplierResponse])
def get_suppliers(
    country: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[SupplierResponse]:
    return [serialize(record) for record in database.list_suppliers(country=country, category=category)]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    return serialize(require_supplier(supplier_id))


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_rate(supplier_id: int, payload: SupplierRateUpdate) -> SupplierResponse:
    require_supplier(supplier_id)
    updated = database.update_supplier(
        supplier_id,
        {"monthly_rate": payload.monthly_rate, "updated_at": utc_now().isoformat()},
    )
    return serialize(updated)  # type: ignore[arg-type]


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_status(supplier_id: int, payload: SupplierStatusUpdate) -> SupplierResponse:
    updated = database.update_supplier(supplier_id, {"status": payload.status})
    if updated is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return serialize(updated)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_supplier(supplier_id: int) -> Response:
    if not database.delete_supplier(supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
