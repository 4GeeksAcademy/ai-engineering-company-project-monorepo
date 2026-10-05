from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

STATUSES = ("open", "in_progress", "resolved", "discarded")
ORIGINS = ("customer", "branch", "internal")
CATEGORIES = (
    "clinical_equipment",
    "it_system",
    "billing_error",
    "compliance_breach",
    "patient_experience",
    "staff_issue",
    "facility_issue",
    "referral_issue",
    "other",
)
BRANCHES = (
    "central",
    "austin_north",
    "dallas_uptown",
    "houston_med_center",
    "san_antonio_west",
    "miami_brickell",
    "miami_doral",
    "orlando_east",
    "tampa_bay",
    "atlanta_midtown",
    "savannah",
    "london_city",
    "london_west",
    "manchester_central",
)
TRANSITIONS = {
    "open": frozenset({"in_progress", "discarded"}),
    "in_progress": frozenset({"resolved", "discarded"}),
    "resolved": frozenset(),
    "discarded": frozenset(),
}
FIELDS = (
    "id",
    "title",
    "description",
    "category",
    "status",
    "origin",
    "branch",
    "created_at",
    "updated_at",
)


def database_path() -> Path:
    override = os.environ.get("INCIDENTS_DB", "").strip()
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[2] / "data" / "incidents.sqlite"


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    _ensure_schema(connection)
    return connection


def _ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL,
            origin TEXT NOT NULL,
            branch TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CHECK (length(trim(title)) > 0),
            CHECK (length(trim(description)) > 0),
            CHECK (status IN ('open', 'in_progress', 'resolved', 'discarded')),
            CHECK (origin IN ('customer', 'branch', 'internal')),
            CHECK (category IN (
                'clinical_equipment',
                'it_system',
                'billing_error',
                'compliance_breach',
                'patient_experience',
                'staff_issue',
                'facility_issue',
                'referral_issue',
                'other'
            )),
            CHECK (branch IN (
                'central',
                'austin_north',
                'dallas_uptown',
                'houston_med_center',
                'san_antonio_west',
                'miami_brickell',
                'miami_doral',
                'orlando_east',
                'tampa_bay',
                'atlanta_midtown',
                'savannah',
                'london_city',
                'london_west',
                'manchester_central'
            ))
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS incident_seed_keys (
            csv_incident_id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL
        )
        """
    )


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _incident(row: sqlite3.Row) -> dict[str, str]:
    return {field: row[field] for field in FIELDS}


def create_incident(
    connection: sqlite3.Connection,
    values: dict[str, str],
    seed_key: str | None = None,
) -> dict[str, str] | None:
    if seed_key is not None:
        existing = connection.execute(
            "SELECT csv_incident_id FROM incident_seed_keys WHERE csv_incident_id = ?",
            (seed_key,),
        ).fetchone()
        if existing is not None:
            return None
    created_at = values.get("created_at") or _now()
    updated_at = values.get("updated_at") or created_at
    incident_id = str(uuid.uuid4())
    connection.execute(
        """
        INSERT INTO incidents (
            id, title, description, category, status, origin, branch, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            incident_id,
            values["title"],
            values["description"],
            values["category"],
            values["status"],
            values["origin"],
            values["branch"],
            created_at,
            updated_at,
        ),
    )
    if seed_key is not None:
        connection.execute(
            "INSERT INTO incident_seed_keys (csv_incident_id, incident_id) VALUES (?, ?)",
            (seed_key, incident_id),
        )
    row = connection.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    return _incident(row)


def list_incidents(connection: sqlite3.Connection, filters: dict[str, str]) -> list[dict[str, str]]:
    clauses: list[str] = []
    params: list[str] = []
    for field in ("status", "origin", "branch", "category"):
        if field in filters:
            clauses.append(f"{field} = ?")
            params.append(filters[field])
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = connection.execute(
        f"SELECT * FROM incidents {where} ORDER BY created_at ASC, id ASC",
        params,
    ).fetchall()
    return [_incident(row) for row in rows]


def get_incident(connection: sqlite3.Connection, incident_id: str) -> dict[str, str] | None:
    row = connection.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if row is None:
        return None
    return _incident(row)


def update_incident_status(
    connection: sqlite3.Connection,
    incident_id: str,
    status: str,
) -> dict[str, str] | None:
    current = get_incident(connection, incident_id)
    if current is None:
        return None
    connection.execute(
        "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
        (status, _now(), incident_id),
    )
    return get_incident(connection, incident_id)


def summarize(connection: sqlite3.Connection) -> dict[str, dict[str, int]]:
    return {
        "by_status": _counts(connection, "status", STATUSES),
        "by_category": _counts(connection, "category", CATEGORIES),
        "by_origin": _counts(connection, "origin", ORIGINS),
        "by_branch": _counts(connection, "branch", BRANCHES),
    }


def _counts(connection: sqlite3.Connection, column: str, keys: tuple[str, ...]) -> dict[str, int]:
    rows = connection.execute(f"SELECT {column} AS key, COUNT(*) AS total FROM incidents GROUP BY {column}").fetchall()
    found = {row["key"]: int(row["total"]) for row in rows}
    return {key: found.get(key, 0) for key in keys}
