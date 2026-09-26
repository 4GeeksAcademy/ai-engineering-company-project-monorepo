"""Command-line interface for the Nexova incident report analyzer."""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from incident_analysis import VALID_CATEGORIES, VALID_STATUSES, analyze_csv_file, invalid_label, write_results_csv


def _pct(value: int, total: int) -> str:
    return f"{(value / total * 100):.1f}%" if total else "0.0%"


def print_report(result, source: str) -> None:
    print("=" * 60)
    print("  NEXOVA — SUPPORT TICKET ANALYSIS")
    print(f"  Source file: {source}")
    print("=" * 60)
    print(f"\nTOTAL RECORDS IN FILE .......... {result.total_records}")
    print(f"  ├─ Valid records ................ {result.valid_records}")
    print(f"  └─ Invalid / incomplete .......... {result.invalid_records}")
    print("\nINVALID RECORDS BREAKDOWN")
    labels = {"missing_client_company": "Missing client_company", "invalid_category": "Invalid or missing category", "invalid_email": "Invalid or missing email", "closed_without_score": "Closed ticket, no score"}
    for key, label in labels.items():
        print(f"  ├─ {label:<32} {result.invalid_breakdown.get(key, 0)}")
    for key, count in result.invalid_breakdown.items():
        if key not in labels:
            print(f"  ├─ {invalid_label(key):<32} {count}")
    print("\nBREAKDOWN BY CATEGORY (valid records)")
    for index, key in enumerate(VALID_CATEGORIES):
        count = result.by_category[key]
        print(f"  {'└─' if index == len(VALID_CATEGORIES) - 1 else '├─'} {key:<29} {count:>3}  ({_pct(count, result.valid_records)})")
    print("\nBREAKDOWN BY STATUS (valid records)")
    for index, key in enumerate(VALID_STATUSES):
        count = result.by_status[key]
        print(f"  {'└─' if index == len(VALID_STATUSES) - 1 else '├─'} {key:<29} {count:>3}  ({_pct(count, result.valid_records)})")
    print("\nSATISFACTION INDEX (closed tickets)")
    print(f"  Scored tickets: {result.scored_tickets} of {result.closed_tickets}")
    print(f"  Average score: {'N/A' if result.average_score is None else f'{result.average_score:.2f} / 5.00'}")
    descriptions = {1: "Very dissatisfied", 2: "Dissatisfied", 3: "Neutral", 4: "Satisfied", 5: "Very satisfied"}
    for score in range(1, 6):
        print(f"  {'└─' if score == 5 else '├─'} Score {score} ({descriptions[score]:<17}) ... {result.score_breakdown[score]}")
    print("\n" + "=" * 60)


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze a Nexova incident CSV")
    parser.add_argument("csv_path")
    args = parser.parse_args()
    try:
        with Path(args.csv_path).open("r", encoding="utf-8", newline="") as source:
            result = analyze_csv_file(source)
    except (OSError, ValueError, csv.Error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print_report(result, Path(args.csv_path).name)
    answer = input("Export results to CSV? [y / n]: ").strip().lower()
    if answer in {"y", "s"}:
        with Path("results.csv").open("w", encoding="utf-8", newline="") as target:
            write_results_csv(result, target)
        print("Results exported to results.csv")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
