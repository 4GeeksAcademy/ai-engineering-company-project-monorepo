"""Seeder for the supplier directory.

Loads the initial suppliers (``suppliers/seed_data.py``, from the supplier
CONTEXT) into TinyDB, validating each one through the Pydantic model first.

    python seed.py            # insert the initial suppliers not already present
    python seed.py --reset    # wipe the database and reload the initial data

The API also seeds an empty database on startup, so it never boots empty.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone

from tinydb import TinyDB

from core.config import get_suppliers_db_path
from suppliers.schemas import SupplierCreate
from suppliers.seed_data import SUPPLIERS_SEED


def seed_database(db: TinyDB, *, reset: bool = False) -> tuple[int, int]:
    """Insert the initial suppliers that aren't already in the database.

    A supplier counts as already present when one with the same name
    (case-insensitive) exists, so running the seeder twice never duplicates
    data. Returns ``(inserted, skipped)``.
    """
    if reset:
        db.truncate()

    existing = {doc["name"].casefold() for doc in db.all()}
    timestamp = datetime.now(timezone.utc).isoformat()
    inserted = skipped = 0
    for entry in SUPPLIERS_SEED:
        supplier = SupplierCreate(**entry)
        if supplier.name.casefold() in existing:
            skipped += 1
            continue
        db.insert({**supplier.model_dump(mode="json"), "updated_at": timestamp})
        existing.add(supplier.name.casefold())
        inserted += 1
    return inserted, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the supplier directory into TinyDB.")
    parser.add_argument("--reset", action="store_true", help="wipe existing data before seeding")
    args = parser.parse_args()

    path = get_suppliers_db_path()
    with TinyDB(path) as db:
        inserted, skipped = seed_database(db, reset=args.reset)
        total = len(db)

    print(f"Seeding finished: {inserted} records inserted, {skipped} skipped (already present).")
    print(f"Total suppliers in database: {total} ({path})")


if __name__ == "__main__":
    main()
