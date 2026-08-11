#!/usr/bin/env python3
"""HealthCore patient incident analysis CLI.

Usage:
    python analyze.py incidents-healthcore.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running from scripts/ without installing the package.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.incident_analyzer import (  # noqa: E402
    analyze_csv_path,
    format_console_report,
    write_results_csv,
)
from shared.incident_analyzer.analyze import IncidentCsvError  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1:
        print("Usage: python analyze.py <path_to_csv>", file=sys.stderr)
        return 2

    csv_path = Path(args[0])
    try:
        result = analyze_csv_path(csv_path)
    except IncidentCsvError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(format_console_report(result))
    try:
        answer = input("Export results to CSV? [y / n]: ").strip().lower()
    except EOFError:
        answer = "n"

    if answer == "y":
        output = Path.cwd() / "results.csv"
        write_results_csv(result, output)
        print(f"Results exported to {output}")
    else:
        print("Export skipped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
