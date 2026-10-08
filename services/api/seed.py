"""Load the initial supplier directory into TinyDB.

Run with `uv run seed`. Safe to run repeatedly: suppliers whose `name` already
exists are skipped, so the directory is never duplicated.
"""

from __future__ import annotations

from models import SupplierCreate
from database import SupplierRepository, db_path_from_env
from seed_data import SUPPLIERS_SEED


def seed(repository: SupplierRepository) -> tuple[int, int]:
    """Insert missing seed suppliers. Returns (inserted, skipped)."""
    inserted = skipped = 0
    for raw in SUPPLIERS_SEED:
        supplier = SupplierCreate.model_validate(raw)
        if repository.exists_name(supplier.name):
            skipped += 1
            continue
        repository.create(supplier)
        inserted += 1
    return inserted, skipped


def main() -> None:
    path = db_path_from_env()
    repository = SupplierRepository(path)
    try:
        inserted, skipped = seed(repository)
    finally:
        repository.close()
    print(f"Seed completed on {path}: {inserted} inserted, {skipped} skipped (already present).")


if __name__ == "__main__":
    main()
