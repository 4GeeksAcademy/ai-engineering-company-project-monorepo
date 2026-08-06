#!/usr/bin/env python3

"""Seed incidents data from historical CSV into TinyDB."""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

from tinydb import Query

ROOT_DIR = Path(__file__).resolve().parents[1]
API_DIR = ROOT_DIR / "services" / "api"
SHARED_PY_DIR = ROOT_DIR / "packages" / "shared" / "python"

for path in (API_DIR, SHARED_PY_DIR):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

from incidents_validation import validate_incident_seed_row
from src.database import db, get_incidents_table
from src.models.incident import Incident


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inserta incidencias historicas desde un CSV en TinyDB con validacion e idempotencia."
    )
    parser.add_argument("csv_file", help="Ruta al archivo CSV historico")
    parser.add_argument(
        "--unique-field",
        default="incident_id",
        help="Nombre de la columna unica del CSV usada para idempotencia (default: incident_id)",
    )
    return parser.parse_args()


def _is_empty_row(row: dict[str, str]) -> bool:
    return all(str(value or "").strip() == "" for value in row.values())


def seed_incidents(csv_path: Path, unique_field: str) -> int:
    incidents_table = get_incidents_table()
    query = Query()

    inserted = 0
    duplicates = 0
    total_rows = 0
    invalid_rows: list[tuple[int, str]] = []
    invalid_reasons: Counter[str] = Counter()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)

        if not reader.fieldnames:
            raise ValueError("El CSV no contiene encabezados")

        for line_number, row in enumerate(reader, start=2):
            if _is_empty_row(row):
                continue

            total_rows += 1
            validation = validate_incident_seed_row(
                row,
                unique_field=unique_field,
                default_origin="customer",
            )

            if not validation.is_valid:
                reason = "; ".join(validation.errors)
                invalid_rows.append((line_number, reason))
                invalid_reasons[reason] += 1
                continue

            assert validation.payload is not None
            assert validation.unique_key is not None

            if incidents_table.contains(query.source_unique_key == validation.unique_key):
                duplicates += 1
                continue

            incident = Incident(**validation.payload)
            payload = incident.model_dump(mode="json")
            payload["source_unique_key"] = validation.unique_key
            incidents_table.insert(payload)
            inserted += 1

    print("=" * 60)
    print("SEED DE INCIDENTES")
    print("=" * 60)
    print(f"Filas procesadas:      {total_rows}")
    print(f"Insertadas:            {inserted}")
    print(f"Duplicadas (omitidas): {duplicates}")
    print(f"Invalidas (omitidas):  {len(invalid_rows)}")

    if invalid_reasons:
        print("\nResumen de filas invalidas")
        print("-" * 60)
        for reason, count in invalid_reasons.most_common():
            print(f"{reason:<48} {count:>6}")

        print("\nDetalle de filas invalidas")
        print("-" * 60)
        for line_number, reason in invalid_rows:
            print(f"Linea {line_number}: {reason}")

    return inserted


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv_file)

    if not csv_path.is_file():
        print(f"Error: no se encontro el archivo '{csv_path}'.", file=sys.stderr)
        return 1

    try:
        seed_incidents(csv_path, args.unique_field)
    except ValueError as error:
        print(f"Error de validacion: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Error al leer el archivo: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())