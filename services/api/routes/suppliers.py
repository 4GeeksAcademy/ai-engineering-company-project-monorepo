from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Response, status

from services.api import database
from services.api.models import (
    Category,
    Country,
    RateUpdate,
    Status,
    StatusUpdate,
    Supplier,
    SupplierCreate,
)

router = APIRouter(tags=["suppliers"])


def _not_found(supplier_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Supplier {supplier_id} not found.",
    )


@router.post("", response_model=Supplier, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate):
    if database.find_by_name(payload.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A supplier named '{payload.name}' already exists.",
        )
    return database.insert_supplier(payload.model_dump(mode="json"))


@router.get("", response_model=list[Supplier])
def list_suppliers(
    country: Optional[Country] = Query(default=None),
    category: Optional[Category] = Query(default=None),
    status_filter: Optional[Status] = Query(default=None, alias="status"),
):
    suppliers = database.list_suppliers()
    if country:
        suppliers = [s for s in suppliers if s["country"] == country]
    if category:
        suppliers = [s for s in suppliers if category in s["categories"]]
    if status_filter:
        suppliers = [s for s in suppliers if s["status"] == status_filter]
    return suppliers


@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: int):
    supplier = database.get_supplier(supplier_id)
    if supplier is None:
        raise _not_found(supplier_id)
    return supplier


@router.patch("/{supplier_id}/rate", response_model=Supplier)
def update_rate(supplier_id: int, payload: RateUpdate):
    supplier = database.update_supplier(
        supplier_id,
        {"rate_per_unit": payload.rate_per_unit, "updated_at": database.now_iso()},
    )
    if supplier is None:
        raise _not_found(supplier_id)
    return supplier


@router.patch("/{supplier_id}/status", response_model=Supplier)
def update_status(supplier_id: int, payload: StatusUpdate):
    supplier = database.update_supplier(supplier_id, {"status": payload.status})
    if supplier is None:
        raise _not_found(supplier_id)
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int):
    if not database.delete_supplier(supplier_id):
        raise _not_found(supplier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
