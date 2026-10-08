from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

# Importamos la conexión a Supabase y la seguridad de TinyDB
from services.api.database import get_db
from services.api.routes.auth import get_current_user

# Importamos Modelos (Tablas) y Schemas (Validadores)
from services.api.models import Asset, AssetAcquisition, AssetAssignment
from services.api.schemas import (AssetCreate, AssetRead,AssetAcquisitionCreate, AssetAcquisitionRead,
    AssetAssignmentCreate, AssetAssignmentRead,OrdersAuditResponse)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def calculate_stock(session: Session, asset_id: int) -> int:
    """Calcula el stock real en tiempo real: Entradas - Salidas"""
    inbound = session.exec(select(AssetAcquisition).where(AssetAcquisition.asset_id == asset_id)).all()
    total_in = sum(record.quantity for record in inbound)
    
    outbound = session.exec(select(AssetAssignment).where(AssetAssignment.asset_id == asset_id)).all()
    total_out = sum(record.quantity for record in outbound)
    
    return total_in - total_out

# -----------------------------------
# ENDPOINTS PARA ACTIVOS (PRODUCTOS)
# -----------------------------------
@router.get("/products", response_model=List[AssetRead])
def get_assets(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.exec(select(Asset)).all()
    return [
        AssetRead(
            id=a.id, name=a.name, sku=a.sku, department=a.department, 
            current_stock=calculate_stock(db, a.id)
        ) for a in assets
    ]


@router.post("/products", response_model=AssetRead, status_code=201)
def create_asset(asset_in: AssetCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.exec(select(Asset).where(Asset.sku == asset_in.sku)).first():
        raise HTTPException(status_code=400, detail="Ya existe un activo con este SKU")
        
    db_asset = Asset(name=asset_in.name, sku=asset_in.sku, department=asset_in.department)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    return AssetRead(
        id=db_asset.id, name=db_asset.name, sku=db_asset.sku, department=db_asset.department, 
        current_stock=0
    )


@router.get("/products/{id}", response_model=AssetRead)
def get_asset(id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = db.get(Asset, id)
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
        
    return AssetRead(
        id=asset.id, name=asset.name, sku=asset.sku, department=asset.department, 
        current_stock=calculate_stock(db, asset.id)
    )

# -----------------------------------
# ENDPOINTS PARA ÓRDENES
# -----------------------------------
@router.post("/orders/inbound", response_model=AssetAcquisitionRead, status_code=201)
def create_inbound_order(order_in: AssetAcquisitionCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = db.get(Asset, order_in.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
        
    db_order = AssetAcquisition(asset_id=order_in.asset_id, quantity=order_in.quantity, user_uuid=current_user['id'])
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.post("/orders/outbound", response_model=AssetAssignmentRead, status_code=201)
def create_outbound_order(order_in: AssetAssignmentCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = db.get(Asset, order_in.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
        
    current_stock = calculate_stock(db, asset.id)
    if order_in.quantity > current_stock:
        raise HTTPException(
            status_code=400, 
            detail=f"Stock insuficiente en '{asset.department}'. Stock: {current_stock}, Solicitado: {order_in.quantity}."
        )
        
    db_order = AssetAssignment(asset_id=order_in.asset_id, quantity=order_in.quantity, user_uuid=current_user['id'])
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("/orders", response_model=OrdersAuditResponse)
def get_all_orders(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retorna todas las órdenes para auditoría general"""
    return {
        "inbound": db.exec(select(AssetAcquisition)).all(),
        "outbound": db.exec(select(AssetAssignment)).all()
    }
