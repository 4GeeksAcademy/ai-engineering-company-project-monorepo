"""Loads the historical helpdesk CSV into the incident manager.

The CLI is ``scripts/seed_incidents.py``; this module holds the part that needs
the API (the ``IncidentRecord`` model and the store) so it can be tested and reused.

What does not need the API lives in ``packages/shared`` (``incidents_analyzer``):
the CSV validation (``validate_record``), the extra import checks
(``import_problems``) and the translation of a row into an incident
(``to_incident_fields``: status / category maps, description -> title,
date -> created_at, location -> branch, origin = customer). Only valid rows are
inserted, after ``IncidentRecord`` has validated them once more; rejected ones are
reported (line, id and the rules they break — never the customer's email).

Idempotent: an id that is already stored is skipped and never overwritten, so
running it twice never duplicates data nor undoes later work on an incident.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone

from pydantic import ValidationError

from incidents_analyzer import analyze
from incidents_analyzer.contract import CSV_STATUS_MAP
from incidents_analyzer.transform import import_problems, map_category, map_status, to_incident_fields

from . import incident_service as service
from . import incident_store as store
from .incident_schemas import IncidentRecord

SEED_ACTOR = "seed"


@dataclass(frozen=True)
class RejectedRow:
    line: int  # line in the CSV file (the header is line 1)
    id: str
    rules: tuple[str, ...]


@dataclass
class SeedReport:
    total: int = 0
    inserted: int = 0
    skipped_existing: int = 0  # already in the database, or repeated earlier in the file
    rejected: list[RejectedRow] = field(default_factory=list)

    @property
    def rejected_by_rule(self) -> Counter:
        return Counter(rule for row in self.rejected for rule in row.rules)


# --- seeding ---------------------------------------------------------------------------------

def to_document(row: dict[str, str], imported_at: datetime) -> dict:
    """A row without ``import_problems`` as a stored incident (may raise ValidationError)."""
    fields = to_incident_fields(row)
    record = IncidentRecord(
        **fields,
        updated_at=fields["created_at"],
        history=[
            {"at": imported_at, "kind": "imported", "actor": SEED_ACTOR, "to_status": fields["status"], "note": "Imported from CSV"}
        ],
    )
    return record.model_dump(mode="json")


def _rules_broken(row: dict[str, str]) -> tuple[list[str], dict | None]:
    """The rules a row breaks (empty = valid) and, if valid, its document."""
    rules = import_problems(row)
    if rules:
        return rules, None
    try:
        return [], to_document(row, datetime.now(timezone.utc))
    except ValidationError as exc:
        # Field names only: a ValidationError's messages quote the rejected values (e.g. the email).
        return [f"schema:{e['loc'][0] if e['loc'] else 'record'}" for e in exc.errors(include_input=False)], None


def seed_rows(rows: list[dict[str, str]], *, reset: bool = False) -> SeedReport:
    report = SeedReport(total=len(rows))
    with store.lock:
        if reset:
            store.truncate()
        known = {doc["id"] for doc in store.all_docs()}
        docs = []
        for line, row in enumerate(rows, start=2):
            rules, doc = _rules_broken(row)
            if rules:
                report.rejected.append(RejectedRow(line, (row.get("ticket_id") or "").strip() or "(no id)", tuple(rules)))
            elif doc["id"] in known:
                report.skipped_existing += 1
            else:
                known.add(doc["id"])
                docs.append(doc)
        store.insert_many(docs)
    report.inserted = len(docs)
    return report


# --- verification ----------------------------------------------------------------------------

def expected_metrics(rows: list[dict[str, str]]) -> dict:
    """What the transformed CSV should look like, computed by the shared CSV analysis
    (``incidents_analyzer.analyze``, the engine behind the CLI report), independently of the
    incident manager's own summary."""
    result = analyze(rows, source_name="expected")
    return {
        "total": result.valid_records,
        "status_counts": {
            **{status: 0 for status in CSV_STATUS_MAP.values()},
            **{map_status(status): n for status, n in result.status_counts.items()},
        },
        "category_counts": {map_category(c): n for c, n in result.category_counts.items()},
        "satisfaction_average": result.satisfaction.average,
        "satisfaction_scored": result.satisfaction.scored,
    }


def actual_metrics() -> dict:
    """The numbers ``GET /api/incidents/summary`` returns with no filters."""
    summary = service.summarize(service.IncidentFilters())
    return {
        "total": summary.total,
        "status_counts": {k: v for k, v in summary.status_counts.items() if k in CSV_STATUS_MAP.values()},
        "category_counts": summary.category_counts,
        "satisfaction_average": summary.satisfaction_average,
        "satisfaction_scored": summary.satisfaction_scored,
    }


def metric_differences(expected: dict, actual: dict) -> list[str]:
    """Human-readable differences (empty = they match). ``in_progress`` is not part of the CSV."""
    diffs = []
    for key in expected:
        if key.endswith("_counts"):
            for name in sorted(set(expected[key]) | set(actual[key])):
                if expected[key].get(name, 0) != actual[key].get(name, 0):
                    diffs.append(f"{key}[{name}]: expected {expected[key].get(name, 0)}, summary has {actual[key].get(name, 0)}")
        elif expected[key] != actual[key]:
            diffs.append(f"{key}: expected {expected[key]}, summary has {actual[key]}")
    return diffs
