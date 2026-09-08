from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from tinydb import Query as TinyQuery
from datetime import datetime

from models import SupplierCreate, SupplierResponse, SupplierUpdateRate, SupplierUpdateStatus
from database import get_db

from fastapi import Depends
from services.api.routes.auth import get_current_user


router = APIRouter(prefix="/suppliers", tags=["suppliers"])

@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    supplier_dict = supplier.dict()
    supplier_dict["updated_at"] = now.isoformat()
    
    doc_id = db.insert(supplier_dict)
    
    response_data = {**supplier_dict, "id": doc_id}
    return SupplierResponse(**response_data)

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    country: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    SupplierQuery = TinyQuery()
    
    if country and category:
        results = db.search((SupplierQuery.country == country) & (SupplierQuery.categories.any(category)))
    elif country:
        results = db.search(SupplierQuery.country == country)
    elif category:
        results = db.search(SupplierQuery.categories.any(category))
    else:
        results = db.all()
        
    response = []
    for r in results:
        data = dict(r)
        data["id"] = r.doc_id
        response.append(SupplierResponse(**data))
        
    return response

@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(id: int, current_user: dict = Depends(get_current_user)):
    db = get_db()
    record = db.get(doc_id=id)
    if not record:
        raise HTTPException(status_code=404, detail="Supplier not found")
    data = dict(record)
    data["id"] = record.doc_id
    return SupplierResponse(**data)

@router.patch("/{id}/rate", response_model=SupplierResponse)
def update_supplier_rate(id: int, rate_update: SupplierUpdateRate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    record = db.get(doc_id=id)
    if not record:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    now = datetime.utcnow().isoformat()
    db.update({"hourly_rate": rate_update.hourly_rate, "updated_at": now}, doc_ids=[id])
    
    updated_record = db.get(doc_id=id)
    data = dict(updated_record)
    data["id"] = updated_record.doc_id
    return SupplierResponse(**data)

@router.patch("/{id}/status", response_model=SupplierResponse)
def update_supplier_status(id: int, status_update: SupplierUpdateStatus, current_user: dict = Depends(get_current_user)):
    db = get_db()
    record = db.get(doc_id=id)
    if not record:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    now = datetime.utcnow().isoformat()
    db.update({"status": status_update.status, "updated_at": now}, doc_ids=[id])
    
    updated_record = db.get(doc_id=id)
    data = dict(updated_record)
    data["id"] = updated_record.doc_id
    return SupplierResponse(**data)

@router.delete("/{id}", status_code=204)
def delete_supplier(id: int, current_user: dict = Depends(get_current_user)):
    db = get_db()
    record = db.get(doc_id=id)
    if not record:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    db.remove(doc_ids=[id])
    return
