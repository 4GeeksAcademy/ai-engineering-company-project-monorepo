"""
persistence.py — Brasaland · Incident persistence layer (TinyDB)

Separate JSON database file for incidents, isolated from suppliers/users.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from tinydb import TinyDB, Query

from .models import Incident

# Resolve DB path relative to services/api/
_api_root = Path(__file__).resolve().parent.parent.parent.parent
_default_path = _api_root / "data" / "brasaland_incidents.json"
_raw_db_path = os.environ.get("INCIDENTS_DB_PATH", str(_default_path))

_db_path = Path(_raw_db_path)
if not _db_path.is_absolute():
    _db_path = _api_root / _db_path

_db_path.parent.mkdir(parents=True, exist_ok=True)

_db = TinyDB(str(_db_path))
_TABLE = _db.table("incidents")
_Q = Query()


class IncidentRepository:
    """TinyDB-backed repository for incident CRUD + queries."""

    def __init__(self, table: Any | None = None):
        self._table = table or _TABLE

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_by_id(self, incident_id: str) -> Incident | None:
        """Return an incident by its id, or None."""
        doc = self._table.get(_Q.id == incident_id)
        return Incident.from_dict(doc) if doc else None

    def get_by_external_ref(self, external_ref: str) -> Incident | None:
        """Return an incident by its external CSV reference, or None."""
        doc = self._table.get(_Q.external_ref == external_ref)
        return Incident.from_dict(doc) if doc else None

    def get_all(self) -> list[Incident]:
        """Return all incidents ordered by reported_at descending."""
        docs = self._table.all()
        incidents = [Incident.from_dict(d) for d in docs]
        incidents.sort(key=lambda i: i.reported_at, reverse=True)
        return incidents

    def exists_by_external_ref(self, external_ref: str) -> bool:
        """Check if an incident with this external_ref already exists."""
        return self._table.contains(_Q.external_ref == external_ref)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def insert(self, incident: Incident) -> None:
        """Insert a new incident record."""
        self._table.insert(incident.to_dict())

    def update_status(self, incident_id: str, new_status: str) -> Incident | None:
        """Update the status and updated_at of an incident. Returns updated or None."""
        from datetime import datetime, timezone

        doc = self._table.get(_Q.id == incident_id)
        if doc is None:
            return None
        doc["status"] = new_status
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._table.update(doc, _Q.id == incident_id)
        return Incident.from_dict(doc)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def get_summary(self) -> dict:
        """Compute aggregate summary of all incidents."""
        incidents = self.get_all()
        if not incidents:
            return {
                "total": 0,
                "by_status": {},
                "by_category": {},
                "by_branch": {},
                "by_origin": {},
            }

        by_status: dict[str, int] = {}
        by_category: dict[str, int] = {}
        by_branch: dict[str, int] = {}
        by_origin: dict[str, int] = {}

        for inc in incidents:
            by_status[inc.status] = by_status.get(inc.status, 0) + 1
            by_category[inc.category] = by_category.get(inc.category, 0) + 1
            by_branch[inc.branch] = by_branch.get(inc.branch, 0) + 1
            by_origin[inc.origin] = by_origin.get(inc.origin, 0) + 1

        return {
            "total": len(incidents),
            "by_status": by_status,
            "by_category": by_category,
            "by_branch": by_branch,
            "by_origin": by_origin,
        }

    # ------------------------------------------------------------------
    # Bulk (for seed)
    # ------------------------------------------------------------------

    def count(self) -> int:
        """Return the total number of incident records."""
        return len(self._table)

    def clear(self) -> None:
        """Remove all incident records."""
        self._table.truncate()
