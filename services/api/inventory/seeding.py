"""Seed data for the inventory (from the CONTEXT's "Datos Semilla") and the seeder.

    uv run seed-inventory            # load the seed when the inventory is empty
    uv run seed-inventory --reset    # wipe assets and orders, then reload it

The seed goes through the same rules as the API: every outbound order is checked against
the stock the entries already gave, so a seed that over-consumes fails loudly instead of
leaving negative stock behind. On the local SQLite fallback the API seeds an empty
database at startup; on Supabase (DATABASE_URL set) run the command above yourself.
"""

from __future__ import annotations

import argparse
from uuid import UUID

from sqlmodel import Session, delete, func, select

from core.config import get_database_url, uses_local_inventory_db
from users import service as users_service
from users.schemas import Role

from . import service
from .database import get_engine, init_db
from .models import Asset, AssetEntry, AssetExit
from .schemas import AssetCreate, AssetEntryCreate, AssetExitCreate

# Fallback author when there is no admin yet. Nothing references it: user_uuid is a plain column.
SYSTEM_USER_UUID = str(UUID(int=0))

ASSETS = [
    {"name": 'Portátil 14" Business', "sku": "NXV-IT-001", "category": "hardware", "office": "Valencia"},
    {"name": 'Portátil 14" Business', "sku": "NXV-IT-002", "category": "hardware", "office": "Miami"},
    {"name": "Ratón ergonómico", "sku": "NXV-PER-001", "category": "peripherals", "office": "Valencia"},
    {"name": "Hub USB-C", "sku": "NXV-PER-002", "category": "peripherals", "office": "Miami"},
    {"name": "Resma de papel A4", "sku": "NXV-OFF-001", "category": "office_supplies", "office": "Valencia"},
    {"name": "Cuaderno de formación en liderazgo", "sku": "NXV-TRN-001", "category": "training_materials", "office": "Valencia"},
]

ENTRIES = [
    {"sku": "NXV-IT-001", "quantity": 10, "supplier": "TechDistrib Valencia S.L.", "office": "Valencia"},
    {"sku": "NXV-IT-001", "quantity": 5, "supplier": "TechDistrib Valencia S.L.", "office": "Valencia"},
    {"sku": "NXV-IT-002", "quantity": 6, "supplier": "Office Depot Miami", "office": "Miami"},
    {"sku": "NXV-PER-001", "quantity": 30, "supplier": "TechDistrib Valencia S.L.", "office": "Valencia"},
    {"sku": "NXV-PER-002", "quantity": 25, "supplier": "Office Depot Miami", "office": "Miami"},
    {"sku": "NXV-OFF-001", "quantity": 100, "supplier": "Papelería Central Valencia S.L.", "office": "Valencia"},
    {"sku": "NXV-TRN-001", "quantity": 40, "supplier": "Formación Ibérica S.L.", "office": "Valencia"},
]

EXITS = [
    {"sku": "NXV-IT-001", "quantity": 3, "exit_type": "allocation", "assigned_to": "María López", "office": "Valencia"},
    {"sku": "NXV-IT-002", "quantity": 1, "exit_type": "allocation", "assigned_to": "John Smith", "office": "Miami"},
    {"sku": "NXV-PER-001", "quantity": 4, "exit_type": "allocation", "assigned_to": "Carlos Ruiz", "office": "Valencia"},
    {"sku": "NXV-OFF-001", "quantity": 20, "exit_type": "consumption", "assigned_to": None, "office": "Valencia"},
]


def seed_author() -> str:
    """The TinyDB user the seeded orders are attributed to: the first admin, else a system id."""
    for doc in users_service.get_db().all():
        if doc.get("role") == Role.admin.value:
            return str(doc["id"])
    return SYSTEM_USER_UUID


def seed_inventory(session: Session, *, user_uuid: str, reset: bool = False) -> tuple[int, int, int]:
    """Load the seed when the inventory is empty. Returns ``(assets, entries, exits)`` inserted.

    Idempotent: with data already present it inserts nothing (use ``reset`` to start over).
    """
    if reset:
        for table in (AssetExit, AssetEntry, Asset):  # children first, the FK points at assets
            session.exec(delete(table))
        session.commit()
    if session.exec(select(func.count()).select_from(Asset)).one() > 0:
        return 0, 0, 0

    by_sku = {data["sku"]: service.create_asset(session, AssetCreate(**data)) for data in ASSETS}
    for data in ENTRIES:
        asset_id = by_sku[data["sku"]].id
        service.register_inbound(session, AssetEntryCreate(**{**data, "asset_id": asset_id}), user_uuid)
    for data in EXITS:
        asset_id = by_sku[data["sku"]].id
        service.register_outbound(session, AssetExitCreate(**{**data, "asset_id": asset_id}), user_uuid)
    return len(ASSETS), len(ENTRIES), len(EXITS)


def seed_local_if_empty() -> None:
    """Startup hook: seed the local SQLite fallback so the API never boots with an empty inventory."""
    if not uses_local_inventory_db():
        return
    with Session(get_engine()) as session:
        seed_inventory(session, user_uuid=seed_author())


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the inventory (assets, entries and exits).")
    parser.add_argument("--reset", action="store_true", help="wipe assets and orders before seeding")
    args = parser.parse_args()

    init_db()
    with Session(get_engine()) as session:
        assets, entries, exits = seed_inventory(session, user_uuid=seed_author(), reset=args.reset)
        stock = service.list_assets(session)
    if assets == 0:
        print("The inventory already has data: nothing inserted (use --reset to reload it).")
    else:
        print(f"Seeding finished: {assets} assets, {entries} inbound and {exits} outbound orders inserted.")
    for asset in stock:
        print(f"  {asset.sku:<12} {asset.office.value:<9} stock {asset.current_stock:>4}  {asset.name}")
    print(f"Database: {get_database_url().split('@')[-1]}")  # never print the credentials


if __name__ == "__main__":
    main()
