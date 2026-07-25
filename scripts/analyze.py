#!/usr/bin/env python3

import argparse
import csv
import sys
import unicodedata
from collections import Counter
from pathlib import Path


STATUS_VALUES = ("abierto", "cerrado", "descartado")
SATISFACTION_MIN = 0.0
SATISFACTION_MAX = 5.0
HEADER_ALIASES = {
    "categoria": "category",
    "category": "category",
    "tipo": "category",
    "type": "category",
    "estado": "status",
    "status": "status",
    "satisfaccion": "satisfaction",
    "satisfaction": "satisfaction",
    "indice_de_satisfaccion": "satisfaction",
    "indice_satisfaccion": "satisfaction",
    "satisfaction_index": "satisfaction",
    "score": "satisfaction",
}


def normalize_text(value):
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return "_".join(ascii_only.strip().lower().split())


def canonicalize_row(row):
    canonical = {}
    for key, value in row.items():
        normalized_key = normalize_text(key)
        alias = HEADER_ALIASES.get(normalized_key)
        if alias:
            canonical[alias] = (value or "").strip()
    return canonical


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Analiza un CSV de incidentes y calcula metricas sobre registros validos. "
            "Columnas esperadas: categoria/category, estado/status y "
            "satisfaccion/satisfaction."
        )
    )
    parser.add_argument("csv_file", help="Ruta del archivo CSV a procesar")
    return parser.parse_args()


def validate_row(row):
    category = row.get("category", "")
    status = normalize_text(row.get("status", ""))
    satisfaction_raw = row.get("satisfaction", "")

    if not category:
        return False, "categoria vacia", None

    if not status:
        return False, "estado vacio", None

    if status not in STATUS_VALUES:
        return False, f"estado fuera de rango: {row.get('status', '').strip() or 'sin valor'}", None

    if status == "cerrado" and not satisfaction_raw:
        return False, "satisfaccion vacia para caso cerrado", None

    satisfaction_value = None
    if satisfaction_raw:
        normalized_number = satisfaction_raw.replace(",", ".")
        try:
            satisfaction_value = float(normalized_number)
        except ValueError:
            return False, f"satisfaccion invalida: {satisfaction_raw}", None

        if not SATISFACTION_MIN <= satisfaction_value <= SATISFACTION_MAX:
            return False, (
                f"satisfaccion fuera de rango: {satisfaction_raw} "
                f"(esperado entre {SATISFACTION_MIN:g} y {SATISFACTION_MAX:g})"
            ), None

    return True, None, {
        "category": category,
        "status": status,
        "satisfaction": satisfaction_value,
    }


def analyze_csv(csv_path):
    category_counts = Counter()
    status_counts = Counter({status: 0 for status in STATUS_VALUES})
    invalid_reasons = Counter()
    total_rows = 0
    valid_rows = 0
    closed_satisfaction_sum = 0.0
    closed_satisfaction_count = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)

        if not reader.fieldnames:
            raise ValueError("El archivo CSV no contiene encabezados")

        recognized_headers = {
            HEADER_ALIASES.get(normalize_text(fieldname), "") for fieldname in reader.fieldnames
        }
        missing_headers = [field for field in ("category", "status") if field not in recognized_headers]
        if missing_headers:
            missing_display = ", ".join(missing_headers)
            raise ValueError(
                "Faltan columnas obligatorias en el encabezado: "
                f"{missing_display}. Usa aliases como categoria/category y estado/status."
            )

        for row in reader:
            total_rows += 1
            is_valid, reason, parsed = validate_row(canonicalize_row(row))
            if not is_valid:
                invalid_reasons[reason] += 1
                continue

            valid_rows += 1
            category_counts[parsed["category"]] += 1
            status_counts[parsed["status"]] += 1

            if parsed["status"] == "cerrado" and parsed["satisfaction"] is not None:
                closed_satisfaction_sum += parsed["satisfaction"]
                closed_satisfaction_count += 1

    average_satisfaction = None
    if closed_satisfaction_count:
        average_satisfaction = closed_satisfaction_sum / closed_satisfaction_count

    return {
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": total_rows - valid_rows,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "invalid_reasons": invalid_reasons,
        "average_satisfaction": average_satisfaction,
    }


def print_summary(results):
    print("\n" + "=" * 60)
    print("RESUMEN DE ANALISIS DE INCIDENTES")
    print("=" * 60)
    print(f"Filas leidas:              {results['total_rows']}")
    print(f"Registros validos:         {results['valid_rows']}")
    print(f"Registros invalidos:       {results['invalid_rows']}")
    print(f"Total procesados validos:  {results['valid_rows']}")

    print("\nPor categoria")
    print("-" * 60)
    if results["category_counts"]:
        for category, count in sorted(results["category_counts"].items()):
            print(f"{category:<30} {count:>6}")
    else:
        print("Sin categorias validas")

    print("\nPor estado")
    print("-" * 60)
    for status in STATUS_VALUES:
        print(f"{status:<30} {results['status_counts'][status]:>6}")

    print("\nSatisfaccion media en casos cerrados")
    print("-" * 60)
    if results["average_satisfaction"] is None:
        print("No disponible")
    else:
        print(f"{results['average_satisfaction']:.2f} / {SATISFACTION_MAX:g}")

    if results["invalid_reasons"]:
        print("\nMotivos de invalidez")
        print("-" * 60)
        for reason, count in results["invalid_reasons"].most_common():
            print(f"{reason:<45} {count:>6}")


def export_results(results, output_path):
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["section", "key", "value"])
        writer.writerow(["general", "total_rows", results["total_rows"]])
        writer.writerow(["general", "valid_rows", results["valid_rows"]])
        writer.writerow(["general", "invalid_rows", results["invalid_rows"]])

        for category, count in sorted(results["category_counts"].items()):
            writer.writerow(["category", category, count])

        for status in STATUS_VALUES:
            writer.writerow(["status", status, results["status_counts"][status]])

        average = "N/A" if results["average_satisfaction"] is None else f"{results['average_satisfaction']:.2f}"
        writer.writerow(["closed_cases", "average_satisfaction", average])

        for reason, count in results["invalid_reasons"].most_common():
            writer.writerow(["invalid_reason", reason, count])


def ask_for_export():
    try:
        answer = input("\n¿Deseas exportar los resultados a CSV? [s/n] ").strip().lower()
    except EOFError:
        return False
    return answer == "s"


def main():
    args = parse_args()
    csv_path = Path(args.csv_file)

    if not csv_path.is_file():
        print(f"Error: no se encontro el archivo '{csv_path}'.", file=sys.stderr)
        return 1

    try:
        results = analyze_csv(csv_path)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Error al leer el archivo: {error}", file=sys.stderr)
        return 1

    print_summary(results)

    if ask_for_export():
        output_path = Path("results.csv")
        try:
            export_results(results, output_path)
        except OSError as error:
            print(f"No se pudo generar '{output_path}': {error}", file=sys.stderr)
            return 1
        print(f"Archivo exportado correctamente en: {output_path.resolve()}")
    else:
        print("Exportacion omitida.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())