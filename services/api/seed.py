from __future__ import annotations

from services.api.database import seed_suppliers


def main() -> None:
    inserted = seed_suppliers()
    print(f"Seeder finished. Inserted {inserted} supplier records.")


if __name__ == "__main__":
    main()
