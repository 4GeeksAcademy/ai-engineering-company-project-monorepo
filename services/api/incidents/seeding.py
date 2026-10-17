"""Loads the historical helpdesk CSV into the incident manager.

The CLI is ``scripts/seed_incidents.py``; this module holds the logic so it
can be tested and reused.

Every row goes through the shared ``incidents_analyzer.validate_record`` (the
rules the CSV report counts), is transformed into the incident model and is
validated again by ``IncidentRecord``. Only valid rows are inserted; rejected
ones are reported (line, id and the rules they break — never the customer's
email).

Transformations (the CSV predates the incident model; the maps live in
``packages/shared/incidents/contract.json``):

    ticket_id            -> id
    description          -> title   (shortened at a word boundary if too long;
                                     the full text stays in ``description``)
    date                 -> created_at (00:00 UTC) and updated_at
    status               -> CSV_STATUS_MAP   (OPEN / CLOSED / DISCARDED
                                              -> open / resolved / discarded)
    category             -> CSV_CATEGORY_MAP (identical names today)
    location | ubicacion -> branch   (an optional column; the provided CSV has
                                      none, so ``central``, "does not apply")
    (constant)           -> origin = "customer"

Idempotent: an id that is already stored is skipped and never overwritten, so
running it twice never duplicates data nor undoes later work on an incident.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone

from pydantic import ValidationError

from incidents_analyzer import analyze, validate_record
from incidents_analyzer.contract import CSV_CATEGORY_MAP, CSV_STATUS_MAP, DEFAULT_BRANCH, TITLE_MAX

from . import incident_service as service
from . import incident_store as store
from .incident_schemas import IncidentRecord

SEED_ACTOR = "seed"
SEED_ORIGIN = "customer"
LOCATION_COLUMNS = ("location", "ubicacion", "ubicación")


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


# --- transformations -------------------------------------------------------------------------

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
    return datetime.combine(date.fromisoformat(csv_date.strip()), time.min, tzinfo=timezone.utc)


def branch_from_row(row: dict[str, str]) -> str:
    for column in LOCATION_COLUMNS:
        value = (row.get(column) or "").strip()
        if value:
            return value
    return DEFAULT_BRANCH


def to_document(row: dict[str, str], imported_at: datetime) -> dict:
    """Transform one valid CSV row into a stored incident (may raise ValidationError / ValueError)."""
    created_at = created_at_from_date(row["date"])
    status = map_status(row["status"])
    score = row["satisfaction_score"].strip()
    record = IncidentRecord(
        id=row["ticket_id"],
        title=title_from_description(row["description"]),
        description=row["description"],
        category=map_category(row["category"]),
        origin=SEED_ORIGIN,
        branch=branch_from_row(row),
        client_company=row["client_company"],
        agent_id=row["agent_id"],
        customer_email=row["customer_email"],
        status=status,
        satisfaction_score=int(score) if score and status == "resolved" else None,
        created_at=created_at,
        updated_at=created_at,
        history=[
            {"at": imported_at, "kind": "imported", "actor": SEED_ACTOR, "to_status": status, "note": "Imported from CSV"}
        ],
    )
    return record.model_dump(mode="json")


# --- seeding ---------------------------------------------------------------------------------

def _rules_broken(row: dict[str, str]) -> tuple[list[str], dict | None]:
    """The rules a row breaks (empty = valid) and, if valid, its document."""
    rules = validate_record(row)
    if rules:
        return rules, None
    # Also guard what the CSV rules do not cover (e.g. an unknown status or a malformed date).
    if (row.get("status") or "").strip() not in CSV_STATUS_MAP:
        return ["invalid_or_missing_status"], None
    try:
        return [], to_document(row, datetime.now(timezone.utc))
    except ValidationError as exc:
        # Field names only: a ValidationError's messages quote the rejected values (e.g. the email).
        return [f"schema:{e['loc'][0] if e['loc'] else 'record'}" for e in exc.errors(include_input=False)], None
    except ValueError:  # not a YYYY-MM-DD date
        return ["invalid_date"], None


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
