#!/usr/bin/env python3
"""
Brasaland Incident Report Analyzer
Analyzes incidents from a CSV file and produces a summary report.
"""

import csv
import sys
import os
from collections import Counter


# --- Constants ---

VALID_LOCATIONS = {f"COL-{i:02d}" for i in range(1, 11)} | {f"FLA-{i:02d}" for i in range(1, 5)}
VALID_CATEGORIES = {"CUSTOMER_COMPLAINT", "EQUIPMENT", "SUPPLY", "FOOD_QUALITY", "STAFF"}
VALID_STATUSES = {"OPEN", "CLOSED", "DISCARDED"}
SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}


def load_csv(path: str) -> list[dict]:
    """Load and return all rows from the CSV as a list of dicts."""
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def validate_record(row: dict) -> list[str]:
    """
    Validate a single row. Returns a list of rule names that failed.
    An empty list means the record is valid.
    """
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


def analyze(rows: list[dict]) -> dict:
    """Analyze all rows and return a structured results dict."""
    valid_rows: list[dict] = []
    invalid_rows: list[dict] = []

    invalid_reasons: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    score_counts: Counter[int] = Counter()

    for row in rows:
        errors = validate_record(row)
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
    avg_score = sum(s * c for s, c in score_counts.items()) / total_scored if total_scored else 0

    return {
        "total_rows": len(rows),
        "valid_count": len(valid_rows),
        "invalid_count": len(invalid_rows),
        "invalid_reasons": invalid_reasons,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "total_closed": total_closed,
        "total_scored": total_scored,
        "score_counts": score_counts,
        "avg_score": avg_score,
        "valid_rows": valid_rows,
    }


def print_report(results: dict, filepath: str) -> None:
    """Print a formatted summary to the console."""
    w = 60  # report width

    print("=" * w)
    print("  BRASALAND — INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {os.path.basename(filepath)}")
    print("=" * w)

    total = results["total_rows"]
    valid = results["valid_count"]
    invalid = results["invalid_count"]

    print(f"\nTOTAL RECORDS IN FILE .......... {total}")
    print(f"  ├─ Valid records ................ {valid}")
    print(f"  └─ Invalid / incomplete .......... {invalid}")

    # --- Invalid breakdown ---
    reasons = results["invalid_reasons"]
    if reasons:
        rule_labels = {
            "missing_location_id": "Missing location_id",
            "invalid_category": "Invalid or missing category",
            "empty_description": "Empty description",
            "missing_reporter_id": "Missing reporter_id",
            "closed_no_score": "Closed case, no score",
            "score_out_of_range": "Score out of range (1-5)",
        }
        print(f"\nINVALID RECORDS BREAKDOWN")
        items = sorted(reasons.items(), key=lambda x: x[1], reverse=True)
        for i, (rule, count) in enumerate(items):
            connector = "└─" if i == len(items) - 1 else "├─"
            label = rule_labels.get(rule, rule)
            print(f"  {connector} {label:<36s} {count}")

    # --- Category breakdown ---
    cats = results["category_counts"]
    if cats:
        print(f"\nBREAKDOWN BY CATEGORY (valid records)")
        cat_items = sorted(cats.items(), key=lambda x: x[1], reverse=True)
        for i, (cat, count) in enumerate(cat_items):
            connector = "└─" if i == len(cat_items) - 1 else "├─"
            pct = count / valid * 100 if valid else 0
            print(f"  {connector} {cat:<36s} {count:<4d} ({pct:.1f}%)")

    # --- Status breakdown ---
    statuses = results["status_counts"]
    if statuses:
        print(f"\nBREAKDOWN BY STATUS (valid records)")
        ordered = [(s, statuses.get(s, 0)) for s in ["OPEN", "CLOSED", "DISCARDED"]]
        ordered = [(s, c) for s, c in ordered if c > 0]
        for i, (st, count) in enumerate(ordered):
            connector = "└─" if i == len(ordered) - 1 else "├─"
            pct = count / valid * 100 if valid else 0
            print(f"  {connector} {st:<36s} {count:<4d} ({pct:.1f}%)")

    # --- Satisfaction index ---
    print(f"\nSATISFACTION INDEX (closed cases)")
    scored = results["total_scored"]
    total_closed = results["total_closed"]
    avg = results["avg_score"]
    scores = results["score_counts"]

    print(f"  Scored cases: {scored} of {total_closed}")
    print(f"  Average score: {avg:.2f} / 5.00")
    for s in range(1, 6):
        connector = "└─" if s == 5 else "├─"
        label = SCORE_LABELS[s]
        count = scores.get(s, 0)
        print(f"  {connector} Score {s} ({label}) ... {count}")

    print("\n" + "=" * w)


def export_to_csv(results: dict, dest: str) -> None:
    """Export summary results to a CSV file."""
    rows = [
        ["Metric", "Value"],
        ["Total Records", results["total_rows"]],
        ["Valid Records", results["valid_count"]],
        ["Invalid Records", results["invalid_count"]],
        [],
        ["Invalid Reason", "Count"],
    ]
    for rule, count in results["invalid_reasons"].items():
        rows.append([rule, count])

    rows.append([])
    rows.append(["Category", "Count"])
    for cat in ["CUSTOMER_COMPLAINT", "EQUIPMENT", "SUPPLY", "FOOD_QUALITY", "STAFF"]:
        rows.append([cat, results["category_counts"].get(cat, 0)])

    rows.append([])
    rows.append(["Status", "Count"])
    for st in ["OPEN", "CLOSED", "DISCARDED"]:
        rows.append([st, results["status_counts"].get(st, 0)])

    rows.append([])
    rows.append(["Satisfaction Score", "Count"])
    for s in range(1, 6):
        rows.append([f"{s} - {SCORE_LABELS[s]}", results["score_counts"].get(s, 0)])
    rows.append(["Average Score", f"{results['avg_score']:.2f}"])

    with open(dest, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    print(f"\n✅ Results exported to {dest}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze.py <path-to-csv>")
        print("Example: python analyze.py incidents.csv")
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.isfile(filepath):
        print(f"Error: file not found — {filepath}")
        sys.exit(1)

    try:
        rows = load_csv(filepath)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        sys.exit(1)

    if not rows:
        print("The CSV file contains no data rows.")
        sys.exit(0)

    results = analyze(rows)
    print_report(results, filepath)

    # Ask user about export
    while True:
        answer = input("Export results to CSV? [y / n]: ").strip().lower()
        if answer in ("y", "yes"):
            export_to_csv(results, "results.csv")
            break
        elif answer in ("n", "no"):
            print("No export performed.")
            break
        else:
            print("Please enter 'y' or 'n'.")


if __name__ == "__main__":
    main()
