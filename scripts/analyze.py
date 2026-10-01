#!/usr/bin/env python3
"""Analyze a HealthCore incident CSV using the shared native-Python service."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = REPO_ROOT / "packages" / "incidents-analysis"
sys.path.insert(0, str(PACKAGE_ROOT))

from incidents_analysis import IncidentFileError, analyze_file  # noqa: E402
from incidents_analysis.report import render_summary, results_csv  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze a HealthCore incident CSV.")
    parser.add_argument("csv_path", help="Path to the incidents CSV file")
    args = parser.parse_args()

    try:
        result = analyze_file(args.csv_path)
    except IncidentFileError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    print(render_summary(result))
    while True:
        try:
            answer = input("Export results to CSV? [y / n]: ").strip().lower()
        except EOFError:
            return 0
        if answer in {"y", "n"}:
            break
        print("Please enter y or n.")

    if answer == "y":
        try:
            Path("results.csv").write_text(results_csv(result), encoding="utf-8", newline="")
        except OSError:
            print("Error: Could not write results.csv.", file=sys.stderr)
            return 2
        print("Results exported to results.csv")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
