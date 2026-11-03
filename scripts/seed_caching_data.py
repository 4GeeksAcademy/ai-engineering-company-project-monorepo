import sys
import os
import random
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, select
from services.api.database import engine, get_tinydb
from services.api.models import Asset, AssetAcquisition, AssetAssignment

DEPARTMENTS = ["IT", "Ventas", "Marketing", "Operaciones", "Soporte", "RRHH", "Finanzas", "Legal"]
CATEGORIES = ["Hardware", "Software", "Mobiliario", "Periféricos", "Servicios Cloud", "Seguridad"]
COUNTRIES = ["España", "México", "Colombia", "Argentina", "Chile", "EEUU", "Alemania"]

ITEM_NAMES = [
    ("Laptop ThinkPad X1", "LAP-TP", "IT"),
    ("Monitor Dell 27 4K", "MON-DL", "IT"),
    ("Teclado Mecánico Keychron", "KB-KC", "IT"),
    ("Licencia Zoom Pro", "LIC-ZM", "Ventas"),
    ("Licencia Slack Enterprise", "LIC-SLK", "Operaciones"),
    ("Silla Ergonómica Herman Miller", "FUR-HM", "RRHH"),
    ("Auriculares Sony WH-1000XM5", "AUD-SNY", "Soporte"),
    ("Webcam Logitech Brio", "CAM-LOG", "Marketing"),
    ("Servidor Backup NAS", "SRV-NAS", "IT"),
    ("Licencia Figma Org", "LIC-FGM", "Marketing"),
    ("Mesa Elevable Eléctrica", "FUR-DESK", "Operaciones"),
    ("Licencia Datadog APM", "LIC-DD", "IT"),
    ("Docking Station CalDigit", "DCK-CAL", "IT"),
    ("Tablet iPad Air 256GB", "TAB-IPD", "Ventas"),
    ("Micrófono Shure MV7", "MIC-SHR", "Marketing"),
]

def seed_database():
    print("🌱 Iniciando Seeder de rendimiento para Caching...")

    with Session(engine) as session:
        created_assets = []
        for i in range(1, 101):
            base_name, prefix, dept = random.choice(ITEM_NAMES)
            sku = f"{prefix}-{i:03d}"
            name = f"{base_name} Gen-{random.randint(1, 5)} (Lote {i})"

            existing = session.exec(select(Asset).where(Asset.sku == sku)).first()
            if not existing:
                asset = Asset(name=name, sku=sku, department=dept)
                session.add(asset)
                session.commit()
                session.refresh(asset)
                created_assets.append(asset)
            else:
                created_assets.append(existing)

        print(f"📦 Total Activos en catálogo: {len(created_assets)}")

        acquisitions_count = 0
        assignments_count = 0

        for asset in created_assets:
            inbound_qty = random.randint(20, 100)
            acq = AssetAcquisition(
                asset_id=asset.id,
                quantity=inbound_qty,
                user_uuid=f"USER-SEED-{random.randint(1, 20)}",
                created_at=datetime.utcnow() - timedelta(days=random.randint(10, 60))
            )
            session.add(acq)
            acquisitions_count += 1

            outbound_qty = random.randint(5, inbound_qty - 5)
            assign = AssetAssignment(
                asset_id=asset.id,
                quantity=outbound_qty,
                user_uuid=f"USER-SEED-{random.randint(1, 20)}",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 9))
            )
            session.add(assign)
            assignments_count += 1

        session.commit()
        print(f"📥 Entradas registradas (AssetAcquisitions): {acquisitions_count}")
        print(f"📤 Salidas registradas (AssetAssignments): {assignments_count}")

    # Poblar proveedores en TinyDB
    tinydb = get_tinydb()
    if len(tinydb.all()) < 25:
        print("🏪 Poblando proveedores en TinyDB...")
        for i in range(1, 31):
            tinydb.insert({
                "name": f"Proveedor Global {i} S.L.",
                "country": random.choice(COUNTRIES),
                "categories": random.sample(CATEGORIES, k=random.randint(1, 3)),
                "hourly_rate": round(random.uniform(45.0, 150.0), 2),
                "status": "active" if random.random() > 0.15 else "suspended",
                "updated_at": datetime.utcnow().isoformat()
            })
        print(f"✅ TinyDB Suppliers poblado con {len(tinydb.all())} registros.")

    print("🚀 ¡Seeder completado con éxito! Base de datos lista con carga realista.")

if __name__ == "__main__":
    seed_database()