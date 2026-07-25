"""Reusable incidents CSV analysis service."""

from __future__ import annotations

import csv
import io
import unicodedata
from collections import Counter
from typing import Any

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


def normalize_text(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return "_".join(ascii_only.strip().lower().split())


def canonicalize_row(row: dict[str, Any]) -> dict[str, str]:
    canonical: dict[str, str] = {}

    for key, value in (row or {}).items():
        normalized_key = normalize_text(key)
        alias = HEADER_ALIASES.get(normalized_key)
        if alias:
            canonical[alias] = str(value or "").strip()

    return canonical


def validate_row(row: dict[str, str]) -> tuple[bool, str | None, dict[str, Any] | None]:
    category = row.get("category", "")
    status = normalize_text(row.get("status", ""))
    satisfaction_raw = row.get("satisfaction", "")

    if not category:
        return False, "categoria vacia", None

    if not status:
        return False, "estado vacio", None

    if status not in STATUS_VALUES:
        raw_status = row.get("status", "").strip() or "sin valor"
        return False, f"estado fuera de rango: {raw_status}", None

    if status == "cerrado" and not satisfaction_raw:
        return False, "satisfaccion vacia para caso cerrado", None

    satisfaction_value: float | None = None
    if satisfaction_raw:
        normalized_number = satisfaction_raw.replace(",", ".")
        try:
            satisfaction_value = float(normalized_number)
        except ValueError:
            return False, f"satisfaccion invalida: {satisfaction_raw}", None

        if not SATISFACTION_MIN <= satisfaction_value <= SATISFACTION_MAX:
            return (
                False,
                f"satisfaccion fuera de rango: {satisfaction_raw} "
                f"(esperado entre {SATISFACTION_MIN:g} y {SATISFACTION_MAX:g})",
                None,
            )

    return (
        True,
        None,
        {
            "category": category,
            "status": status,
            "satisfaction": satisfaction_value,
        },
    )


def ensure_required_headers(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise ValueError("El archivo CSV no contiene encabezados")

    recognized_headers = {
        HEADER_ALIASES.get(normalize_text(fieldname), "") for fieldname in fieldnames
    }
    missing_headers = [field for field in ("category", "status") if field not in recognized_headers]

    if missing_headers:
        missing_display = ", ".join(missing_headers)
        raise ValueError(
            "Faltan columnas obligatorias en el encabezado: "
            f"{missing_display}. Usa aliases como categoria/category y estado/status."
        )


def analyze_incidents_csv(csv_bytes: bytes) -> dict[str, Any]:
    try:
        csv_text = csv_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("El archivo CSV debe estar codificado en UTF-8") from error

    csv_stream = io.StringIO(csv_text)
    reader = csv.DictReader(csv_stream)

    ensure_required_headers(reader.fieldnames)

    category_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter({status: 0 for status in STATUS_VALUES})
    invalid_reasons: Counter[str] = Counter()

    total_rows = 0
    valid_rows = 0
    closed_satisfaction_sum = 0.0
    closed_satisfaction_count = 0

    for row in reader:
        # Ignore fully empty lines in the payload.
        if not row or all(str(value or "").strip() == "" for value in row.values()):
            continue

        total_rows += 1
        is_valid, reason, parsed = validate_row(canonicalize_row(row))

        if not is_valid:
            invalid_reasons[reason or "registro invalido"] += 1
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
        "totalRows": total_rows,
        "validRows": valid_rows,
        "invalidRows": total_rows - valid_rows,
        "categoryCounts": dict(category_counts),
        "statusCounts": {status: status_counts[status] for status in STATUS_VALUES},
        "invalidReasons": dict(invalid_reasons),
        "averageSatisfaction": average_satisfaction,
    }
