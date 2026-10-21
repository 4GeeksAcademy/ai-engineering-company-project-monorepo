
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

from pydantic import ValidationError
from tinydb import Query

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from packages.shared.incidents_analysis import validate_record
from services.api import database, incident_database
from packages.shared.incident_validation import IncidentCreate


CSV_PATH = ROOT / "scripts" / "incidents-brasaland.csv"

STATUS_MAP = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

CATEGORY_MAP = {
    "CUSTOMER_COMPLAINT": "customer_complaint",
    "EQUIPMENT": "equipment_failure",
    "SUPPLY": "supply_issue",
    "FOOD_QUALITY": "customer_complaint",
    "STAFF": "staff_issue",
}

BRANCH_MAP = {
    "COL-01": "medellin_centro",
    "COL-02": "medellin_laureles",
    "COL-03": "medellin_envigado",
    "COL-04": "medellin_bello",
    "COL-05": "medellin_itagui",
    "COL-06": "bogota_chapinero",
    "COL-07": "bogota_usaquen",
    "COL-08": "cali_granada",
    "COL-09": "barranquilla_norte",
    "COL-10": "central",
    "FLA-01": "miami_doral",
    "FLA-02": "miami_hialeah",
    "FLA-03": "miami_kendall",
    "FLA-04": "orlando_international",
}


def transform_record(row):
    description = (row.get("description") or "").strip()
    title = description[:120].strip()

    if not title:
        raise ValueError("Descripción vacía")

    created_at = datetime.strptime(
        row["date"].strip(), "%Y-%m-%d"
    ).replace(tzinfo=timezone.utc).isoformat()

    data = {
        "title": title,
        "description": row["description"],
        "category": CATEGORY_MAP[row["category"].strip()],
        "status": STATUS_MAP[row["status"].strip()],
        "origin": "customer",
        "branch": BRANCH_MAP.get(
            (row.get("location_id") or "").strip(),
            "central",
        ),
    }

    incident = IncidentCreate.model_validate(data)
    return incident, created_at


def seed():
    inserted = 0
    skipped = 0
    invalid = 0

    # Los identificadores CSV se guardan aparte,
    # nunca dentro del modelo Incident.
    registry = database.get_db().table("incident_seed_keys")
    SeedKey = Query()

    with CSV_PATH.open(
        encoding="utf-8-sig", newline=""
    ) as file:
        reader = csv.DictReader(file)

        for line_number, row in enumerate(reader, start=2):
            errors = validate_record(row)

            if errors:
                invalid += 1
                print(
                    f"Fila {line_number} descartada: "
                    f"{', '.join(errors)}"
                )
                continue

            try:
                incident, created_at = transform_record(row)

                source_id = (
                    row.get("incident_id") or ""
                ).strip()

                key = source_id or (
                    f"{incident.title}|{created_at}"
                )

                with database._lock:
                    if registry.get(SeedKey.key == key):
                        skipped += 1
                        continue

                    incident_database.create_incident(
                        incident.model_dump(mode="json"),
                        created_at=created_at,
                    )

                    registry.insert({"key": key})
                    inserted += 1

            except (
                ValueError,
                KeyError,
                ValidationError,
            ) as error:
                invalid += 1
                print(
                    f"Fila {line_number} descartada: {error}"
                )

    print("\n=== SEED BRASALAND ===")
    print("Insertadas:", inserted)
    print("Duplicadas omitidas:", skipped)
    print("Inválidas:", invalid)

    summary = incident_database.get_incidents_summary()

    print("\nTotal en base de datos:", summary["total"])
    print("Por estado:", summary["by_status"])
    print("Por categoría:", summary["by_category"])
    print("Por origen:", summary["by_origin"])

    database.close_db()


if __name__ == "__main__":
    seed()
