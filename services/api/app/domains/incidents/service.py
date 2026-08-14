"""
service.py — Brasaland · Incident business service

Orchestrates CRUD operations with state-machine validation.
"""

from __future__ import annotations

from .constants import STATE_TRANSITIONS, TERMINAL_STATUSES
from .errors import (
    IncidentDuplicateError,
    IncidentInvalidTransitionError,
    IncidentNotFoundError,
    IncidentValidationError,
)
from .models import Incident
from .persistence import IncidentRepository
from .validation import normalize_status, validate_incident_input, validate_status_transition


class IncidentService:
    """High-level incident operations."""

    def __init__(self, repository: IncidentRepository | None = None):
        self.repo = repository or IncidentRepository()

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_incident(
        self,
        *,
        title: str,
        description: str,
        category: str,
        branch: str,
        origin: str = "api",
        external_ref: str | None = None,
    ) -> Incident:
        """Validate, check duplicates, create and persist a new incident."""
        validate_incident_input(
            title=title,
            description=description,
            category=category,
            branch=branch,
        )

        if external_ref and self.repo.exists_by_external_ref(external_ref):
            raise IncidentDuplicateError(
                f"Incident with external_ref {external_ref!r} already exists."
            )

        incident = Incident.create(
            title=title.strip(),
            description=description.strip(),
            category=category.strip(),
            branch=branch.strip(),
            origin=origin,
            external_ref=external_ref,
        )
        self.repo.insert(incident)
        return incident

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_incident(self, incident_id: str) -> Incident:
        """Return an incident or raise 404."""
        incident = self.repo.get_by_id(incident_id)
        if incident is None:
            raise IncidentNotFoundError(f"Incident {incident_id!r} not found.")
        return incident

    def list_incidents(
        self,
        *,
        status: str | None = None,
        category: str | None = None,
        branch: str | None = None,
    ) -> list[Incident]:
        """List all incidents, optionally filtered."""
        incidents = self.repo.get_all()

        if status:
            s = normalize_status(status)
            incidents = [i for i in incidents if i.status == s]
        if category:
            c = category.strip().upper()
            incidents = [i for i in incidents if i.category == c]
        if branch:
            b = branch.strip().upper()
            incidents = [i for i in incidents if i.branch == b]

        return incidents

    # ------------------------------------------------------------------
    # Update status
    # ------------------------------------------------------------------

    def update_status(self, incident_id: str, new_status: str) -> Incident:
        """Transition an incident to a new status (state-machine validated)."""
        incident = self.get_incident(incident_id)

        target = normalize_status(new_status)

        if incident.status in TERMINAL_STATUSES:
            raise IncidentInvalidTransitionError(
                f"Incident is in terminal state {incident.status!r} and cannot be updated."
            )

        validate_status_transition(incident.status, target)

        updated = self.repo.update_status(incident_id, target)
        assert updated is not None  # guaranteed by get_incident above
        return updated

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def get_summary(self) -> dict:
        """Return aggregate summary of all incidents."""
        return self.repo.get_summary()

    # ------------------------------------------------------------------
    # Seed helper
    # ------------------------------------------------------------------

    def seed_from_csv_row(
        self,
        *,
        external_ref: str,
        category: str,
        description: str,
        status_csv: str,
        branch: str,
    ) -> Incident | None:
        """Seed a single incident from CSV data. Returns None if duplicate.

        This maps CSV fields to the API model:
          - external_ref: CSV incident_id (for idempotency)
          - description → title (first letter uppercase + trailing period)
          - status_csv: OPEN/CLOSED/DISCARDED → API status
        """
        if self.repo.exists_by_external_ref(external_ref):
            return None

        # Map description → title
        title = description.strip()
        if title:
            title = title[0].upper() + title[1:]
            if not title.endswith("."):
                title += "."

        # Map CSV status
        from .constants import CSV_STATUS_MAP

        upper_status = status_csv.strip().upper()
        api_status = CSV_STATUS_MAP.get(upper_status, "open")

        incident = Incident.create(
            title=title,
            description=description.strip(),
            category=category.strip(),
            branch=branch.strip(),
            origin="csv_import",
            external_ref=external_ref,
        )
        # Override status (Incident.create always sets "open")
        incident.status = api_status
        self.repo.insert(incident)
        return incident
