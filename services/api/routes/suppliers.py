from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from database import get_suppliers_table
from models import (
    Category,
    Country,
    RateUpdate,
    StatusUpdate,
    SupplierCreate,
    SupplierResponse,
)

router = APIRouter(tags=["suppliers"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_response(doc) -> SupplierResponse:
    payload = dict(doc)
    payload["id"] = doc.doc_id
    return SupplierResponse.model_validate(payload)


def _get_or_404(supplier_id: int):
    table = get_suppliers_table()
    doc = table.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return table, doc


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
    table = get_suppliers_table()
    record = payload.model_dump(mode="json")
    record["updated_at"] = _now()
    doc_id = table.insert(record)
    created = table.get(doc_id=doc_id)
    return _to_response(created)


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    country: Country | None = Query(default=None),
    category: Category | None = Query(default=None),
) -> list[SupplierResponse]:
    table = get_suppliers_table()
    rows = table.all()
    results: list[SupplierResponse] = []
    for doc in rows:
        if country is not None and doc.get("country") != country.value:
            continue
        categories = doc.get("categories") or []
        if category is not None and category.value not in categories:
            continue
        results.append(_to_response(doc))
    return results


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    _table, doc = _get_or_404(supplier_id)
    return _to_response(doc)


@router.patch("/suppliers/{supplier_id}/rate", response_model=SupplierResponse)
def update_rate(supplier_id: int, payload: RateUpdate) -> SupplierResponse:
    table, _doc = _get_or_404(supplier_id)
    table.update(
        {"monthly_rate": payload.monthly_rate, "updated_at": _now()},
        doc_ids=[supplier_id],
    )
    updated = table.get(doc_id=supplier_id)
    return _to_response(updated)


@router.patch("/suppliers/{supplier_id}/status", response_model=SupplierResponse)
def update_status(supplier_id: int, payload: StatusUpdate) -> SupplierResponse:
    table, _doc = _get_or_404(supplier_id)
    table.update(
        {"status": payload.status.value, "updated_at": _now()},
        doc_ids=[supplier_id],
    )
    updated = table.get(doc_id=supplier_id)
    return _to_response(updated)


@router.delete("/suppliers/{supplier_id}", response_model=SupplierResponse)
def delete_supplier(supplier_id: int) -> SupplierResponse:
    table, doc = _get_or_404(supplier_id)
    response = _to_response(doc)
    table.remove(doc_ids=[supplier_id])
    return response
