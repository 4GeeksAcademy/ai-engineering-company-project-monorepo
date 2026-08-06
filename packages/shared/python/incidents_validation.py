"""Shared validation helpers for incident ingestion and API workflows."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Any, Mapping

REQUIRED_FIELDS: tuple[str, ...] = (
    "title",
    "description",
    "category",
    "status",
    "branch",
)

HEADER_ALIASES: dict[str, str] = {
    "id": "incident_unique_key",
    "incident_id": "incident_unique_key",
    "external_id": "incident_unique_key",
    "ticket_id": "incident_unique_key",
    "case_id": "incident_unique_key",
    "codigo": "incident_unique_key",
    "codigo_incidencia": "incident_unique_key",
    "title": "title",
    "titulo": "title",
    "subject": "title",
    "description": "description",
    "descripcion": "description",
    "detalle": "description",
    "details": "description",
    "category": "category",
    "categoria": "category",
    "status": "status",
    "estado": "status",
    "origin": "origin",
    "origen": "origin",
    "branch": "branch",
    "sucursal": "branch",
    "delegacion": "branch",
}

CATEGORY_MAP: dict[str, str] = {
    "almacen": "Almacen",
    "warehouse": "Almacen",
    "ultima_milla": "Ultima_Milla",
    "last_mile": "Ultima_Milla",
    "logistica_inversa": "Logistica_Inversa",
    "reverse_logistics": "Logistica_Inversa",
    "cx": "CX",
    "comercial": "Comercial",
    "sales": "Comercial",
    "tecnologia": "Tecnologia",
    "technology": "Tecnologia",
}

STATUS_MAP: dict[str, str] = {
    "open": "open",
    "abierto": "open",
    "in_progress": "in_progress",
    "en_progreso": "in_progress",
    "resolved": "resolved",
    "resuelto": "resolved",
    "discarded": "discarded",
    "descartado": "discarded",
}

ORIGIN_MAP: dict[str, str] = {
    "customer": "customer",
    "cliente": "customer",
    "branch": "branch",
    "sucursal": "branch",
    "internal": "internal",
    "interno": "internal",
}

BRANCH_MAP: dict[str, str] = {
    "los_angeles": "Los Ángeles",
    "zaragoza": "Zaragoza",
    "central": "Central",
}


@dataclass(slots=True)
class IncidentRowValidationResult:
    """Validation result payload for one incident row."""

    is_valid: bool
    errors: list[str]
    payload: dict[str, str] | None
    unique_key: str | None


def normalize_text(value: Any) -> str:
    """Normalize text to predictable snake_case ASCII representation."""

    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return "_".join(ascii_only.strip().lower().split())


def canonicalize_csv_row(row: Mapping[str, Any]) -> dict[str, str]:
    """Map CSV headers from aliases to canonical incident fields."""

    canonical: dict[str, str] = {}

    for key, value in row.items():
        key_normalized = normalize_text(key)
        field_name = HEADER_ALIASES.get(key_normalized, key_normalized)
        canonical[field_name] = str(value or "").strip()

    return canonical


def _normalize_enum(value: str, mapping: Mapping[str, str], field_name: str, errors: list[str]) -> str:
    normalized_key = normalize_text(value)
    normalized_value = mapping.get(normalized_key)
    if normalized_value is None:
        errors.append(f"{field_name} invalido: {value or 'sin valor'}")
        return ""
    return normalized_value


def _resolve_unique_key(canonical_row: Mapping[str, str], unique_field: str) -> str | None:
    normalized_field = normalize_text(unique_field)
    canonical_key = HEADER_ALIASES.get(normalized_field, normalized_field)
    raw_value = canonical_row.get(canonical_key, "").strip()
    if raw_value:
        return raw_value
    return None


def validate_incident_seed_row(
    row: Mapping[str, Any],
    *,
    unique_field: str,
    default_origin: str = "customer",
) -> IncidentRowValidationResult:
    """Validate and normalize one incident row for ingestion from CSV."""

    canonical_row = canonicalize_csv_row(row)
    errors: list[str] = []

    unique_key = _resolve_unique_key(canonical_row, unique_field)
    if unique_key is None:
        errors.append(f"campo unico ausente o vacio: {unique_field}")

    for field_name in REQUIRED_FIELDS:
        if not canonical_row.get(field_name, "").strip():
            errors.append(f"campo obligatorio vacio: {field_name}")

    if errors:
        return IncidentRowValidationResult(
            is_valid=False,
            errors=errors,
            payload=None,
            unique_key=unique_key,
        )

    category = _normalize_enum(canonical_row["category"], CATEGORY_MAP, "category", errors)
    status = _normalize_enum(canonical_row["status"], STATUS_MAP, "status", errors)
    branch = _normalize_enum(canonical_row["branch"], BRANCH_MAP, "branch", errors)
    origin = _normalize_enum(default_origin, ORIGIN_MAP, "origin", errors)

    if errors:
        return IncidentRowValidationResult(
            is_valid=False,
            errors=errors,
            payload=None,
            unique_key=unique_key,
        )

    return IncidentRowValidationResult(
        is_valid=True,
        errors=[],
        payload={
            "title": canonical_row["title"],
            "description": canonical_row["description"],
            "category": category,
            "status": status,
            "origin": origin,
            "branch": branch,
        },
        unique_key=unique_key,
    )