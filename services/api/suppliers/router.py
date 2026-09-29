"""Routes for the suppliers domain (Directorio de Proveedores): list/create/
update, the two search endpoints (by country, by category), and a status
toggle. DELETE is available for entries made by mistake; the CONTEXT prefers
suspending a supplier so the commercial history is kept.

Mounted twice in ``main.py``: at ``/suppliers`` (documented) and at
``/api/suppliers`` (what the backoffice calls through the Vite proxy).
Both mounts share this router, so both are protected.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import get_current_user, require_role
from auth.schemas import Role

from . import service
from .schemas import (
    Country,
    SupplierCategory,
    SupplierCreate,
    SupplierOut,
    SupplierRateUpdate,
    SupplierStatusUpdate,
    SupplierUpdate,
)

# Every route needs a valid session (any role can read); creating/editing is
# limited to supervisors and admins, and deleting to admins.
router = APIRouter(tags=["suppliers"], dependencies=[Depends(get_current_user)])

_can_write = Depends(require_role(Role.SUPERVISOR, Role.ADMIN))
_can_delete = Depends(require_role(Role.ADMIN))


@router.get("", response_model=list[SupplierOut])
async def list_suppliers(
    country: Country | None = Query(default=None),
    category: SupplierCategory | None = Query(default=None),
) -> list[SupplierOut]:
    return service.list_suppliers(country=country.value if country else None, category=category)


@router.get("/search/by-country", response_model=list[SupplierOut])
async def search_by_country(country: Country = Query()) -> list[SupplierOut]:
    return service.search_by_country(country.value)


@router.get("/search/by-category", response_model=list[SupplierOut])
async def search_by_category(category: SupplierCategory = Query()) -> list[SupplierOut]:
    return service.search_by_category(category)


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: int) -> SupplierOut:
    try:
        return service.get_supplier(supplier_id)
    except service.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "", response_model=SupplierOut, status_code=status.HTTP_201_CREATED, dependencies=[_can_write]
)
async def create_supplier(payload: SupplierCreate) -> SupplierOut:
    return service.create_supplier(payload)


@router.patch("/{supplier_id}", response_model=SupplierOut, dependencies=[_can_write])
async def update_supplier(supplier_id: int, payload: SupplierUpdate) -> SupplierOut:
    try:
        return service.update_supplier(supplier_id, payload)
    except service.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.InvalidSupplierUpdateError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc


@router.patch("/{supplier_id}/rate", response_model=SupplierOut, dependencies=[_can_write])
async def update_supplier_rate(supplier_id: int, payload: SupplierRateUpdate) -> SupplierOut:
    try:
        return service.update_rate(supplier_id, payload.monthly_rate)
    except service.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{supplier_id}/status", response_model=SupplierOut, dependencies=[_can_write])
async def set_supplier_status(supplier_id: int, payload: SupplierStatusUpdate) -> SupplierOut:
    try:
        return service.set_status(supplier_id, payload.status)
    except service.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete(
    "/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[_can_delete]
)
async def delete_supplier(supplier_id: int) -> None:
    try:
        service.delete_supplier(supplier_id)
    except service.SupplierNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
