"""Carga el histórico CSV de incidencias de clientes de forma idempotente.

Uso: python scripts/seed_incidents.py [ruta/al/historico.csv]
"""
from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from packages.shared.incident_validation import ValidationError, validate_incident
from services.api.database import connect, init_db


def value(row: dict[str, str], *names: str) -> str:
    for name in names:
        if row.get(name, "").strip():
            return row[name].strip()
    return ""


def map_status(raw: str) -> str:
    return {"abierto": "open", "open": "open", "pendiente": "open", "en progreso": "in_progress", "in_progress": "in_progress", "resuelto": "resolved", "resolved": "resolved", "descartado": "discarded", "discarded": "discarded"}.get(raw.lower().strip(), raw.lower().strip())


def map_category(raw: str) -> str:
    normalized = raw.lower().strip()
    return {"servicio": "service", "queja": "service", "calidad": "product_quality", "calidad de producto": "product_quality", "pago": "payment", "pagos": "payment", "tecnología": "technology", "tecnologia": "technology", "inventario": "inventory", "operación": "operations", "operacion": "operations"}.get(normalized, normalized)


def map_branch(raw: str) -> str:
    normalized = raw.lower().strip().replace(" ", "_").replace("-", "_")
    aliases = {"central": "central", "oficina_central": "central", "medellin": "central", "miami": "florida_miami"}
    return aliases.get(normalized, normalized)


def parse_date(raw: str) -> str:
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    for format_ in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(raw.strip(), format_).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            pass
    raise ValueError("La fecha no tiene un formato reconocido.")


def transform(row: dict[str, str], row_number: int) -> tuple[str, dict[str, str]]:
    source_id = value(row, "id", "incident_id", "ticket_id", "codigo", "case_id") or f"csv-row-{row_number}"
    description = value(row, "description", "descripcion", "detalle", "issue")
    data = {
        "title": value(row, "title", "titulo") or description[:80],
        "description": description,
        "category": map_category(value(row, "category", "categoria")),
        "status": map_status(value(row, "status", "estado")),
        "origin": "customer",
        "branch": map_branch(value(row, "branch", "sede", "location", "ubicacion")),
    }
    data["created_at"] = parse_date(value(row, "created_at", "createdAt", "date", "fecha"))
    return source_id, validate_incident(data)


def seed(csv_path: Path) -> tuple[int, list[str]]:
    init_db()
    inserted = 0
    invalid: list[str] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file, connect() as connection:
        for row_number, row in enumerate(csv.DictReader(file), start=2):
            try:
                source_id, data = transform(row, row_number)
                exists = connection.execute("SELECT 1 FROM incidents WHERE source_id = ?", (source_id,)).fetchone()
                if exists:
                    continue
                timestamp = data.pop("created_at")
                connection.execute(
                    "INSERT INTO incidents (title, description, category, status, origin, branch, created_at, updated_at, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (data["title"], data["description"], data["category"], data["status"], data["origin"], data["branch"], timestamp, timestamp, source_id),
                )
                inserted += 1
            except (ValidationError, ValueError, KeyError) as error:
                invalid.append(f"fila {row_number}: {error}")
    return inserted, invalid


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/raw/incidents.csv"
    if not path.exists():
        print(f"No se encontró el CSV histórico: {path}")
        raise SystemExit(1)
    inserted, invalid_rows = seed(path)
    print(f"Incidencias insertadas: {inserted}")
    print(f"Filas inválidas omitidas: {len(invalid_rows)}")
    for invalid_row in invalid_rows:
        print(f"- {invalid_row}")