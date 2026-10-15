from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from models import Category, Country, RateUpdate, StatusUpdate, Supplier, SupplierCreate, SupplierResponse
from security import get_current_user


router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(get_current_user)])


def find_supplier(request: Request, supplier_id: int):
    document = request.app.state.db.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado.")
    return document


def serialize(document) -> SupplierResponse:
    return SupplierResponse(id=document.doc_id, **document)


@router.post("", response_model=SupplierResponse, status_code=201)
def register_supplier(payload: SupplierCreate, request: Request):
    supplier = Supplier(**payload.model_dump(), updated_at=datetime.now(timezone.utc))
    with request.app.state.lock:
        supplier_id = request.app.state.db.insert(supplier.model_dump(mode="json"))
        return SupplierResponse(id=supplier_id, **supplier.model_dump())


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(request: Request, country: Country | None = None, category: Category | None = None):
    with request.app.state.lock:
        return [
            serialize(document)
            for document in request.app.state.db.all()
            if (country is None or document["country"] == country)
            and (category is None or category in document["categories"])
        ]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, request: Request):
    with request.app.state.lock:
        return serialize(find_supplier(request, supplier_id))


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_rate(supplier_id: int, payload: RateUpdate, request: Request):
    with request.app.state.lock:
        find_supplier(request, supplier_id)
        request.app.state.db.update(
            {"rate_per_shipment": payload.rate_per_shipment, "updated_at": datetime.now(timezone.utc).isoformat()},
            doc_ids=[supplier_id],
        )
        return serialize(find_supplier(request, supplier_id))


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_status(supplier_id: int, payload: StatusUpdate, request: Request):
    with request.app.state.lock:
        find_supplier(request, supplier_id)
        request.app.state.db.update({"status": payload.status.value}, doc_ids=[supplier_id])
        return serialize(find_supplier(request, supplier_id))


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, request: Request):
    with request.app.state.lock:
        find_supplier(request, supplier_id)
        request.app.state.db.remove(doc_ids=[supplier_id])
    return Response(status_code=204)