"""Endpoints of the supplier directory (Directorio de Proveedores): list/create/
update, the two search endpoints (by country, by category), and a status
toggle. DELETE removes active suppliers only: the CONTEXT keeps suspended ones
in the directory for the commercial history, so deleting one returns 409.

Mounted twice in ``main.py``: at ``/suppliers`` (documented) and at
``/api/suppliers`` (what the backoffice calls through the Vite proxy).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

import database as db
from models import (
    Country,
    SupplierCategory,
    SupplierCreate,
    SupplierOut,
    SupplierRateUpdate,
    SupplierStatusUpdate,
    SupplierUpdate,
)

router = APIRouter(tags=["suppliers"])


@router.get("", response_model=list[SupplierOut])
async def list_suppliers(
    country: Country | None = Query(default=None),
    category: SupplierCategory | None = Query(default=None),
) -> list[SupplierOut]:
    return db.list_suppliers(country=country.value if country else None, category=category)


@router.get("/search/by-country", response_model=list[SupplierOut])
async def search_by_country(country: Country = Query()) -> list[SupplierOut]:
    return db.search_by_country(country.value)


@router.get("/search/by-category", response_model=list[SupplierOut])
async def search_by_category(category: SupplierCategory = Query()) -> list[SupplierOut]:
    return db.search_by_category(category)


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: int) -> SupplierOut:
    try:
        return db.get_supplier(supplier_id)
    except db.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate) -> SupplierOut:
    return db.create_supplier(payload)


@router.patch("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(supplier_id: int, payload: SupplierUpdate) -> SupplierOut:
    try:
        return db.update_supplier(supplier_id, payload)
    except db.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except db.InvalidSupplierUpdateError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc


@router.patch("/{supplier_id}/rate", response_model=SupplierOut)
async def update_supplier_rate(supplier_id: int, payload: SupplierRateUpdate) -> SupplierOut:
    try:
        return db.update_rate(supplier_id, payload.monthly_rate)
    except db.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{supplier_id}/status", response_model=SupplierOut)
async def set_supplier_status(supplier_id: int, payload: SupplierStatusUpdate) -> SupplierOut:
    try:
        return db.set_status(supplier_id, payload.status)
    except db.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(supplier_id: int) -> None:
    try:
        db.delete_supplier(supplier_id)
    except db.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except db.SupplierSuspendedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
