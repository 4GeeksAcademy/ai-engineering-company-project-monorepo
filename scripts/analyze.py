#!/usr/bin/env python3
"""Nexova support-incident CSV analyzer (Phase 1 — CLI).

Usage:
    python analyze.py <path-to-csv>
    python scripts/analyze.py data/raw/incidents-nexova.csv

Validates every record against the rules in ``CONTEXT-nexova.md``, prints a
summary, and offers to export the results to ``results.csv`` (one metric per
row). Validation and metrics logic lives in the shared ``incidents_analyzer``
package (see ``packages/incidents_analyzer``) so the API in ``services/api``
runs the exact same code — see rule 4 of the project brief.

Never prints, logs, or exports individual customer_email addresses (see
CONTEXT-nexova.md, stakeholder note), even for invalid records.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from incidents_analyzer import analyze, format_report, read_rows, to_export_rows


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python analyze.py <path-to-csv>", file=sys.stderr)
        return 2

    csv_path = Path(argv[1])
    if not csv_path.is_file():
        print(f"Error: file not found: {csv_path}", file=sys.stderr)
        return 1

    try:
        rows = read_rows(str(csv_path))
    except (OSError, csv.Error) as exc:
        print(f"Error: could not read CSV file: {exc}", file=sys.stderr)
        return 1

    result = analyze(rows, source_name=csv_path.name)
    print(format_report(result))

    answer = input("¿Deseas exportar los resultados a CSV? [s / n]: ").strip().lower()
    if answer == "s":
        export_path = csv_path.parent / "results.csv"
        export_rows = to_export_rows(result)
        with open(export_path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["metric", "value"])
            writer.writeheader()
            writer.writerows(export_rows)
        print(f"Se exportaron {len(export_rows)} métricas a {export_path}")
    else:
        print("Exportación omitida.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
