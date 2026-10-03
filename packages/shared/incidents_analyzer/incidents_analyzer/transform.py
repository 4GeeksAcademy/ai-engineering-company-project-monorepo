"""Turns a helpdesk CSV row into the fields of an incident.

The CSV predates the incident model, so a row is translated (CONTEXT-nexova.es.md,
"Datos históricos — seed desde CSV"; the maps live in ``packages/shared/incidents/contract.json``):

    ticket_id            -> not stored: only the key that stops a row from being imported twice
    description          -> title        (its first 120 characters, trimmed; a row whose title
                                          would be empty is discarded)
    description          -> description  (copied literally)
    date                 -> created_at   (YYYY-MM-DD as midnight UTC; updated_at is the same)
    status               -> CSV_STATUS_MAP   (OPEN / CLOSED / DISCARDED -> open / resolved / discarded)
    category             -> CSV_CATEGORY_MAP (TECHNICAL, ACCESS -> technical_failure;
                                              BILLING, HR_QUERY -> process_error;
                                              COMPLAINT -> client_complaint)
    location | ubicacion -> branch   (an optional column; the provided CSV has none, so ``central``)
    (constant)           -> origin = "customer"

Pure and standard-library only: it neither validates with pydantic nor touches a database. The
seed (``scripts/seed_incidents.py``) calls it and then lets the API's model and store do their part.
``import_problems`` is the validation: the CSV rules the analysis already counts
(``validate_record``) plus what an import needs on top (a known status, a real date, a title,
a known branch).
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone

from .contract import CSV_CATEGORY_MAP, CSV_STATUS_MAP, DEFAULT_BRANCH, TITLE_MAX
from .core import validate_record
from .rules import branch_value

IMPORT_ORIGIN = "customer"  # the helpdesk only logs customer tickets
LOCATION_COLUMNS = ("location", "ubicacion", "ubicación")


def map_status(csv_status: str) -> str:
    return CSV_STATUS_MAP[csv_status.strip()]


def map_category(csv_category: str) -> str:
    return CSV_CATEGORY_MAP[csv_category.strip()]


def title_from_description(description: str) -> str:
    """The first TITLE_MAX characters of the description, trimmed (empty if there is nothing left)."""
    return description[:TITLE_MAX].strip()


def created_at_from_date(csv_date: str) -> datetime:
    """``2024-03-05`` -> 2024-03-05 00:00 UTC. Raises ``ValueError`` if it is not YYYY-MM-DD."""
    return datetime.combine(date.fromisoformat(csv_date.strip()), time.min, tzinfo=timezone.utc)


def location_text(row: dict[str, str]) -> str:
    """What the optional location column says ("" if there is none)."""
    for column in LOCATION_COLUMNS:
        value = (row.get(column) or "").strip()
        if value:
            return value
    return ""


def branch_from_row(row: dict[str, str]) -> str | None:
    """The branch of a row: its location column if it names one of Nexova's offices, ``central`` if
    the row has no location, ``None`` if the location is not an office."""
    text = location_text(row)
    return branch_value(text) if text else DEFAULT_BRANCH


def source_key(row: dict[str, str]) -> str:
    """What identifies a row so it is never imported twice: its ``ticket_id``; if it has none,
    ``title + created_at``. Only used to control duplicates, never stored on the incident."""
    ticket_id = (row.get("ticket_id") or "").strip()
    if ticket_id:
        return ticket_id
    return f"{title_from_description(row.get('description') or '')}|{created_at_from_date(row['date']).isoformat()}"


def import_problems(row: dict[str, str]) -> list[str]:
    """Rule keys a CSV row breaks for an import (empty = it can be imported).

    The first group is exactly what ``validate_record`` reports for the CSV analysis; the
    extra keys guard what those rules do not cover.
    """
    problems = validate_record(row)
    if problems:
        return problems
    if (row.get("status") or "").strip() not in CSV_STATUS_MAP:
        return ["invalid_or_missing_status"]
    try:
        created_at_from_date(row.get("date") or "")
    except ValueError:
        return ["invalid_date"]
    if not title_from_description(row["description"]):
        return ["empty_title"]
    if branch_from_row(row) is None:
        return ["invalid_branch"]
    return []


def to_incident_fields(row: dict[str, str]) -> dict:
    """The incident fields for a row that has no ``import_problems`` (``created_at`` is a datetime).
    ``source_key`` is not a field of the incident: it is what the seed uses to skip rows it already loaded."""
    status = map_status(row["status"])
    score = (row.get("satisfaction_score") or "").strip()
    return {
        "source_key": source_key(row),
        "title": title_from_description(row["description"]),
        "description": row["description"],
        "category": map_category(row["category"]),
        "origin": IMPORT_ORIGIN,
        "branch": branch_from_row(row),
        "client_company": row["client_company"],
        "agent_id": row["agent_id"],
        "customer_email": row["customer_email"],
        "status": status,
        "satisfaction_score": int(score) if score and status == "resolved" else None,
        "created_at": created_at_from_date(row["date"]),
    }
