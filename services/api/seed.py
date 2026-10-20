from __future__ import annotations

import sys
from pathlib import Path

from tinydb import Query

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from services.api.database import suppliers_table  # noqa: E402
from services.api.models import Supplier, SupplierCategory, SupplierCountry  # noqa: E402

INITIAL_SUPPLIERS = [
    {
        "name": "UPS Ground",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Carrier principal para entregas locales en Los Angeles y alrededores.",
    },
    {
        "name": "FedEx Ground",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com",
    },
    {
        "name": "DHL Express USA",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CARRIER_LAST_MILE, SupplierCategory.CARRIER_INTERNATIONAL],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Usado para envios urgentes y exportaciones a Europa.",
    },
    {
        "name": "OnTrac",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Carrier regional. Mejor tarifa en la zona de Los Angeles.",
    },
    {
        "name": "Laser Ship",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspendido. Tasa de incidencias superior al 8% en Q3.",
    },
    {
        "name": "PackSource LA",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.PACKAGING_MATERIALS],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Cajas, relleno y precinto para el almacen de Los Angeles.",
    },
    {
        "name": "CleanTeam West",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.CLEANING_AND_FACILITIES],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Tarifa mensual por servicio de limpieza del almacen de LA.",
    },
    {
        "name": "MRW España",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Carrier principal para entregas en España. Contrato negociado por volumen.",
    },
    {
        "name": "SEUR",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica + Baleares",
        "contact_email": "grandes.cuentas@seur.com",
    },
    {
        "name": "DHL Express España",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.CARRIER_LAST_MILE, SupplierCategory.CARRIER_INTERNATIONAL],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "España + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Envios urgentes y exportaciones desde Zaragoza.",
    },
    {
        "name": "Nacex",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.CARRIER_LAST_MILE],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragón y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Carrier regional con buena cobertura en Aragón.",
    },
    {
        "name": "Logística Inversa Iberia",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.REVERSE_LOGISTICS],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Gestión de devoluciones para el almacen de Zaragoza.",
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": SupplierCountry.SPAIN,
        "categories": [SupplierCategory.PACKAGING_MATERIALS],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es",
    },
    {
        "name": "SAP WM Cloud",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.IT_AND_WMS_SOFTWARE],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspendido. Andrés está evaluando alternativas más ligeras para el almacen de LA.",
    },
    {
        "name": "ReturnBear",
        "country": SupplierCountry.USA,
        "categories": [SupplierCategory.REVERSE_LOGISTICS],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Gestión de devoluciones para clientes de Los Angeles.",
    },
]


def main() -> None:
    inserted = 0
    supplier_query = Query()
    for data in INITIAL_SUPPLIERS:
        supplier = Supplier(**data)
        record = supplier.model_dump(mode="json")
        exists = suppliers_table.contains(
            (supplier_query.name == record["name"])
            & (supplier_query.country == record["country"])
        )
        if not exists:
            suppliers_table.insert(record)
            inserted += 1
    print(f"Proveedores insertados: {inserted}")


if __name__ == "__main__":
    main()