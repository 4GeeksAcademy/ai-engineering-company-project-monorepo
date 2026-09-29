"""Analyze an incidents CSV file from the command line."""

import argparse
from pathlib import Path
from typing import Any

import pandas as pd

from ai_engineering_company_project_monorepo.services.incident_analysis import (
    analyze_dataframe,
    summary_to_rows,
)


def analyze_csv(csv_path: Path) -> pd.DataFrame:
    """Load the CSV file into a pandas DataFrame."""
    return pd.read_csv(csv_path)


def build_result_rows(summary: dict[str, Any]) -> list[dict[str, object]]:
    """Build one exportable row for each calculated metric."""
    return summary_to_rows(summary)


def print_summary(
    csv_path: Path,
    columns: list[str],
    results: list[dict[str, object]],
) -> None:
    """Print the analysis results in an aligned console table."""
    separator = "=" * 78
    print(separator)
    print("RESUMEN DEL ANÁLISIS")
    print(separator)
    print(f"Fichero   : {csv_path}")
    print(f"Columnas  : {len(columns)} ({', '.join(columns)})")
    print("-" * 78)
    print(f"{'MÉTRICA':<42} {'VALOR':>10}  DETALLES")
    print("-" * 78)
    for result in results:
        print(
            f"{str(result['metric']):<42} "
            f"{str(result['value']):>10}  {result['details']}"
        )
    print(separator)


def export_results(results: list[dict[str, object]], output_path: Path) -> None:
    """Export the calculated metrics to a CSV file."""
    pd.DataFrame(results, columns=["metric", "value", "details"]).to_csv(
        output_path, index=False
    )


def ask_for_export(results: list[dict[str, object]]) -> None:
    """Ask whether the user wants to export the results."""
    while True:
        try:
            answer = input("¿Deseas exportar los resultados a CSV? [s / n]. ").strip().lower()
        except EOFError:
            return
        if answer == "s":
            output_path = Path("results.csv")
            export_results(results, output_path)
            print(f"Resultados exportados en: {output_path}")
            return
        if answer == "n":
            print("No se han exportado los resultados.")
            return
        print("Respuesta no válida. Escribe s o n.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Analiza un fichero CSV de incidencias."
    )
    parser.add_argument("csv_path", type=Path, help="ruta al fichero CSV")
    args = parser.parse_args()

    if not args.csv_path.is_file():
        parser.error(f"no existe el fichero CSV: {args.csv_path}")

    try:
        dataframe = analyze_csv(args.csv_path)
    except (OSError, pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeError) as error:
        parser.error(str(error))

    summary = analyze_dataframe(dataframe)
    results = build_result_rows(summary)
    print_summary(args.csv_path, [str(column) for column in dataframe.columns], results)
    ask_for_export(results)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
