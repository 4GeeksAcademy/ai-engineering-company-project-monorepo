#!/usr/bin/env python3
"""
seed_incidents.py — Brasaland · Seed incidents from CSV

Idempotent: two runs will not duplicate incidents (uses external_ref).

Usage:
    cd services/api
    python scripts/seed_incidents.py [path/to/csv]
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

# Add services/api to path
REPO_ROOT = Path(__file__).resolve().parents[3]
API_DIR = REPO_ROOT / "services" / "api"
sys.path.insert(0, str(API_DIR))

from app.domains.incidents.persistence import IncidentRepository  # noqa: E402
from app.domains.incidents.service import IncidentService  # noqa: E402

# CSV columns expected
EXPECTED_FIELDS = (
    "incident_id",
    "date",
    "location_id",
    "category",
    "description",
    "status",
    "customer_id",
    "satisfaction_score",
    "reporter_id",
)


def seed_csv(csv_path: str | Path) -> dict:
    """Read CSV and seed incidents. Returns summary stats."""
    path = Path(csv_path)
    if not path.exists():
        print(f"ERROR: File not found: {path}")
        sys.exit(1)

    service = IncidentService()
    repo = service.repo

    stats = {"total": 0, "imported": 0, "skipped_duplicate": 0, "skipped_invalid": 0, "errors": []}

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        # Validate headers
        if reader.fieldnames is None:
            print("ERROR: CSV file is empty or has no headers.")
            sys.exit(1)

        missing = set(EXPECTED_FIELDS) - set(reader.fieldnames)
        if missing:
            print(f"ERROR: CSV is missing required columns: {', '.join(missing)}")
            sys.exit(1)

        for row_num, row in enumerate(reader, start=2):
            stats["total"] += 1
            incident_id = row.get("incident_id", "").strip()
            location_id = row.get("location_id", "").strip()
            category = row.get("category", "").strip()
            description = row.get("description", "").strip()
            status = row.get("status", "").strip()

            # Skip rows missing critical data
            if not incident_id or not location_id or not category or not description or not status:
                stats["skipped_invalid"] += 1
                stats["errors"].append(f"Row {row_num}: Missing required fields")
                continue

            # Validate category
            valid_categories = ("CUSTOMER_COMPLAINT", "EQUIPMENT", "SUPPLY", "FOOD_QUALITY", "STAFF")
            if category.upper() not in valid_categories:
                stats["skipped_invalid"] += 1
                stats["errors"].append(f"Row {row_num}: Invalid category '{category}'")
                continue

            # Map location_id to branch
            branch = location_id.upper()

            try:
                result = service.seed_from_csv_row(
                    external_ref=incident_id,
                    category=category,
                    description=description,
                    status_csv=status,
                    branch=branch,
                )
                if result is None:
                    stats["skipped_duplicate"] += 1
                else:
                    stats["imported"] += 1
            except Exception as e:
                stats["errors"].append(f"Row {row_num}: {e}")

    return stats


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else str(REPO_ROOT / "docs" / "incidents-brasaland.csv")

    print("=" * 60)
    print("  BRASALAND — INCIDENT SEED")
    print(f"  Source: {csv_path}")
    print("=" * 60)
    print()

    stats = seed_csv(csv_path)

    print(f"  Total rows in CSV ......... {stats['total']}")
    print(f"  Imported .................. {stats['imported']}")
    print(f"  Skipped (duplicate) ....... {stats['skipped_duplicate']}")
    print(f"  Skipped (invalid) ......... {stats['skipped_invalid']}")

    if stats["errors"]:
        print()
        print("  ERRORS:")
        for err in stats["errors"]:
            print(f"    - {err}")

    print()

    # Show current DB state
    repo = IncidentRepository()
    total_in_db = repo.count()
    print(f"  Total incidents in DB ..... {total_in_db}")
    print()

    summary = repo.get_summary()
    if summary["by_status"]:
        print("  BY STATUS:")
        for status, count in summary["by_status"].items():
            print(f"    {status:20s} {count}")

    if summary["by_category"]:
        print()
        print("  BY CATEGORY:")
        for cat, count in summary["by_category"].items():
            print(f"    {cat:20s} {count}")

    print()
    print("=" * 60)
    print("  Done.")
    print("=" * 60)


if __name__ == "__main__":
    main()
