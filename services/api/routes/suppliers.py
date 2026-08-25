from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from database import suppliers_table
from models import (
    Country,
    RateUpdate,
    StatusUpdate,
    SupplierCreate,
    SupplierResponse,
)


router = APIRouter(tags=["suppliers"])


def to_response_supplier(supplier: dict, supplier_id: int) -> SupplierResponse:
    return SupplierResponse(
        id=supplier_id,
        **supplier,
    )


@router.post(
    "/suppliers",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(data: SupplierCreate):
    payload = data.model_dump()
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    inserted_id = suppliers_table.insert(payload)
    created = suppliers_table.get(doc_id=inserted_id)

    if created is None:
        raise HTTPException(status_code=500, detail="No se pudo crear el proveedor")

    return to_response_supplier(created, inserted_id)


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    country: Optional[Country] = Query(default=None),
    category: Optional[str] = Query(default=None),
):
    suppliers = suppliers_table.all()
    filtered = []

    for supplier in suppliers:
        supplier_dict = dict(supplier)

        if country and supplier_dict["country"] != country.value:
            continue

        if category and category not in supplier_dict["categories"]:
            continue

        filtered.append(to_response_supplier(supplier_dict, supplier.doc_id))

    return filtered


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int):
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    return to_response_supplier(dict(supplier), supplier_id)


@router.patch("/suppliers/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, data: RateUpdate):
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    suppliers_table.update(
        {
            "rate_per_shipment": data.rate_per_shipment,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )

    updated = suppliers_table.get(doc_id=supplier_id)
    return to_response_supplier(dict(updated), supplier_id)


@router.patch("/suppliers/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(supplier_id: int, data: StatusUpdate):
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    suppliers_table.update(
        {
            "status": data.status.value,
        },
        doc_ids=[supplier_id],
    )

    updated = suppliers_table.get(doc_id=supplier_id)
    return to_response_supplier(dict(updated), supplier_id)


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int):
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    suppliers_table.remove(doc_ids=[supplier_id])
    return {"message": "Proveedor eliminado"}
