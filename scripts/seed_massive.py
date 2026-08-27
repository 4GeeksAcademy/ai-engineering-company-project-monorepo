"""
scripts/seed_massive.py — Carga masiva de datos realistas para benchmarking de caché

Genera:
  - 500+ suppliers en db.json (tabla suppliers)
  - 500+ incidents en incidentes_db.json (tabla incidents)

Los datos son variados y coherentes para que filtros, joins, ordenaciones
y agregaciones cuesten trabajo de verdad — no placeholders duplicados.

Ejecución:
  cd services/api && python3 ../../scripts/seed_massive.py

Idempotente: si los datos ya existen, pregunta antes de sobrescribir.
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────

SUPPLIERS_COUNT = 500
INCIDENTS_COUNT = 500

# Rutas relativas a services/api/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────
# DATOS SEMILLA — realistas y variados
# ─────────────────────────────────────────────────────────────

COUNTRIES = ["USA", "Spain"]

CURRENCIES = {"USA": "USD", "Spain": "EUR"}

CATEGORIES = [
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]

STATUSES = ["active", "suspended"]

SERVICE_ZONES_USA = [
    "West Coast", "East Coast", "Continental USA", "Midwest",
    "South East", "South West", "Pacific Northwest", "Continental USA + International",
    "Northeast", "Rocky Mountains",
]

SERVICE_ZONES_SPAIN = [
    "Península Ibérica", "Aragón y zona norte", "Levante",
    "Andalucía", "Cataluña", "País Vasco y norte",
    "Centro peninsular", "Península Ibérica + Baleares",
    "Canarias", "España + Internacional",
]

# Datos para generar nombres realistas
USA_PREFIXES = [
    "QuickShip", "FastLog", "PrimeCarrier", "ExpressLine", "TruckMate",
    "SpeedFreight", "CargoPro", "TransPlus", "RapidLogistics", "StarTrans",
    "PioneerShipping", "MetroCarrier", "EliteFreight", "SummitLogistics", "PeakTransit",
    "IronHorse", "SilverLine", "GoldenState", "PacificRim", "Atlantic",
    "CrossCountry", "Heartland", "SunBelt", "Redwood", "Prairie",
]

USA_SUFFIXES = [
    "Inc.", "LLC", "Corp.", "Logistics", "Transport", "Group",
    "Solutions", "Worldwide", "USA", "Co.",
]

SPAIN_PREFIXES = [
    "Transportes", "Logística", "Mensajería", "Envialia", "RedLogis",
    "GrupoLogístico", "CorreoExpress", "Paquetería", "Distribuciones", "CargaPlus",
    "TransporteRápido", "LogisIbérica", "Mensajeros", "Furgonetas", "Envíos",
]

SPAIN_SUFFIXES = [
    "S.L.", "S.A.", "S.L.U.", "España", "Ibérica", "del Mediterráneo",
    "del Norte", "del Sur", "Express", "Global",
]

# Nombres realistas para incidencias
INCIDENT_TITLES = [
    "Paquete perdido en tránsito",
    "Retraso en la entrega programada",
    "Daños en el embalaje del producto",
    "Error en la dirección de envío",
    "Devolución no procesada correctamente",
    "Producto equivocado en el pedido",
    "Fallo en el sistema de tracking",
    "Problema con el transportista asignado",
    "Discrepancia en el inventario del almacén",
    "Cliente reporta paquete no recibido",
    "Incidente de seguridad en la carga",
    "Error en la documentación aduanera",
    "Problema de facturación del envío",
    "Fuga en el embalaje de líquidos",
    "Mercancía perecedera en mal estado",
    "Exceso de peso no declarado",
    "Problema de etiquetado de productos",
    "Error en la consolidación de pedidos",
    "Paquete abierto o manipulado",
    "Fallo en la recogida programada",
    "Problema con la firma de recepción",
    "Error en la clasificación de paquetes",
    "Retraso por inclemencia meteorológica",
    "Problema con el código postal",
    "Incidente en la rampa de carga",
    "Error en la ruta de reparto",
    "Paquete devuelto por dirección incorrecta",
    "Problema con el pago del servicio",
    "Fallo en la comunicación con el carrier",
    "Discrepancia en el peso registrado",
]

INCIDENT_DESCRIPTIONS = [
    "El paquete fue escaneado por última vez en el centro de distribución y no se ha registrado movimiento en 48 horas. Se ha iniciado la investigación con el transportista.",
    "El cliente reporta que la fecha de entrega estimada ya pasó y el paquete no ha llegado. El seguimiento muestra retraso en el centro de clasificación.",
    "Al recibir el paquete, el cliente informa que la caja presenta abolladuras y el producto interior está dañado. Se requiere reemplazo urgente.",
    "La dirección de envío proporcionada por el cliente tiene un error tipográfico en el código postal. El paquete fue redirigido a la central de clasificación.",
    "El cliente inició una devolución hace 5 días y el paquete aún no aparece registrado en el almacén de devoluciones. Se necesita localizar el envío.",
    "El pedido contenía un artículo diferente al solicitado. El cliente rechazó la entrega y solicita el reemplazo correcto con carácter urgente.",
    "El sistema de tracking no actualiza la ubicación desde hace 72 horas. El equipo de TI está investigando si es un problema del sistema o del carrier.",
    "El transportista asignado no se presentó en la ventana de recogida acordada. Se ha reasignado a un carrier alternativo para minimizar el retraso.",
    "El inventario físico del almacén muestra 15 unidades menos de las registradas en el sistema. Se está realizando un recuento manual.",
    "El cliente afirma que el paquete fue marcado como entregado pero no lo ha recibido. Se solicita la prueba de entrega al transportista.",
]

# Funciones de generación de datos
def _random_currency(country: str) -> str:
    return CURRENCIES[country]

def _random_categories() -> list[str]:
    n = random.randint(1, 3)
    return random.sample(CATEGORIES, n)

def _random_service_zone(country: str) -> str | None:
    if random.random() < 0.7:
        zones = SERVICE_ZONES_USA if country == "USA" else SERVICE_ZONES_SPAIN
        return random.choice(zones)
    return None

def _random_email(name: str) -> str:
    # Limpiar nombre para email
    clean = name.lower().replace(" ", ".").replace("ñ", "n").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    domains = [".com", ".es", ".eu", ".net", ".io"]
    return f"contacto@{clean}{random.choice(domains)}"

def _random_notes(country: str) -> str | None:
    if random.random() < 0.3:
        notes_pool = [
            "Contrato negociado por volumen.",
            "Carrier alternativo para picos de demanda.",
            "En evaluación para renovación trimestral.",
            "Buen historial de cumplimiento.",
            "Nuevo proveedor, en período de prueba.",
            "Tarifa preferencial por acuerdo marco.",
            "Requiere supervisión adicional en calidad.",
            "Proveedor certificado por la central.",
            "Servicio prioritario 24/7.",
            "Pendiente de auditoría de cumplimiento.",
        ]
        return random.choice(notes_pool)
    return None

def generate_supplier(i: int) -> dict:
    country = random.choice(COUNTRIES)
    if country == "USA":
        name = f"{random.choice(USA_PREFIXES)} {random.choice(USA_SUFFIXES)}"
        # Añadir un número para dar variedad
        name = f"{name} #{i}"
    else:
        name = f"{random.choice(SPAIN_PREFIXES)} {random.choice(SPAIN_SUFFIXES)} #{i}"

    status = random.choices(STATUSES, weights=[0.85, 0.15])[0]  # 85% active
    rate = round(random.uniform(0.15, 25.0), 2)

    return {
        "name": name,
        "country": country,
        "categories": _random_categories(),
        "rate_per_shipment": rate,
        "currency": _random_currency(country),
        "status": status,
        "service_zone": _random_service_zone(country),
        "contact_email": _random_email(name.replace(" ", "").replace("#", "").replace(".", "")),
        "notes": _random_notes(country),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

def generate_incident(i: int) -> dict:
    status = random.choices(
        ["open", "in_progress", "resolved", "discarded"],
        weights=[0.25, 0.25, 0.35, 0.15],
    )[0]
    category = random.choice(list({
        "lost_parcel", "delivery_failure", "inventory_discrepancy",
        "carrier_issue", "returns_issue", "system_failure",
        "client_complaint", "other",
    }))
    origin = random.choice(["customer", "branch", "internal"])
    branch = random.choice([
        "central", "la_warehouse", "la_office",
        "zaragoza_warehouse", "zaragoza_office",
    ])

    title = random.choice(INCIDENT_TITLES)
    description = random.choice(INCIDENT_DESCRIPTIONS)

    # Fechas variadas en los últimos 90 días
    days_ago = random.randint(0, 90)
    created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)

    updated_at = created_at
    if status == "in_progress":
        updated_at = created_at + timedelta(hours=random.randint(1, 48))
    elif status == "resolved":
        updated_at = created_at + timedelta(hours=random.randint(2, 168))
    elif status == "discarded":
        updated_at = created_at + timedelta(hours=random.randint(1, 72))

    return {
        "incident_id": i,
        "title": title,
        "description": description,
        "category": category,
        "origin": origin,
        "branch": branch,
        "status": status,
        "created_at": created_at.isoformat(),
        "updated_at": updated_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────
# PERSISTENCIA
# ─────────────────────────────────────────────────────────────

def seed_suppliers(force: bool = False) -> int:
    """Inserta suppliers en db.json. Devuelve número de insertados."""
    db_path = os.path.join(BASE_DIR, "db.json")
    from tinydb import TinyDB, Query

    db = TinyDB(db_path)
    table = db.table("suppliers")
    SupplierQuery = Query()

    # Verificar si ya hay datos
    existing_count = table.count(SupplierQuery.name.exists())
    if existing_count > 15 and not force:
        print(f"⚠️  Ya hay {existing_count} proveedores en db.json. Usa --force para sobrescribir.")
        return 0

    if force:
        table.truncate()
        print("🗑️  Tabla suppliers truncada.")

    inserted = 0
    for i in range(1, SUPPLIERS_COUNT + 1):
        supplier = generate_supplier(i)
        # Verificar duplicado por nombre
        existing = table.search(SupplierQuery.name == supplier["name"])
        if existing:
            continue
        table.insert(supplier)
        inserted += 1

    print(f"✅ Proveedores insertados: {inserted}")
    print(f"   Total en tabla: {table.count(SupplierQuery.name.exists())}")
    return inserted


def seed_incidents(force: bool = False) -> int:
    """Inserta incidents en incidentes_db.json. Devuelve número de insertados."""
    db_path = os.path.join(BASE_DIR, "incidentes_db.json")
    from tinydb import TinyDB, Query

    db = TinyDB(db_path)
    table = db.table("incidents")
    IncidentQuery = Query()

    # Verificar si ya hay datos
    existing_count = len(table.all())
    if existing_count > 0 and not force:
        print(f"⚠️  Ya hay {existing_count} incidencias en incidentes_db.json. Usa --force para sobrescribir.")
        return 0

    if force:
        table.truncate()
        print("🗑️  Tabla incidents truncada.")

    inserted = 0
    for i in range(1, INCIDENTS_COUNT + 1):
        incident = generate_incident(i)
        table.insert(incident)
        inserted += 1

    print(f"✅ Incidencias insertadas: {inserted}")
    print(f"   Total en tabla: {len(table.all())}")
    return inserted


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    force = "--force" in sys.argv

    print("=" * 60)
    print("🌱 SEED MASIVO — Datos realistas para caché benchmarking")
    print("=" * 60)

    s = seed_suppliers(force=force)
    i = seed_incidents(force=force)

    print("\n" + "=" * 60)
    print(f"📊 RESUMEN: {s} suppliers + {i} incidents")
    print("=" * 60)
    print("\n💡 Ahora inicia el backend y verifica los tiempos con el middleware de timing.")
    print("   Los endpoints lentos (sin caché) serán evidentes con estos datos.")