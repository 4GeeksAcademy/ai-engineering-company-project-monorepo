import sys
import os

sys.path.append(os.path.dirname(__file__))

from sqlmodel import Session, select
from database import engine
from models import Asset, AssetAcquisition

SEED_ASSETS = [
    {"name": "Licencia Salesforce", "sku": "LIC-SF-01", "department": "Ventas", "initial_stock": 20},
    {"name": "Auriculares Jabra", "sku": "HDST-JB-30", "department": "Soporte", "initial_stock": 30},
    {"name": "MacBook Pro M3", "sku": "LT-MBP-M3", "department": "IT", "initial_stock": 10},
]

def run_seed_inventory():
    with Session(engine) as session:
        print("Iniciando carga de inventario de Nexova...")
        for item in SEED_ASSETS:
            existing = session.exec(select(Asset).where(Asset.sku == item["sku"])).first()
            
            if not existing:
                # 1. Creamos el Activo
                asset = Asset(name=item["name"], sku=item["sku"], department=item["department"])
                session.add(asset)
                session.commit()
                session.refresh(asset)
                
                # 2. Creamos la entrada (Inbound) para darle el stock inicial
                acq = AssetAcquisition(
                    asset_id=asset.id, 
                    quantity=item["initial_stock"], 
                    user_uuid="SYSTEM_SEED" # Usamos un usuario del sistema para el inventario inicial
                )
                session.add(acq)
                session.commit()
                print(f"✅ Activo Creado: {asset.name} | Stock Inicial: {item['initial_stock']}")
            else:
                print(f"ℹ️ El activo {item['sku']} ya existe en la base de datos.")

if __name__ == "__main__":
    run_seed_inventory()
