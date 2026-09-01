from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from database import document_to_dict, suppliers_table
from models import (
    Country,
    SupplierCategory,
    SupplierCreate,
    SupplierRateUpdate,
    SupplierResponse,
    SupplierStatusUpdate,
)
from security import get_current_user


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
    dependencies=[Depends(get_current_user)],
)


def get_supplier_or_404(supplier_id: int):
    supplier = suppliers_table.get(doc_id=supplier_id)

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    return supplier


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(payload: SupplierCreate):
    record = payload.model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()

    supplier_id = suppliers_table.insert(record)
    supplier = suppliers_table.get(doc_id=supplier_id)

    return document_to_dict(supplier)


@router.get(
    "",
    response_model=list[SupplierResponse],
)
def list_suppliers(
    country: Country | None = None,
    category: SupplierCategory | None = None,
):
    supplier_query = Query()

    if country is not None and category is not None:
        documents = suppliers_table.search(
            (supplier_query.country == country)
            & supplier_query.categories.any([category])
        )
    elif country is not None:
        documents = suppliers_table.search(
            supplier_query.country == country
        )
    elif category is not None:
        documents = suppliers_table.search(
            supplier_query.categories.any([category])
        )
    else:
        documents = suppliers_table.all()

    return [
        document_to_dict(document)
        for document in documents
    ]


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def get_supplier(supplier_id: int):
    supplier = get_supplier_or_404(supplier_id)

    return document_to_dict(supplier)


@router.patch(
    "/{supplier_id}/rate",
    response_model=SupplierResponse,
)
def update_supplier_rate(
    supplier_id: int,
    payload: SupplierRateUpdate,
):
    get_supplier_or_404(supplier_id)

    suppliers_table.update(
        {
            "rate_per_shipment": payload.rate_per_shipment,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )

    supplier = get_supplier_or_404(supplier_id)

    return document_to_dict(supplier)


@router.patch(
    "/{supplier_id}/status",
    response_model=SupplierResponse,
)
def update_supplier_status(
    supplier_id: int,
    payload: SupplierStatusUpdate,
):
    get_supplier_or_404(supplier_id)

    suppliers_table.update(
        {
            "status": payload.status,
        },
        doc_ids=[supplier_id],
    )

    supplier = get_supplier_or_404(supplier_id)

    return document_to_dict(supplier)


@router.delete(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def delete_supplier(supplier_id: int):
    supplier = get_supplier_or_404(supplier_id)

    response = document_to_dict(supplier)

    suppliers_table.remove(
        doc_ids=[supplier_id],
    )

    return response
