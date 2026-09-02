"""Seed TrackFlow historical incidents from the recovered CSV into TinyDB.

Uses the shared validation/transformation logic in `packages/shared`
(`incidents_shared`) — no duplicated logic here. Idempotent: re-running
against the same TinyDB tables never creates duplicates.

This script depends on `services/api`'s installed packages (tinydb,
`incidents_shared`, `database`, `models`). Run it via that project's uv
environment:

    cd services/api
    uv run python ../../scripts/seed_incidents.py
"""

from pathlib import Path

from incidents_shared import (
    analyze_historical_incidents,
    historical_row_dedup_key,
    transform_historical_row,
)
from tinydb import Query
from tinydb.table import Table


DEFAULT_CSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "content"
    / "contexts"
    / "incidents-file-analysis"
    / "incidents-trackflow.csv"
)

SEED_SOURCE = "trackflow_historical_csv"


def seed_incidents(
    csv_path: Path,
    incidents_table: Table,
    seed_keys_table: Table,
) -> dict:
    """Seed `incidents_table` from the historical CSV at `csv_path`.

    Idempotency is tracked in `seed_keys_table` (internal-only, never part
    of the public Incident model): rows already seeded are skipped on
    subsequent runs.
    """
    text = csv_path.read_text(encoding="utf-8-sig")
    analysis = analyze_historical_incidents(text)

    SeedKey = Query()
    inserted = 0
    skipped_existing = 0

    for row in analysis["valid_rows"]:
        transformed = transform_historical_row(row)
        if transformed is None:
            continue

        dedup_key = historical_row_dedup_key(row, transformed)

        already_seeded = seed_keys_table.get(
            (SeedKey.source == SEED_SOURCE) & (SeedKey.source_key == dedup_key)
        )

        if already_seeded is not None:
            skipped_existing += 1
            continue

        incident_doc_id = incidents_table.insert(transformed)
        seed_keys_table.insert({
            "source": SEED_SOURCE,
            "source_key": dedup_key,
            "incident_id": incident_doc_id,
        })
        inserted += 1

    return {
        "inserted": inserted,
        "skipped_existing": skipped_existing,
        "invalid": analysis["invalid"],
        "invalid_breakdown": analysis["invalid_breakdown"],
        "invalid_records": analysis["invalid_records"],
        "total_incidents": len(incidents_table),
    }


def print_summary(summary: dict) -> None:
    print(f"inserted: {summary['inserted']}")
    print(f"skipped_existing: {summary['skipped_existing']}")
    print(f"invalid: {summary['invalid']}")
    print(f"total_incidents: {summary['total_incidents']}")

    print()
    print("invalid breakdown:")
    for reason, count in sorted(summary["invalid_breakdown"].items()):
        print(f"  {reason} = {count}")

    print()
    print("invalid records (incident_id / field / reason only — no PII):")
    for record in summary["invalid_records"]:
        for error in record["errors"]:
            print(f"  {record['incident_id']} field={error['field']} reason={error['reason']}")


def main() -> None:
    from database import incident_seed_keys_table, incidents_table

    summary = seed_incidents(DEFAULT_CSV_PATH, incidents_table, incident_seed_keys_table)
    print_summary(summary)


if __name__ == "__main__":
    main()
