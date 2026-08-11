from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response, status

from services.api.database import (
    delete_supplier_record,
    get_supplier_document,
    insert_supplier_record,
    list_supplier_records,
    update_supplier_record,
    utc_now,
)
from services.api.models import Country, RateUpdate, StatusUpdate, Supplier, SupplierCreate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("", response_model=Supplier, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> Supplier:
    supplier = insert_supplier_record({**payload.model_dump(), "updated_at": utc_now()})
    return Supplier.model_validate(supplier)


@router.get("", response_model=list[Supplier])
def list_suppliers(
    country: Country | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[Supplier]:
    suppliers = list_supplier_records(country=country.value if country is not None else None, category=category)
    return [Supplier.model_validate(supplier) for supplier in suppliers]


@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: int) -> Supplier:
    supplier = get_supplier_document(supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return Supplier.model_validate({**dict(supplier), "id": supplier.doc_id})


@router.patch("/{supplier_id}/rate", response_model=Supplier)
def update_supplier_rate(supplier_id: int, payload: RateUpdate) -> Supplier:
    if get_supplier_document(supplier_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    supplier = update_supplier_record(
        supplier_id,
        {"rate_per_shipment": payload.rate_per_shipment, "updated_at": utc_now()},
    )
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return Supplier.model_validate(supplier)


@router.patch("/{supplier_id}/status", response_model=Supplier)
def update_supplier_status(supplier_id: int, payload: StatusUpdate) -> Supplier:
    if get_supplier_document(supplier_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    supplier = update_supplier_record(supplier_id, {"status": payload.status.value})
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return Supplier.model_validate(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int) -> Response:
    if not delete_supplier_record(supplier_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
