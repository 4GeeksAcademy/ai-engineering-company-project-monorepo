# /// script
# requires-python = ">=3.11"
# dependencies = ["tinydb>=4.8.0"]
# ///
"""Seed the TinyDB database with initial Brasa Points suppliers.

Initial supplier data sourced from the Brasaland company context
(uis/backoffice/lib/data.ts — brasaPointsMembers).

Usage (via uv):
    uv run seed
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timezone
from pathlib import Path

from tinydb import TinyDB, Query

# ── Database path ────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "db.json"

# ── Initial supplier data (from company context) ────────────────
INITIAL_SUPPLIERS: list[dict] = [
    {
        "full_name": "Camila Ospina",
        "email": "camila.ospina@email.com",
        "phone": "+57 310 123 4567",
        "country": "Colombia",
        "city": "Medellín",
        "favorite_location": "Brasaland El Poblado",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Social media",
        "date_of_birth": "1990-06-15",
        "accepts_terms": True,
        "wants_email_offers": True,
        "product_category": "Meat",
        "rate": 4.5,
        "status": "active",
    },
    {
        "full_name": "Santiago Rodríguez",
        "email": "santiago.r@email.com",
        "phone": "+57 315 987 6543",
        "country": "Colombia",
        "city": "Bogotá",
        "favorite_location": "Brasaland Zona Rosa",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Recommendation",
        "date_of_birth": "1988-03-22",
        "accepts_terms": True,
        "wants_email_offers": False,
        "product_category": "Produce",
        "rate": 4.2,
        "status": "active",
    },
    {
        "full_name": "María Fernanda López",
        "email": "mafe.lopez@email.com",
        "phone": "+1 305 555 1234",
        "country": "United States",
        "city": "Miami",
        "favorite_location": "Brasaland Brickell",
        "dietary_preferences": ["Gluten-free"],
        "how_did_you_find_us": "Walked by",
        "date_of_birth": "1995-11-08",
        "accepts_terms": True,
        "wants_email_offers": True,
        "product_category": "Beverages",
        "rate": 4.8,
        "status": "active",
    },
    {
        "full_name": "Juan Esteban Giraldo",
        "email": "jegiraldo@email.com",
        "phone": "+57 301 456 7890",
        "country": "Colombia",
        "city": "Medellín",
        "favorite_location": "Brasaland Laureles",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Internet search",
        "date_of_birth": "1992-07-01",
        "accepts_terms": True,
        "wants_email_offers": True,
        "product_category": "Dairy",
        "rate": 3.9,
        "status": "active",
    },
    {
        "full_name": "Andrea Mejía",
        "email": "andrea.mejia@email.com",
        "phone": "+1 407 555 5678",
        "country": "United States",
        "city": "Orlando",
        "favorite_location": "Brasaland Downtown",
        "dietary_preferences": ["Vegetarian"],
        "how_did_you_find_us": "Social media",
        "date_of_birth": "1993-08-18",
        "accepts_terms": True,
        "wants_email_offers": False,
        "product_category": "Seafood",
        "rate": 4.1,
        "status": "active",
    },
    {
        "full_name": "Carlos Andrés Pérez",
        "email": "carlos.perez@email.com",
        "phone": "+57 318 234 5678",
        "country": "Colombia",
        "city": "Cali",
        "favorite_location": "Brasaland Granada",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Recommendation",
        "date_of_birth": "1987-05-12",
        "accepts_terms": True,
        "wants_email_offers": True,
        "product_category": "Spices",
        "rate": 4.6,
        "status": "active",
    },
    {
        "full_name": "Isabella Martinez",
        "email": "isa.martinez@email.com",
        "phone": "+1 305 555 9012",
        "country": "United States",
        "city": "Miami",
        "favorite_location": "Brasaland Coral Gables",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Other",
        "date_of_birth": "1996-01-20",
        "accepts_terms": True,
        "wants_email_offers": True,
        "product_category": "Meat",
        "rate": 4.3,
        "status": "suspended",
    },
    {
        "full_name": "Laura Valentina Restrepo",
        "email": "laura.restrepo@email.com",
        "phone": "+57 300 876 5432",
        "country": "Colombia",
        "city": "Medellín",
        "favorite_location": "Brasaland Envigado",
        "dietary_preferences": ["No restrictions"],
        "how_did_you_find_us": "Walked by",
        "date_of_birth": "1991-12-05",
        "accepts_terms": True,
        "wants_email_offers": False,
        "product_category": "Produce",
        "rate": 3.7,
        "status": "active",
    },
]


def seed() -> None:
    """Insert initial suppliers into TinyDB, skipping duplicates by email."""
    db = TinyDB(DB_PATH)
    suppliers_table = db.table("suppliers")

    existing_emails: set[str] = {
        doc["email"] for doc in suppliers_table.all()
    }

    inserted = 0
    skipped = 0

    now = datetime.now(timezone.utc).isoformat()

    for supplier in INITIAL_SUPPLIERS:
        if supplier["email"] in existing_emails:
            skipped += 1
            print(f"  ⏭  Skipped (duplicate): {supplier['full_name']} <{supplier['email']}>")
            continue

        suppliers_table.insert({
            **supplier,
            "created_at": now,
            "updated_at": now,
        })
        existing_emails.add(supplier["email"])
        inserted += 1
        print(f"  ✅ Inserted: {supplier['full_name']} <{supplier['email']}>")

    total_in_db = len(suppliers_table)

    print()
    print("─" * 50)
    print(f"  📊 Summary")
    print(f"     Inserted : {inserted}")
    print(f"     Skipped  : {skipped}")
    print(f"     Total in DB: {total_in_db}")
    print("─" * 50)

    db.close()


def main() -> None:
    """Entry point for `uv run seed`."""
    print("🌱 Seeding Brasaland suppliers into TinyDB …")
    print(f"   Database: {DB_PATH}")
    print()
    seed()
    print("\nDone! ✨")


if __name__ == "__main__":
    main()
