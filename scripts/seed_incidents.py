#!/usr/bin/env python3
"""Load the historical helpdesk CSV into the incident manager (Phase 3 — seed).

Usage (needs the API's dependencies: pydantic, tinydb ...):
    services/api/.venv/bin/python scripts/seed_incidents.py
    services/api/.venv/bin/python scripts/seed_incidents.py --csv other.csv
    services/api/.venv/bin/python scripts/seed_incidents.py --reset   # wipe the incidents first
    services/api/.venv/bin/python scripts/seed_incidents.py --db /tmp/incidents.json

Reads ``data/raw/incidents-nexova.csv`` by default, validates every row with the
shared ``incidents_analyzer`` rules (``packages/shared``: ``import_problems``),
transforms it into the incident model (``incidents_analyzer.transform``: the maps
are in ``packages/shared/incidents/contract.json``) and inserts it with
``origin: "customer"``. Only the API's model and store (``services/api/incidents/seeding.py``)
are needed besides the shared package, hence the API's environment. Invalid rows are NOT inserted: they are listed here
with their line, id and the rules they break — never the customer's email.
Running it again never duplicates data. At the end it checks that the numbers
``GET /api/incidents/summary`` gives match those expected from the CSV.

Exit code: 0 ok, 1 file/format error or metrics mismatch.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "services" / "api"))  # the incident store and model live in the API package

from tinydb import TinyDB  # noqa: E402

from incidents import incident_store as store  # noqa: E402
from incidents import seeding  # noqa: E402
from incidents_analyzer import missing_required_columns, read_rows  # noqa: E402

DEFAULT_CSV = REPO / "data" / "raw" / "incidents-nexova.csv"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Load the incidents CSV history into the incident manager.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help=f"CSV to load (default: {DEFAULT_CSV.relative_to(REPO)})")
    parser.add_argument("--reset", action="store_true", help="wipe existing incidents before seeding")
    parser.add_argument("--db", type=Path, help="TinyDB file to write (default: services/api/incidents/db.json)")
    args = parser.parse_args(argv)

    if not args.csv.is_file():
        print(f"Error: file not found: {args.csv}", file=sys.stderr)
        return 1
    try:
        with open(args.csv, newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            missing = missing_required_columns(reader.fieldnames)
            rows = list(reader) if not missing else []
    except (OSError, UnicodeDecodeError, csv.Error) as exc:
        print(f"Error: could not read CSV file: {exc}", file=sys.stderr)
        return 1
    if missing:
        print(f"Error: the CSV is missing required columns: {', '.join(missing)}", file=sys.stderr)
        return 1
    if args.db:
        store._db = TinyDB(args.db)

    report = seeding.seed_rows(rows, reset=args.reset)

    print(f"Read {report.total} rows from {args.csv.name}.")
    print(f"  inserted ............ {report.inserted}")
    print(f"  already present ..... {report.skipped_existing}")
    print(f"  rejected (invalid) .. {len(report.rejected)}")
    for rejected in report.rejected:
        print(f"      line {rejected.line:>4}  {rejected.id}: {', '.join(rejected.rules)}")
    total = len(store.all_docs())
    print(f"Total incidents in database: {total}")

    expected = seeding.expected_metrics(rows)
    if total != expected["total"]:
        print(f"Summary check skipped: the database holds {total} incidents but the CSV accounts for {expected['total']} "
              "(other incidents exist; use --reset for a clean comparison).")
        return 0
    differences = seeding.metric_differences(expected, seeding.actual_metrics())
    if differences:
        print("Summary check FAILED — /api/incidents/summary does not match the CSV:")
        for difference in differences:
            print(f"  - {difference}")
        return 1
    status, category = expected["status_counts"], expected["category_counts"]
    print(
        "Summary check OK — /api/incidents/summary matches the CSV: "
        f"{expected['total']} incidents (open {status['open']}, resolved {status['resolved']}, discarded {status['discarded']}; "
        f"technical_failure {category['technical_failure']}, process_error {category['process_error']}, "
        f"client_complaint {category['client_complaint']}), satisfaction {expected['satisfaction_average']} over {expected['satisfaction_scored']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
