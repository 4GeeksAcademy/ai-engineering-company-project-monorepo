"""Transformation of validated historical CSV rows into TrackFlow Incident
payloads, per `CONTEXT-trackflow.es.md`.

Pure domain logic: no TinyDB, no FastAPI. Consumed by the seed script and,
indirectly, by the API's own validation rules for consistency.

Privacy: `incident_id` and `customer_email` from the historical CSV are
never part of the transformed payload. `incident_id` is only usable for
idempotency via `historical_row_dedup_key`.
"""

from datetime import datetime, timezone
from typing import TypedDict


STATUS_BY_HISTORICAL_CODE = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

CATEGORY_BY_HISTORICAL_CODE = {
    "LOST_PARCEL": "lost_parcel",
    "DELAYED_DELIVERY": "carrier_issue",
    "WRONG_ADDRESS": "delivery_failure",
    "RETURN_REQUEST": "returns_issue",
    "DAMAGE": "carrier_issue",
}

BRANCH_BY_COUNTRY = {
    "US": "la_office",
    "ES": "zaragoza_office",
}

TITLE_MAX_LENGTH = 120

HISTORICAL_ORIGIN = "customer"


class TransformedIncident(TypedDict):
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: str
    updated_at: str


def transform_historical_row(row: dict) -> TransformedIncident | None:
    """Transform a valid historical CSV row into an Incident payload.

    Returns None if the row cannot be transformed (e.g. title would be
    empty after truncation). Callers are expected to only pass rows that
    already passed `validate_historical_incident_row`.
    """
    description = str(row.get("description") or "").strip()

    title = description[:TITLE_MAX_LENGTH].strip()
    if not title:
        return None

    status = STATUS_BY_HISTORICAL_CODE.get(str(row.get("status") or "").strip())
    category = CATEGORY_BY_HISTORICAL_CODE.get(str(row.get("category") or "").strip())
    branch = BRANCH_BY_COUNTRY.get(str(row.get("country") or "").strip())

    if status is None or category is None or branch is None:
        return None

    date_str = str(row.get("date") or "").strip()
    created_at = datetime.strptime(date_str, "%Y-%m-%d").replace(
        tzinfo=timezone.utc,
    ).isoformat()

    return {
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "origin": HISTORICAL_ORIGIN,
        "branch": branch,
        "created_at": created_at,
        "updated_at": created_at,
    }


def historical_row_dedup_key(row: dict, transformed: TransformedIncident) -> str:
    """Build an idempotency key for a historical row.

    Prefers the CSV `incident_id` (control-only, never persisted as part
    of the public Incident). Falls back to `title + created_at` when
    `incident_id` is absent.
    """
    incident_id = str(row.get("incident_id") or "").strip()
    if incident_id:
        return incident_id

    return f"{transformed['title']}|{transformed['created_at']}"
