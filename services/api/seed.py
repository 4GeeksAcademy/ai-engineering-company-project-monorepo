"""
seed.py — Cargador de datos iniciales del Directorio de Proveedores

¿Qué hace un seeder?
--------------------
Carga los datos de los 15 proveedores actuales de Carlos (USA) y Ana (Spain)
que hoy viven en hojas de cálculo separadas. El seeder los migra a TinyDB
en el primer arranque — no en cada arranque. Si los datos ya existen, los omite.

Cómo ejecutarlo:
----------------
  uv run seed        (requiere uv instalado)
  python3 seed.py    (alternativa directa)

Anti-duplicados:
----------------
Antes de insertar, busca si ya existe un proveedor con el mismo nombre.
Esto hace que el seeder sea idempotente: puedes ejecutarlo 10 veces
y la base de datos tendrá siempre los mismos 15 registros, sin duplicados.
"""

from __future__ import annotations

from datetime import datetime, timezone

from database import suppliers_table, Supplier as SupplierQuery

# ─────────────────────────────────────────────────────────────
# DATOS INICIALES — exactamente los definidos en CONTEXT-trackflow.md
# Estos son los proveedores reales de Carlos Vega y Ana Whitfield.
# ─────────────────────────────────────────────────────────────

SUPPLIERS_SEED = [
    {
        "name": "UPS Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Carrier principal para entregas locales en Los Ángeles y alrededores.",
    },
    {
        "name": "FedEx Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com",
    },
    {
        "name": "DHL Express USA",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Usado para envíos urgentes y exportaciones a Europa.",
    },
    {
        "name": "OnTrac",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Carrier regional. Mejor tarifa en la zona de Los Ángeles.",
    },
    {
        "name": "Laser Ship",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspendido. Tasa de incidencias superior al 8% en Q3.",
    },
    {
        "name": "PackSource LA",
        "country": "USA",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Cajas, relleno y precinto para el almacén de Los Ángeles.",
    },
    {
        "name": "CleanTeam West",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Tarifa mensual por servicio de limpieza del almacén de LA.",
    },
    {
        "name": "MRW España",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Carrier principal para entregas en España. Contrato negociado por volumen.",
    },
    {
        "name": "SEUR",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica + Baleares",
        "contact_email": "grandes.cuentas@seur.com",
    },
    {
        "name": "DHL Express España",
        "country": "Spain",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "España + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Envíos urgentes y exportaciones desde Zaragoza.",
    },
    {
        "name": "Nacex",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragón y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Carrier regional con buena cobertura en Aragón.",
    },
    {
        "name": "Logística Inversa Iberia",
        "country": "Spain",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Gestión de devoluciones para el almacén de Zaragoza.",
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": "Spain",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es",
    },
    {
        "name": "SAP WM Cloud",
        "country": "USA",
        "categories": ["it_and_wms_software"],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspendido. Andrés está evaluando alternativas más ligeras.",
    },
    {
        "name": "ReturnBear",
        "country": "USA",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Gestión de devoluciones para clientes de Los Ángeles.",
    },
]


def run_seed() -> None:
    """
    Inserta los proveedores del CONTEXT en TinyDB.
    - Idempotente: si el proveedor ya existe (por nombre), lo omite.
    - Informa en consola cuántos registros se insertaron.
    """
    inserted = 0
    skipped = 0

    for supplier_data in SUPPLIERS_SEED:
        # Comprobar si ya existe un proveedor con ese nombre
        # suppliers_table.search devuelve una lista — si está vacía, no existe
        existing = suppliers_table.search(
            SupplierQuery.name == supplier_data["name"]
        )

        if existing:
            skipped += 1
            continue

        # Añadir updated_at generado por el sistema (el cliente nunca lo envía)
        supplier_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        suppliers_table.insert(supplier_data)
        inserted += 1

    print(f"\n✅ Seeder completado:")
    print(f"   Insertados : {inserted}")
    print(f"   Omitidos (ya existían): {skipped}")
    print(f"   Total en BD: {suppliers_table.count(SupplierQuery.name.exists())}\n")


if __name__ == "__main__":
    run_seed()
