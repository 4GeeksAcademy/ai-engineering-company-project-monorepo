from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "shared"))
sys.path.insert(0, str(ROOT / "services" / "api"))

from incident_analyzer.errors import AnalysisError
from incident_analyzer.schema import INVALID_REASON_LABELS
from incident_analyzer.service import load_validated_csv, redact_phi
from incident_store import BRANCHES, connect, create_incident, summarize

STATUS_MAP = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}
CATEGORY_MAP = {
    "APPOINTMENT": "patient_experience",
    "BILLING": "billing_error",
    "CLINICAL_CARE": "patient_experience",
    "ACCESSIBILITY": "patient_experience",
    "ADMINISTRATIVE": "other",
}
BRANCH_MAP = {
    "US-TX-01": "central",
    "US-TX-02": "austin_north",
    "US-TX-03": "houston_med_center",
    "US-FL-01": "miami_brickell",
    "US-FL-02": "orlando_east",
    "US-FL-03": "tampa_bay",
    "US-GA-01": "atlanta_midtown",
    "US-GA-02": "atlanta_midtown",
    "US-GA-03": "savannah",
    "UK-LON-01": "london_city",
    "UK-LON-02": "london_west",
    "UK-MAN-01": "manchester_central",
}


def map_row(row: dict[str, str]) -> dict[str, str]:
    status = STATUS_MAP.get(row.get("status", ""))
    category = CATEGORY_MAP.get(row.get("category", ""))
    if status is None or category is None:
        raise ValueError("status or category could not be mapped")
    description = row.get("description", "")
    title = description[:120].strip()
    if not title:
        raise ValueError("title is empty")
    try:
        created_at = (
            datetime.strptime(row["date"], "%Y-%m-%d")
            .replace(tzinfo=timezone.utc)
            .strftime("%Y-%m-%dT%H:%M:%SZ")
        )
    except (KeyError, ValueError):
        raise ValueError("date could not be mapped")
    branch = BRANCH_MAP.get(row.get("clinic_id", ""), "central")
    if branch not in BRANCHES:
        raise ValueError("branch could not be mapped")
    return {
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "origin": "customer",
        "branch": branch,
        "created_at": created_at,
        "updated_at": created_at,
    }


def main() -> int:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "scripts" / "incidents-healthcore.csv"
    try:
        valid_rows, invalid_records = load_validated_csv(csv_path)
    except AnalysisError as exc:
        print(exc.message, file=sys.stderr)
        return 1
    except Exception:
        print("The CSV could not be loaded.", file=sys.stderr)
        return 1

    inserted = 0
    skipped = 0
    mapping_failures: list[str] = []
    connection = connect()
    try:
        for row in valid_rows:
            identity = row.get("incident_id", "").strip()
            try:
                mapped = map_row(row)
            except ValueError as exc:
                label = identity or "(no incident_id)"
                mapping_failures.append(f"{label}: {exc}")
                continue
            if not identity:
                identity = f"{mapped['title']}|{mapped['created_at']}"
            created = create_incident(connection, mapped, seed_key=identity)
            if created is None:
                skipped += 1
            else:
                inserted += 1
        totals = summarize(connection)
        connection.commit()
    except Exception:
        connection.rollback()
        print("The incidents could not be saved.", file=sys.stderr)
        return 1
    finally:
        connection.close()

    print("Invalid CSV records were not inserted:")
    if not invalid_records:
        print("None")
    else:
        for item in invalid_records:
            reasons = ", ".join(INVALID_REASON_LABELS.get(reason, reason) for reason in item.reasons)
            identity = item.incident_id or "(no incident_id)"
            print(redact_phi(f"row {item.row_number} {identity}: {reasons}"))
    print("Rows that could not be mapped were not inserted:")
    if not mapping_failures:
        print("None")
    else:
        for line in mapping_failures:
            print(redact_phi(line))
    print(f"Inserted {inserted}")
    print(f"Already present {skipped}")
    for group, counts in totals.items():
        print(group)
        for key, value in counts.items():
            print(f"  {key} {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
