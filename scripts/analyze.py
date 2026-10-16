from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared.incidents_analysis import (  # noqa: E402
    analyze_incidents_file,
    build_export_rows,
    format_console_report,
)


def export_results_csv(output_path: Path, rows: list[dict[str, object]]) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=["section", "metric", "value", "percentage"]
        )
        writer.writeheader()
        writer.writerows(rows)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python analyze.py <path-to-csv-file>")
        return 1

    csv_path = Path(argv[1]).resolve()
    if not csv_path.exists() or not csv_path.is_file():
        print(f"Error: file not found: {csv_path}")
        return 1

    try:
        result = analyze_incidents_file(csv_path)
    except Exception as exc:  # pragma: no cover - defensive path
        print(f"Error processing CSV: {exc}")
        return 1

    report = format_console_report(result, source_file=csv_path.name)
    print(report)

    answer = input("Export results to CSV? [y / n]: ").strip().lower()
    if answer == "y":
        output_path = Path.cwd() / "results.csv"
        export_rows = build_export_rows(result)
        export_results_csv(output_path, export_rows)
        print(f"Results exported to {output_path}")
    else:
        print("Export skipped.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
