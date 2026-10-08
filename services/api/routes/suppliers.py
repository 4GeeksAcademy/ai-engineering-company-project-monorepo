"""Supplier directory endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from models import Category, Country, RateUpdate, StatusUpdate, Supplier, SupplierCreate
from database import SupplierRepository

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

NOT_FOUND = {404: {"description": "Supplier not found"}}


def get_repository(request: Request) -> SupplierRepository:
    return request.app.state.supplier_repository


Repository = Annotated[SupplierRepository, Depends(get_repository)]


def _found(supplier: Supplier | None, supplier_id: int) -> Supplier:
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")
    return supplier


@router.post(
    "",
    response_model=Supplier,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "A supplier with that name already exists"}},
)
def create_supplier(payload: SupplierCreate, repository: Repository) -> Supplier:
    if repository.exists_name(payload.name):
        raise HTTPException(status_code=409, detail=f"A supplier named '{payload.name}' already exists")
    return repository.create(payload)


@router.get("", response_model=list[Supplier])
def list_suppliers(
    repository: Repository,
    country: Country | None = None,
    category: Category | None = None,
) -> list[Supplier]:
    return repository.list(country=country, category=category)


@router.get("/{supplier_id}", response_model=Supplier, responses=NOT_FOUND)
def get_supplier(supplier_id: int, repository: Repository) -> Supplier:
    return _found(repository.get(supplier_id), supplier_id)


@router.patch("/{supplier_id}/rate", response_model=Supplier, responses=NOT_FOUND)
def update_rate(supplier_id: int, payload: RateUpdate, repository: Repository) -> Supplier:
    return _found(repository.update_rate(supplier_id, payload.monthly_rate), supplier_id)


@router.patch("/{supplier_id}/status", response_model=Supplier, responses=NOT_FOUND)
def update_status(supplier_id: int, payload: StatusUpdate, repository: Repository) -> Supplier:
    return _found(repository.update_status(supplier_id, payload.status), supplier_id)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses=NOT_FOUND,
)
def delete_supplier(supplier_id: int, repository: Repository) -> Response:
    if not repository.delete(supplier_id):
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
