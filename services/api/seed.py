"""Seeder for the supplier directory.

Loads the initial suppliers (``SUPPLIERS_SEED`` below, exactly as in the supplier
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
from models import SupplierCreate


SUPPLIERS_SEED = [
    {
        "name": "LinkedIn Talent Solutions",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 1200.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-03-31",
        "contact_email": "account@linkedin.com",
        "notes": "Licencia corporativa para publicación de ofertas y búsqueda de candidatos."
    },
    {
        "name": "InfoJobs Premium",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 490.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-06-30",
        "contact_email": "empresas@infojobs.net"
    },
    {
        "name": "Indeed Sponsored",
        "country": "USA",
        "categories": ["job_boards"],
        "monthly_rate": 850.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "sales@indeed.com",
        "notes": "Campañas de pago por clic para perfiles de customer support en Miami."
    },
    {
        "name": "Workable",
        "country": "Spain",
        "categories": ["ats_software"],
        "monthly_rate": 299.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-09-15",
        "contact_email": "support@workable.com",
        "notes": "ATS principal para el equipo de selección de Valencia."
    },
    {
        "name": "Greenhouse",
        "country": "USA",
        "categories": ["ats_software"],
        "monthly_rate": 620.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "accounts@greenhouse.io",
        "notes": "Suspendido tras no renovar. Sergio está evaluando si migrar todo a Workable."
    },
    {
        "name": "Thomas International",
        "country": "Spain",
        "categories": ["assessment_tools"],
        "monthly_rate": 380.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-12-01",
        "contact_email": "clientes@thomas.es",
        "notes": "Tests de personalidad y aptitud para procesos de mandos intermedios."
    },
    {
        "name": "HireVue",
        "country": "USA",
        "categories": ["video_interview"],
        "monthly_rate": 540.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-08-31",
        "contact_email": "support@hirevue.com"
    },
    {
        "name": "Udemy Business",
        "country": "Spain",
        "categories": ["training_platforms"],
        "monthly_rate": 420.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2026-01-15",
        "contact_email": "business@udemy.com",
        "notes": "Licencias para el equipo interno. Gestionado por Elena Vargas."
    },
    {
        "name": "Coursera for Teams",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 399.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "teams@coursera.com",
        "notes": "Suspendido por bajo uso. Revisar antes de Q4."
    },
    {
        "name": "Sage HR",
        "country": "Spain",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 310.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-10-01",
        "contact_email": "soporte@sage.com",
        "notes": "Software de nóminas y gestión de personal para la sede de Valencia."
    },
    {
        "name": "Gusto",
        "country": "USA",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 280.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "support@gusto.com",
        "notes": "Gestión de nóminas para los empleados de la oficina de Miami."
    },
    {
        "name": "Checkr",
        "country": "USA",
        "categories": ["background_check"],
        "monthly_rate": 195.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-11-30",
        "contact_email": "sales@checkr.com"
    },
    {
        "name": "Microsoft 365 Business",
        "country": "Spain",
        "categories": ["it_and_software_licenses"],
        "monthly_rate": 760.0,
        "currency": "EUR",
        "status": "active",
        "contact_email": "enterprise@microsoft.com",
        "notes": "Licencias para toda la plantilla de Valencia y Miami."
    },
    {
        "name": "Regus Valencia",
        "country": "Spain",
        "categories": ["office_and_facilities"],
        "monthly_rate": 2400.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-07-01",
        "contact_email": "valencia@regus.com",
        "notes": "Alquiler de la oficina principal en Valencia. Incluye sala de reuniones."
    },
    {
        "name": "WeWork Miami",
        "country": "USA",
        "categories": ["office_and_facilities"],
        "monthly_rate": 3100.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-09-30",
        "contact_email": "miami@wework.com"
    }
]


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
