"""Seed script for initial inventory data in Supabase (PostgreSQL).

Usage:
    python -m src.seed_inventory

Or from the project root:
    PYTHONPATH=. python services/api/src/seed_inventory.py
"""

from __future__ import annotations

from sqlmodel import Session, select

from src.database import engine
from src.models.models import SKU, SKUEntry, SKUExit


def seed_inventory() -> int:
    """Insert initial test data into Supabase and return the row count."""

    # ── 1. Check whether data already exists ─────────────────────────────
    with Session(engine) as session:
        existing = session.exec(select(SKU)).first()
        if existing is not None:
            print("La base de datos ya contiene SKUs. No se insertaron datos duplicados.")
            return 0

    # ── 2. Create two SKU products ───────────────────────────────────────
    sku_la = SKU(
        name="Widget Aluminio",
        sku_code="WH-LA-001",
        warehouse="Los Angeles",
    )
    sku_zg = SKU(
        name="Componente Plástico",
        sku_code="WH-ZG-001",
        warehouse="Zaragoza",
    )

    with Session(engine) as session:
        session.add(sku_la)
        session.add(sku_zg)
        session.commit()
        session.refresh(sku_la)
        session.refresh(sku_zg)
        print(f"  ✓ SKU creado: {sku_la.name} ({sku_la.sku_code}) → {sku_la.warehouse}")
        print(f"  ✓ SKU creado: {sku_zg.name} ({sku_zg.sku_code}) → {sku_zg.warehouse}")

    # ── 3. Register inbound orders (100 units each) ─────────────────────
    entry_la = SKUEntry(
        sku_id=sku_la.id,
        quantity=100,
        user_uuid="seed-script",
    )
    entry_zg = SKUEntry(
        sku_id=sku_zg.id,
        quantity=100,
        user_uuid="seed-script",
    )

    with Session(engine) as session:
        session.add(entry_la)
        session.add(entry_zg)
        session.commit()
        session.refresh(entry_la)
        session.refresh(entry_zg)
        print(f"  ✓ Entrada: {entry_la.quantity} uds → {sku_la.sku_code}")
        print(f"  ✓ Entrada: {entry_zg.quantity} uds → {sku_zg.sku_code}")

    # ── 4. Register outbound orders (20 for LA, 50 for Zaragoza) ────────
    exit_la = SKUExit(
        sku_id=sku_la.id,
        quantity=20,
        user_uuid="seed-script",
    )
    exit_zg = SKUExit(
        sku_id=sku_zg.id,
        quantity=50,
        user_uuid="seed-script",
    )

    with Session(engine) as session:
        session.add(exit_la)
        session.add(exit_zg)
        session.commit()
        print(f"  ✓ Salida:  {exit_la.quantity} uds → {sku_la.sku_code}")
        print(f"  ✓ Salida:  {exit_zg.quantity} uds → {sku_zg.sku_code}")

    # ── 5. Summary ──────────────────────────────────────────────────────
    print()
    print("Resumen final:")
    print(f"  {sku_la.sku_code} ({sku_la.warehouse}): 100 (entrada) − 20 (salida) = 80 uds")
    print(f"  {sku_zg.sku_code} ({sku_zg.warehouse}): 100 (entrada) − 50 (salida) = 50 uds")
    print()
    print("Seed completado exitosamente.")

    return 0


def main() -> int:
    return seed_inventory()


if __name__ == "__main__":
    raise SystemExit(main())