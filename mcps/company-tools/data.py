"""
data.py — Datos iniciales de TrackFlow para el Servidor MCP

Refleja el catálogo y proveedores oficiales de la compañía
definidos en contracts.ts y seed.py de TrackFlow.
"""

from typing import Any, Dict, List

PRODUCTS_DB: List[Dict[str, Any]] = [
    {
        "sku": "TF-ELEC-001",
        "name": "Auriculares Bluetooth Noise-Cancelling",
        "category": "Electronics",
        "warehouse": "Zaragoza",
        "stock_quantity": 14,
        "min_stock_threshold": 25,
        "unit_cost_usd": 65.0,
        "is_fragile": True,
        "status": "Low stock",
    },
    {
        "sku": "TF-FASH-002",
        "name": "Camiseta Deportiva Transpirable TrackTech",
        "category": "Fashion",
        "warehouse": "Zaragoza",
        "stock_quantity": 120,
        "min_stock_threshold": 30,
        "unit_cost_usd": 18.5,
        "is_fragile": False,
        "status": "Active",
    },
    {
        "sku": "TF-ELEC-003",
        "name": "Monitor Gaming 27\" UltraHD",
        "category": "Electronics",
        "warehouse": "Los Angeles",
        "stock_quantity": 8,
        "min_stock_threshold": 15,
        "unit_cost_usd": 240.0,
        "is_fragile": True,
        "status": "Low stock",
    },
    {
        "sku": "TF-COSM-004",
        "name": "Serum Facial Hidratante Bio",
        "category": "Cosmetics",
        "warehouse": "Zaragoza",
        "stock_quantity": 0,
        "min_stock_threshold": 20,
        "unit_cost_usd": 12.0,
        "is_fragile": True,
        "status": "Out of stock",
    },
    {
        "sku": "TF-HOME-005",
        "name": "Lámpara de Escritorio LED Ergonómica",
        "category": "Home",
        "warehouse": "Los Angeles",
        "stock_quantity": 55,
        "min_stock_threshold": 10,
        "unit_cost_usd": 32.0,
        "is_fragile": False,
        "status": "Active",
    },
]

SUPPLIERS_DB: List[Dict[str, Any]] = [
    {
        "id": "sup-001",
        "name": "UPS Ground",
        "country": "USA",
        "category": "carrier_last_mile",
        "service_zone": "West Coast",
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "contact_email": "business@ups.com",
    },
    {
        "id": "sup-002",
        "name": "DHL Express Air",
        "country": "USA",
        "category": "carrier_air_freight",
        "service_zone": "International / Cross-border",
        "rate_per_shipment": 18.50,
        "currency": "USD",
        "status": "active",
        "contact_email": "support@dhl.com",
    },
    {
        "id": "sup-003",
        "name": "Correos Express",
        "country": "Spain",
        "category": "carrier_last_mile",
        "service_zone": "Península y Baleares",
        "rate_per_shipment": 4.80,
        "currency": "EUR",
        "status": "active",
        "contact_email": "empresas@correosexpress.com",
    },
    {
        "id": "sup-004",
        "name": "SEUR Frío y Urgente",
        "country": "Spain",
        "category": "carrier_specialized",
        "service_zone": "Península Ibérica",
        "rate_per_shipment": 8.90,
        "currency": "EUR",
        "status": "active",
        "contact_email": "atencion@seur.net",
    },
]
