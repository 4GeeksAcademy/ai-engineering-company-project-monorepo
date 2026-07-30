"""FastAPI suppliers routes protected with JWT authentication."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb.table import Document

from src.database import get_suppliers_table
from src.models.supplier import (
    SupplierCategory,
    SupplierCountry,
    SupplierCreate,
    SupplierRateUpdate,
    SupplierResponse,
    SupplierStatusUpdate,
)
from src.models.user import User
from src.services.auth_service import get_current_user

suppliers_fastapi_router = APIRouter(tags=["suppliers-legacy"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_supplier(document: Document) -> SupplierResponse:
    payload = dict(document)
    payload["id"] = str(document.doc_id)

    if "updated_at" not in payload:
        payload["updated_at"] = _now_iso()

    return SupplierResponse.model_validate(payload)


def _get_supplier_document_by_id(raw_id: str) -> Document | None:
    if not raw_id.isdigit():
        return None

    doc_id = int(raw_id)
    if doc_id <= 0:
        return None

    suppliers_table = get_suppliers_table()
    return suppliers_table.get(doc_id=doc_id)


@suppliers_fastapi_router.post("/suppliers", response_model=SupplierResponse)
def create_supplier_route(
    payload: SupplierCreate,
    _current_user: User = Depends(get_current_user),
) -> SupplierResponse:
    suppliers_table = get_suppliers_table()
    supplier_data = payload.model_dump(mode="json")
    supplier_data["updated_at"] = _now_iso()

    doc_id = suppliers_table.insert(supplier_data)
    created_document = suppliers_table.get(doc_id=doc_id)

    if created_document is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el proveedor.",
        )

    return _serialize_supplier(created_document)


@suppliers_fastapi_router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers_route(
    pais: SupplierCountry | None = None,
    categoria: SupplierCategory | None = None,
    _current_user: User = Depends(get_current_user),
) -> list[SupplierResponse]:
    suppliers_table = get_suppliers_table()
    documents = suppliers_table.all()

    if pais is not None:
        documents = [document for document in documents if document.get("pais") == pais.value]

    if categoria is not None:
        documents = [
            document
            for document in documents
            if categoria.value in (document.get("categorias") or [])
        ]

    return [_serialize_supplier(document) for document in documents]


@suppliers_fastapi_router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier_by_id_route(
    supplier_id: str,
    _current_user: User = Depends(get_current_user),
) -> SupplierResponse:
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    return _serialize_supplier(document)


@suppliers_fastapi_router.patch("/suppliers/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate_route(
    supplier_id: str,
    payload: SupplierRateUpdate,
    _current_user: User = Depends(get_current_user),
) -> SupplierResponse:
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    suppliers_table = get_suppliers_table()
    suppliers_table.update(
        {
            "tarifa": payload.tarifa,
            "updated_at": _now_iso(),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = suppliers_table.get(doc_id=document.doc_id)
    if updated_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    return _serialize_supplier(updated_document)


@suppliers_fastapi_router.patch("/suppliers/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status_route(
    supplier_id: str,
    payload: SupplierStatusUpdate,
    _current_user: User = Depends(get_current_user),
) -> SupplierResponse:
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    suppliers_table = get_suppliers_table()
    suppliers_table.update(
        {
            "estado": payload.estado.value,
            "updated_at": _now_iso(),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = suppliers_table.get(doc_id=document.doc_id)
    if updated_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    return _serialize_supplier(updated_document)


@suppliers_fastapi_router.delete("/suppliers/{supplier_id}")
def delete_supplier_route(
    supplier_id: str,
    _current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")

    suppliers_table = get_suppliers_table()
    suppliers_table.remove(doc_ids=[document.doc_id])

    return {"message": "Proveedor eliminado."}
