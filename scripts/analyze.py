from __future__ import annotations

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SERVICE_ROOT = REPO_ROOT / "services" / "api"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.domains.analytics.incidents.analysis import (  # noqa: E402
    analyze_csv_file,
    render_console_report,
    write_results_csv,
)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python analyze.py <path-to-incidents.csv>")
        return 1

    source_path = Path(sys.argv[1]).expanduser()
    if not source_path.exists() or not source_path.is_file():
        print(f"File not found: {source_path}")
        return 1

    try:
        result = analyze_csv_file(source_path)
    except ValueError as error:
        print(f"Invalid CSV file: {error}")
        return 1

    print(render_console_report(result, source_path.name))

    response = input("Deseas exportar los resultados a CSV? [s / n]: ").strip().lower()
    if response == "s":
        output_path = Path.cwd() / "results.csv"
        write_results_csv(result, output_path)
        print(f"Archivo exportado: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())