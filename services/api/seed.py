from datetime import datetime, timezone

from tinydb import Query

from database import suppliers_table
from seed_data import SUPPLIERS_SEED


Supplier = Query()


def main() -> None:
    inserted = 0

    for supplier in SUPPLIERS_SEED:
        exists = suppliers_table.get(
            (Supplier.name == supplier["name"]) &
            (Supplier.country == supplier["country"])
        )

        if exists:
            continue

        doc = {
            **supplier,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        suppliers_table.insert(doc)
        inserted += 1

    print(f"Seeding completado. Registros insertados: {inserted}")


if __name__ == "__main__":
    main()
