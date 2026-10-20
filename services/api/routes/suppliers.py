from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from tinydb import Query as TinyQuery

from services.api.database import supplier_status_history_table, suppliers_table
from services.api.models import (
    RateUpdate,
    StatusUpdate,
    Supplier,
    SupplierCategory,
    SupplierCountry,
    SupplierCreate,
    SupplierResponse,
    SupplierStatusEvent,
)

router = APIRouter(tags=["suppliers"])


def serialize_supplier(document: dict, document_id: int) -> SupplierResponse:
    return SupplierResponse(id=document_id, **document)


@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
    supplier = Supplier(**payload.model_dump())
    document = supplier.model_dump(mode="json")
    document_id = suppliers_table.insert(document)
    return serialize_supplier(document, document_id)


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    country: SupplierCountry | None = None,
    category: SupplierCategory | None = None,
) -> list[SupplierResponse]:
    suppliers = suppliers_table.all()
    if country is not None:
        suppliers = [supplier for supplier in suppliers if supplier["country"] == country.value]
    if category is not None:
        suppliers = [supplier for supplier in suppliers if category.value in supplier["categories"]]
    return [serialize_supplier(supplier, supplier.doc_id) for supplier in suppliers]


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return serialize_supplier(supplier, supplier.doc_id)


@router.patch("/suppliers/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, payload: RateUpdate) -> SupplierResponse:
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    updated = {
        "rate_per_shipment": payload.rate_per_shipment,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    suppliers_table.update(updated, doc_ids=[supplier_id])
    return serialize_supplier({**supplier, **updated}, supplier_id)


@router.patch("/suppliers/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(supplier_id: int, payload: StatusUpdate) -> SupplierResponse:
    supplier = suppliers_table.get(doc_id=supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    updated = {"status": payload.status.value}
    if supplier["status"] != payload.status.value:
        supplier_status_history_table.insert(
            {
                "supplier_id": supplier_id,
                "previous_status": supplier["status"],
                "status": payload.status.value,
                "changed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    suppliers_table.update(updated, doc_ids=[supplier_id])
    return serialize_supplier({**supplier, **updated}, supplier_id)


@router.get("/suppliers/{supplier_id}/status-history", response_model=list[SupplierStatusEvent])
def get_supplier_status_history(supplier_id: int) -> list[SupplierStatusEvent]:
    history_query = TinyQuery()
    events = supplier_status_history_table.search(history_query.supplier_id == supplier_id)
    if suppliers_table.get(doc_id=supplier_id) is None and not events:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return [SupplierStatusEvent(id=event.doc_id, **event) for event in events]


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int) -> None:
    if suppliers_table.get(doc_id=supplier_id) is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    suppliers_table.remove(doc_ids=[supplier_id])
