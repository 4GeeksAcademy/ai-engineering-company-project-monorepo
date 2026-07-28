"""Seed script for initial logistics carriers in TinyDB."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from src.database import db, get_suppliers_table
from src.models.supplier import (
    SupplierCategory,
    SupplierCountry,
    SupplierResponse,
    SupplierStatus,
)


def build_seed_suppliers() -> list[SupplierResponse]:
    """Build the initial suppliers payload using validated Pydantic models."""

    seed_rows = [
        ("UPS", SupplierCountry.ESTADOS_UNIDOS),
        ("FedEx", SupplierCountry.ESTADOS_UNIDOS),
        ("DHL", SupplierCountry.ESTADOS_UNIDOS),
        ("MRW", SupplierCountry.ESPANA),
        ("SEUR", SupplierCountry.ESPANA),
        ("DHL", SupplierCountry.ESPANA),
    ]

    now = datetime.now(timezone.utc)
    suppliers: list[SupplierResponse] = []

    for nombre, pais in seed_rows:
        suppliers.append(
            SupplierResponse(
                id=str(uuid4()),
                nombre=nombre,
                pais=pais,
                categorias=[SupplierCategory.ULTIMA_MILLA],
                tarifa=10.0,
                estado=SupplierStatus.ACTIVO,
                updated_at=now,
            )
        )

    return suppliers


def main() -> int:
    suppliers_table = get_suppliers_table()

    if len(suppliers_table) > 0:
        print("La base de datos ya contiene registros. No se insertaron datos duplicados.")
        return 0

    suppliers = build_seed_suppliers()
    payload = [supplier.model_dump(mode="json") for supplier in suppliers]
    inserted_ids = suppliers_table.insert_multiple(payload)

    print(f"Registros insertados: {len(inserted_ids)}")
    db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
