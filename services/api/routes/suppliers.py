"""Supplier directory endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

import database
import models

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _http_error(status_code: int, message: str) -> None:
    raise HTTPException(status_code=status_code, detail=message)


def _validate_payload(payload: dict[str, Any]) -> None:
    if "country" in payload and payload["country"] not in models.COUNTRIES:
        _http_error(400, f"country must be one of: {', '.join(models.COUNTRIES)}")
    if "status" in payload and payload["status"] is not None:
        try:
            payload["status"] = models.parse_supplier_status(payload["status"]).value
        except ValueError as error:
            _http_error(400, str(error))
    categories = payload.get("product_categories")
    if categories is not None:
        unknown = [item for item in categories if item not in models.PRODUCT_CATEGORIES]
        if unknown:
            _http_error(400, f"product_categories must be from: {', '.join(models.PRODUCT_CATEGORIES)}")
    if "category" in payload and payload["category"] not in models.PRODUCT_CATEGORIES:
        _http_error(400, f"category must be one of: {', '.join(models.PRODUCT_CATEGORIES)}")


def _next_id(suppliers: list[dict[str, Any]]) -> str:
    numbers = []
    for row in suppliers:
        value = str(row.get("supplier_id", ""))
        if value.startswith("SUP-"):
            try:
                numbers.append(int(value.split("-", 1)[1]))
            except ValueError:
                continue
    return f"SUP-{max(numbers, default=0) + 1:03d}"


def _document_id(row: Any) -> str:
    return str(getattr(row, "doc_id", None) or row.get("id"))


def _find(suppliers: list[Any], lookup: str) -> Any | None:
    for row in suppliers:
        if _document_id(row) == lookup:
            return row
    for row in suppliers:
        if row.get("supplier_id") == lookup:
            return row
    return None


@router.get("")
def list_suppliers(
    category: str | None = Query(
        default=None,
        description="CONTEXT valid category. Matches membership in product_categories.",
    ),
    country: str | None = Query(
        default=None,
        description="CONTEXT country: Colombia or United States.",
    ),
    status: str | None = Query(default=None),
) -> list[models.SupplierResponse]:
    """Return every supplier, or only those that match the optional CONTEXT filters."""
    if category is not None:
        _validate_payload({"category": category})
    if country is not None:
        _validate_payload({"country": country})
    if status is not None:
        try:
            status = models.parse_supplier_status(status).value
        except ValueError as error:
            _http_error(400, str(error))
    rows = database.read_suppliers()
    if category is not None:
        rows = [row for row in rows if category in (row.get("product_categories") or [])]
    if country is not None:
        rows = [row for row in rows if row.get("country") == country]
    if status is not None:
        rows = [row for row in rows if row.get("status") == status]
    return [database.as_response(row) for row in rows]


@router.get("/{id}")
def get_supplier(id: str) -> models.SupplierResponse:
    """Return one supplier by TinyDB `id` (or CONTEXT `supplier_id`). 404 if missing."""
    row = _find(database.read_suppliers(), id)
    if row is None:
        _http_error(404, f"Supplier {id} was not found.")
    return database.as_response(row)


@router.post("", status_code=201)
def create_supplier(body: models.SupplierInput) -> models.SupplierResponse:
    payload = body.model_dump()
    stored = {
        **payload,
        "supplier_id": _next_id(database.read_suppliers()),
        "updated_at": models.utc_now(),
    }
    doc_id = database.insert_validated(stored)
    return models.SupplierResponse(id=doc_id, **stored)


@router.patch("/{id}/rate")
def update_supplier_rate(id: str, body: models.SupplierRateUpdate) -> models.SupplierResponse:
    """Update only the CONTEXT rate and stamp `updated_at` to now."""
    suppliers = database.read_suppliers()
    row = _find(suppliers, id)
    if row is None:
        _http_error(404, f"Supplier {id} was not found.")
    record = database.as_response(
        {
            **dict(row),
            "emergency_surcharge_pct": body.emergency_surcharge_pct,
            "updated_at": models.utc_now(),
            "id": row.doc_id,
        }
    )
    database.replace_validated(id, record)
    return record


@router.patch("/{id}/status")
def update_supplier_status(id: str, body: models.SupplierStatusPatch) -> models.SupplierResponse:
    """Activate (`active`) or suspend (`suspend`) a supplier. Other statuses are rejected."""
    suppliers = database.read_suppliers()
    row = _find(suppliers, id)
    if row is None:
        _http_error(404, f"Supplier {id} was not found.")
    record = database.as_response(
        {
            **dict(row),
            "status": models.STATUS_ACTION_STORED[body.status],
            "updated_at": models.utc_now(),
            "id": row.doc_id,
        }
    )
    database.replace_validated(id, record)
    return record


@router.patch("/{supplier_id}")
def update_supplier(supplier_id: str, body: models.SupplierUpdate) -> models.SupplierResponse:
    changes = body.model_dump(exclude_unset=True)
    _validate_payload(changes)
    suppliers = database.read_suppliers()
    row = _find(suppliers, supplier_id)
    if row is None:
        _http_error(404, f"Supplier {supplier_id} was not found.")
    record = database.as_response({**dict(row), **changes, "updated_at": models.utc_now(), "id": row.doc_id})
    database.replace_validated(supplier_id, record)
    return record


@router.delete("/{id}", status_code=204)
def delete_supplier(id: str) -> None:
    """Remove a supplier from TinyDB. 404 if the id does not exist."""
    row = _find(database.read_suppliers(), id)
    if row is None:
        _http_error(404, f"Supplier {id} was not found.")
    removed = database.suppliers_table().remove(doc_ids=[int(row.doc_id)])
    if not removed:
        _http_error(404, f"Supplier {id} was not found.")
