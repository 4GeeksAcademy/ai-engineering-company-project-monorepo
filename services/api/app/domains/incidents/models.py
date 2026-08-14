"""
models.py — Brasaland · Incident domain model

Dataclass representing a single incident record.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class Incident:
    id: str
    title: str
    description: str
    category: str
    status: str  # open | in_progress | resolved | discarded
    branch: str  # e.g. COL-01, FLA-02, HQ-MDE
    reported_at: str
    updated_at: str
    origin: str = "api"
    external_ref: str | None = None  # CSV incident_id for idempotent imports

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Serialize to a plain dict (snake_case keys, for TinyDB)."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "status": self.status,
            "branch": self.branch,
            "reported_at": self.reported_at,
            "updated_at": self.updated_at,
            "origin": self.origin,
            "external_ref": self.external_ref,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Incident:
        """Deserialize from a plain dict."""
        return cls(
            id=data["id"],
            title=data["title"],
            description=data["description"],
            category=data["category"],
            status=data["status"],
            branch=data["branch"],
            reported_at=data["reported_at"],
            updated_at=data["updated_at"],
            origin=data.get("origin", "api"),
            external_ref=data.get("external_ref"),
        )

    def to_response_dict(self) -> dict:
        """Serialize for API responses (camelCase-compatible keys).

        The API convention in this codebase uses snake_case, so this
        matches to_dict(). Kept as a separate method for future
        migration to camelCase if needed.
        """
        return self.to_dict()

    # ------------------------------------------------------------------
    # Factory helpers
    # ------------------------------------------------------------------

    @classmethod
    def create(
        cls,
        *,
        title: str,
        description: str,
        category: str,
        branch: str,
        origin: str = "api",
        external_ref: str | None = None,
    ) -> Incident:
        """Create a new incident with server-generated id and timestamps."""
        now = _now_iso()
        return cls(
            id=_new_id(),
            title=title,
            description=description,
            category=category.upper(),
            status="open",
            branch=branch.upper(),
            reported_at=now,
            updated_at=now,
            origin=origin,
            external_ref=external_ref,
        )
