"""Incident analysis service — port of analyze.py logic to a reusable module."""

from __future__ import annotations

import csv
import io
from collections import Counter

# ── Constants (mirrored from analyze.py) ──────────────────────

VALID_LOCATIONS = {f"COL-{i:02d}" for i in range(1, 11)} | {
    f"FLA-{i:02d}" for i in range(1, 5)
}
VALID_CATEGORIES = {
    "CUSTOMER_COMPLAINT",
    "EQUIPMENT",
    "SUPPLY",
    "FOOD_QUALITY",
    "STAFF",
}
VALID_STATUSES = {"OPEN", "CLOSED", "DISCARDED"}

SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}

RULE_LABELS = {
    "missing_location_id": "Missing location_id",
    "invalid_category": "Invalid or missing category",
    "empty_description": "Empty description",
    "missing_reporter_id": "Missing reporter_id",
    "closed_no_score": "Closed case, no score",
    "score_out_of_range": "Score out of range (1-5)",
}

EXPECTED_COLUMNS = {
    "incident_id",
    "date",
    "location_id",
    "category",
    "description",
    "status",
    "reporter_id",
}


# ── Helpers ────────────────────────────────────────────────────


def _validate_record(row: dict) -> list[str]:
    """Validate a single CSV row. Returns list of rule names that failed."""
    errors: list[str] = []

    location = (row.get("location_id") or "").strip()
    if location not in VALID_LOCATIONS:
        errors.append("missing_location_id")

    category = (row.get("category") or "").strip()
    if category not in VALID_CATEGORIES:
        errors.append("invalid_category")

    description = (row.get("description") or "").strip()
    if len(description) < 5:
        errors.append("empty_description")

    reporter = (row.get("reporter_id") or "").strip()
    if not reporter:
        errors.append("missing_reporter_id")

    status = (row.get("status") or "").strip().upper()
    score_raw = (row.get("satisfaction_score") or "").strip()

    # Satisfaction score validation
    if status == "CLOSED" and not score_raw:
        errors.append("closed_no_score")
    elif score_raw:
        try:
            score = int(score_raw)
            if score < 1 or score > 5:
                errors.append("score_out_of_range")
        except ValueError:
            errors.append("score_out_of_range")

    return errors


def read_csv_from_bytes(content: bytes) -> list[dict]:
    """Parse CSV bytes into a list of dicts. Raises ValueError on empty or bad format."""
    text = content.decode("utf-8-sig")  # handles BOM
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("The CSV file has no header row.")

    # Normalise header names (strip whitespace)
    reader.fieldnames = [f.strip() for f in reader.fieldnames]

    rows = list(reader)

    if not rows:
        raise ValueError("The CSV file contains no data rows.")

    return rows


def analyze(rows: list[dict]) -> dict:
    """Analyse all rows and return a structured results dict."""
    valid_rows: list[dict] = []
    invalid_rows: list[dict] = []

    invalid_reasons: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    score_counts: Counter[int] = Counter()

    for row in rows:
        errors = _validate_record(row)
        if errors:
            invalid_rows.append(row)
            for e in errors:
                invalid_reasons[e] += 1
        else:
            valid_rows.append(row)
            category_counts[row["category"].strip()] += 1
            status_counts[row["status"].strip().upper()] += 1

    # Satisfaction scores (only from valid closed cases with scores)
    total_closed = status_counts.get("CLOSED", 0)
    for row in valid_rows:
        if row["status"].strip().upper() == "CLOSED":
            score_raw = (row.get("satisfaction_score") or "").strip()
            if score_raw:
                score_counts[int(score_raw)] += 1

    total_scored = sum(score_counts.values())
    avg_score = (
        sum(s * c for s, c in score_counts.items()) / total_scored
        if total_scored
        else 0
    )

    return {
        "total_rows": len(rows),
        "valid_count": len(valid_rows),
        "invalid_count": len(invalid_rows),
        "invalid_reasons": dict(invalid_reasons),
        "category_counts": dict(category_counts),
        "status_counts": dict(status_counts),
        "total_closed": total_closed,
        "total_scored": total_scored,
        "score_counts": {str(k): v for k, v in score_counts.items()},
        "avg_score": round(avg_score, 2),
    }


def results_to_summary_json(results: dict) -> dict:
    """Build a clean JSON-friendly summary from raw analysis results."""
    return {
        "total_records": results["total_rows"],
        "valid_records": results["valid_count"],
        "invalid_records": results["invalid_count"],
        "invalid_breakdown": [
            {"rule": rule, "label": RULE_LABELS.get(rule, rule), "count": count}
            for rule, count in sorted(
                results["invalid_reasons"].items(), key=lambda x: x[1], reverse=True
            )
        ],
        "category_breakdown": [
            {
                "category": cat,
                "count": count,
                "percentage": round(
                    count / results["valid_count"] * 100, 1
                )
                if results["valid_count"]
                else 0,
            }
            for cat, count in sorted(
                results["category_counts"].items(), key=lambda x: x[1], reverse=True
            )
        ],
        "status_breakdown": [
            {
                "status": st,
                "count": count,
                "percentage": round(
                    count / results["valid_count"] * 100, 1
                )
                if results["valid_count"]
                else 0,
            }
            for st in ["OPEN", "CLOSED", "DISCARDED"]
            if (count := results["status_counts"].get(st, 0)) > 0
        ],
        "satisfaction_index": {
            "total_closed": results["total_closed"],
            "scored_cases": results["total_scored"],
            "average_score": results["avg_score"],
            "score_distribution": [
                {
                    "score": s,
                    "label": SCORE_LABELS[s],
                    "count": results["score_counts"].get(str(s), 0),
                }
                for s in range(1, 6)
            ],
        },
    }


def results_to_csv_bytes(results: dict) -> bytes:
    """Serialize analysis results to a CSV string encoded as UTF-8 bytes."""
    buf = io.StringIO()
    writer = csv.writer(buf)

    # Header
    writer.writerow(["Metric", "Value"])

    # Totals
    writer.writerow(["Total Records", results["total_rows"]])
    writer.writerow(["Valid Records", results["valid_count"]])
    writer.writerow(["Invalid Records", results["invalid_count"]])
    writer.writerow([])

    # Invalid breakdown
    writer.writerow(["Invalid Reason", "Count"])
    for rule, count in sorted(
        results["invalid_reasons"].items(), key=lambda x: x[1], reverse=True
    ):
        writer.writerow([rule, count])
    writer.writerow([])

    # Category breakdown
    writer.writerow(["Category", "Count"])
    for cat in [
        "CUSTOMER_COMPLAINT",
        "EQUIPMENT",
        "SUPPLY",
        "FOOD_QUALITY",
        "STAFF",
    ]:
        writer.writerow([cat, results["category_counts"].get(cat, 0)])
    writer.writerow([])

    # Status breakdown
    writer.writerow(["Status", "Count"])
    for st in ["OPEN", "CLOSED", "DISCARDED"]:
        writer.writerow([st, results["status_counts"].get(st, 0)])
    writer.writerow([])

    # Satisfaction scores
    writer.writerow(["Satisfaction Score", "Count"])
    for s in range(1, 6):
        writer.writerow(
            [f"{s} - {SCORE_LABELS[s]}", results["score_counts"].get(str(s), 0)]
        )
    writer.writerow(["Average Score", f"{results['avg_score']:.2f}"])

    return buf.getvalue().encode("utf-8")
