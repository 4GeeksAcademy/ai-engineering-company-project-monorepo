#!/usr/bin/env python3
# scripts/seed_incidents.py
#
# Script de carga de datos hist├│ricos desde CSV a TinyDB.
# Lee el archivo incidents.csv, valida usando la l├│gica compartida,
# aplica transformaciones CSV -> modelo e inserta en incidentes_db.json.
#
# IDEMPOTENTE: no duplica registros (usa incident_id como control).
# Los registros inv├ílidos se reportan en consola al final.
#
# Uso:
#   python3 scripts/seed_incidents.py [ruta_al_csv]

import sys
import csv
import os
from tinydb import TinyDB, Query

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "packages"))

from shared.validation import validate_and_transform_row


def load_csv(filepath: str) -> list[dict[str, str]]:
    """Lee el CSV y devuelve lista de diccionarios."""
    with open(filepath, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def seed_database(csv_path: str, db_path: str = "incidentes_db.json"):
    """Procesa el CSV e inserta en TinyDB. Idempotente: controla duplicados por incident_id."""
    rows = load_csv(csv_path)
    db = TinyDB(db_path)
    table = db.table("incidents")
    Incident = Query()

    inserted = 0
    duplicated = 0
    errors = []

    for row in rows:
        incident_id_raw = row.get("incident_id", "").strip()
        if not incident_id_raw.isdigit():
            errors.append(f"Fila sin incident_id v├ílido: {dict(row)}")
            continue

        incident_id = int(incident_id_raw)

        # Idempotencia: si ya existe, saltar
        if table.contains(Incident.incident_id == incident_id):
            duplicated += 1
            continue

        valid, result = validate_and_transform_row(row)
        if not valid:
            errors.append(f"Incidente #{incident_id}: {result}")
            continue

        table.insert(result)
        inserted += 1

    print(f"Insertados: {inserted}, Inv├ílidos: {len(errors)}, Duplicados: {duplicated}")
    if errors:
        print("\n--- Registros inv├ílidos ---")
        for e in errors:
            print(f"  {e}")

    return inserted, len(errors), duplicated, errors


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "incidents.csv"
    )
    seed_database(csv_path)