"""Turns a helpdesk CSV row into the fields of an incident.

The CSV predates the incident model, so a row is translated (the maps live in
``packages/shared/incidents/contract.json``; the CONTEXT does not define them):

    ticket_id            -> id
    description          -> title   (shortened at a word boundary if too long;
                                     the full text stays in ``description``)
    date                 -> created_at (00:00 UTC)
    status               -> CSV_STATUS_MAP   (OPEN / CLOSED / DISCARDED
                                              -> open / resolved / discarded)
    category             -> CSV_CATEGORY_MAP (identical names today)
    location | ubicacion -> branch   (an optional column; the provided CSV has
                                      none, so ``central``, "does not apply")
    (constant)           -> origin = "customer"

Pure and standard-library only: it neither validates with pydantic nor touches
a database. The seed (``scripts/seed_incidents.py``) calls it and then lets the
API's model and store do their part. ``import_problems`` is the validation: the
CSV rules the analysis already counts (``validate_record``) plus what an import
needs on top (a known status, a real date).
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone

from .contract import CSV_CATEGORY_MAP, CSV_STATUS_MAP, DEFAULT_BRANCH, TITLE_MAX
from .core import validate_record

IMPORT_ORIGIN = "customer"  # the helpdesk only logs customer tickets
LOCATION_COLUMNS = ("location", "ubicacion", "ubicación")


def map_status(csv_status: str) -> str:
    return CSV_STATUS_MAP[csv_status.strip()]


def map_category(csv_category: str) -> str:
    return CSV_CATEGORY_MAP[csv_category.strip()]


def title_from_description(description: str) -> str:
    """The description up to TITLE_MAX characters, cut at a word boundary (with an ellipsis if cut)."""
    text = " ".join(description.split())
    if len(text) <= TITLE_MAX:
        return text
    return text[: TITLE_MAX - 1].rsplit(" ", 1)[0].rstrip(" ,.;:-") + "…"


def created_at_from_date(csv_date: str) -> datetime:
    """``2024-03-05`` -> 2024-03-05 00:00 UTC. Raises ``ValueError`` if it is not YYYY-MM-DD."""
    return datetime.combine(date.fromisoformat(csv_date.strip()), time.min, tzinfo=timezone.utc)


def branch_from_row(row: dict[str, str]) -> str:
    for column in LOCATION_COLUMNS:
        value = (row.get(column) or "").strip()
        if value:
            return value
    return DEFAULT_BRANCH


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
    return []


def to_incident_fields(row: dict[str, str]) -> dict:
    """The incident fields for a row that has no ``import_problems`` (``created_at`` is a datetime)."""
    status = map_status(row["status"])
    score = (row.get("satisfaction_score") or "").strip()
    return {
        "id": row["ticket_id"].strip(),
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
