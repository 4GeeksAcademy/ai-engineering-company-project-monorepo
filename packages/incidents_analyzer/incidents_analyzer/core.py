"""Core validation and metrics logic for Nexova support-incident CSV files.

Single source of truth shared by the CLI script (``scripts/analyze.py``)
and the backend API (``services/api``), per the rules fixed in
``scripts/CONTEXT-nexova.md``. Field names, categories, statuses and
invalid-record rules come from that document and must not be extended or
guessed here.

Privacy: ``customer_email`` is only ever used to check for the presence of
``@``. The raw value is never stored on any result object, logged, printed or
exported — only counted.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from typing import IO, Iterable

VALID_CATEGORIES: tuple[str, ...] = (
    "TECHNICAL",
    "BILLING",
    "ACCESS",
    "HR_QUERY",
    "COMPLAINT",
)

VALID_STATUSES: tuple[str, ...] = ("OPEN", "CLOSED", "DISCARDED")

REQUIRED_COLUMNS: tuple[str, ...] = (
    "ticket_id",
    "date",
    "client_company",
    "category",
    "description",
    "agent_id",
    "status",
    "customer_email",
    "satisfaction_score",
)

_AGENT_ID_PATTERN = re.compile(r"^AGT-\d{2}$")


def missing_required_columns(fieldnames: Iterable[str] | None) -> list[str]:
    """Required columns absent from a CSV header row (empty list if OK)."""
    present = set(fieldnames or [])
    return [column for column in REQUIRED_COLUMNS if column not in present]

# Rule keys, in the order defined by CONTEXT-nexova.md, and their human-readable
# labels for reports. Keys are stable identifiers used in JSON/CSV output;
# labels are only for display.
_INVALID_RULES: tuple[tuple[str, str], ...] = (
    ("missing_client_company", "Missing client_company"),
    ("invalid_or_missing_category", "Invalid or missing category"),
    ("invalid_description", "Invalid or missing description"),
    ("invalid_or_missing_agent_id", "Invalid or missing agent_id"),
    ("invalid_or_missing_email", "Invalid or missing email"),
    ("closed_without_score", "Closed ticket, no score"),
    ("score_out_of_range", "Satisfaction score out of range"),
)


@dataclass
class InvalidBreakdown:
    """Count of records per invalid-record rule (a record may trigger more
    than one rule, so these counts do not have to sum to ``invalid_records``)."""

    missing_client_company: int = 0
    invalid_or_missing_category: int = 0
    invalid_description: int = 0
    invalid_or_missing_agent_id: int = 0
    invalid_or_missing_email: int = 0
    closed_without_score: int = 0
    score_out_of_range: int = 0

    def increment(self, rule_key: str) -> None:
        setattr(self, rule_key, getattr(self, rule_key) + 1)

    def as_dict(self) -> dict[str, int]:
        return {key: getattr(self, key) for key, _ in _INVALID_RULES}

    def as_labeled_items(self, *, only_nonzero: bool = False) -> list[tuple[str, int]]:
        items = [(label, getattr(self, key)) for key, label in _INVALID_RULES]
        if only_nonzero:
            items = [item for item in items if item[1] > 0]
        return items


@dataclass
class SatisfactionBreakdown:
    """Satisfaction score distribution for valid, CLOSED tickets."""

    counts: dict[int, int] = field(default_factory=lambda: {n: 0 for n in range(1, 6)})
    scored: int = 0
    closed: int = 0
    average: float | None = None


@dataclass
class AnalysisResult:
    source_name: str
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: InvalidBreakdown
    category_counts: dict[str, int]
    status_counts: dict[str, int]
    satisfaction: SatisfactionBreakdown

    def category_percentages(self) -> dict[str, float]:
        return _percentages(self.category_counts, self.valid_records)

    def status_percentages(self) -> dict[str, float]:
        return _percentages(self.status_counts, self.valid_records)


def _percentages(counts: dict[str, int], total: int) -> dict[str, float]:
    if total == 0:
        return {key: 0.0 for key in counts}
    return {key: round(value / total * 100, 1) for key, value in counts.items()}


def read_rows(source: str | IO[str]) -> list[dict[str, str]]:
    """Read a Nexova incidents CSV into a list of raw string dicts.

    ``source`` is either a filesystem path or an already-open text stream
    (e.g. an uploaded file in the API), so the same function serves the CLI
    and the backend.
    """
    if isinstance(source, str):
        with open(source, newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    if isinstance(source, io.TextIOBase) or hasattr(source, "read"):
        return list(csv.DictReader(source))
    raise TypeError(f"Unsupported CSV source type: {type(source)!r}")


def _validate_record(row: dict[str, str]) -> list[str]:
    """Return the list of rule keys violated by a single row. Empty means valid."""
    violations: list[str] = []

    if not (row.get("client_company") or "").strip():
        violations.append("missing_client_company")

    category = (row.get("category") or "").strip()
    if not category or category not in VALID_CATEGORIES:
        violations.append("invalid_or_missing_category")

    description = (row.get("description") or "").strip()
    if len(description) < 5:
        violations.append("invalid_description")

    agent_id = (row.get("agent_id") or "").strip()
    if not agent_id or not _AGENT_ID_PATTERN.match(agent_id):
        violations.append("invalid_or_missing_agent_id")

    email = (row.get("customer_email") or "").strip()
    if not email or "@" not in email:
        violations.append("invalid_or_missing_email")

    status = (row.get("status") or "").strip()
    raw_score = (row.get("satisfaction_score") or "").strip()

    if status == "CLOSED" and not raw_score:
        violations.append("closed_without_score")

    if raw_score:
        score = _parse_int(raw_score)
        if score is None or not (1 <= score <= 5):
            violations.append("score_out_of_range")

    return violations


def _parse_int(value: str) -> int | None:
    try:
        return int(value)
    except ValueError:
        return None


def analyze(rows: Iterable[dict[str, str]], source_name: str) -> AnalysisResult:
    rows = list(rows)
    total_records = len(rows)

    invalid_breakdown = InvalidBreakdown()
    category_counts = {category: 0 for category in VALID_CATEGORIES}
    status_counts = {status: 0 for status in VALID_STATUSES}
    satisfaction = SatisfactionBreakdown()

    valid_records = 0
    score_sum = 0

    for row in rows:
        violations = _validate_record(row)

        if violations:
            for rule_key in violations:
                invalid_breakdown.increment(rule_key)
            continue

        valid_records += 1
        category_counts[row["category"].strip()] += 1
        status = row["status"].strip()
        status_counts[status] += 1

        if status == "CLOSED":
            score = _parse_int(row["satisfaction_score"].strip())
            satisfaction.closed += 1
            satisfaction.scored += 1
            satisfaction.counts[score] += 1
            score_sum += score

    if satisfaction.scored:
        satisfaction.average = round(score_sum / satisfaction.scored, 2)

    invalid_records = total_records - valid_records

    return AnalysisResult(
        source_name=source_name,
        total_records=total_records,
        valid_records=valid_records,
        invalid_records=invalid_records,
        invalid_breakdown=invalid_breakdown,
        category_counts=category_counts,
        status_counts=status_counts,
        satisfaction=satisfaction,
    )


def _dotted_line(branch: str, label: str, value: str, *, pad_to: int) -> str:
    dots = "." * max(2, pad_to - len(label))
    return f"  {branch} {label} {dots} {value}"


def format_report(result: AnalysisResult) -> str:
    """Render the human-readable console summary. Zero-count invalid rules
    are omitted for readability; every value is still available in full via
    ``to_export_rows`` / the JSON API response."""
    lines: list[str] = []
    width = 60
    lines.append("=" * width)
    lines.append("  NEXOVA — SUPPORT TICKET ANALYSIS")
    lines.append(f"  Source file: {result.source_name}")
    lines.append("=" * width)
    lines.append("")
    lines.append(f"TOTAL RECORDS IN FILE .......... {result.total_records}")
    lines.append(f"  ├─ Valid records ................ {result.valid_records}")
    lines.append(f"  └─ Invalid / incomplete .......... {result.invalid_records}")
    lines.append("")

    invalid_items = result.invalid_breakdown.as_labeled_items(only_nonzero=True)
    if invalid_items:
        lines.append("INVALID RECORDS BREAKDOWN")
        pad_to = max(len(label) for label, _ in invalid_items) + 3
        for i, (label, count) in enumerate(invalid_items):
            branch = "└─" if i == len(invalid_items) - 1 else "├─"
            lines.append(_dotted_line(branch, label, str(count), pad_to=pad_to))
        lines.append("")

    lines.append("BREAKDOWN BY CATEGORY (valid records)")
    percentages = result.category_percentages()
    items = list(result.category_counts.items())
    pad_to = max(len(category) for category in result.category_counts) + 3
    for i, (category, count) in enumerate(items):
        branch = "└─" if i == len(items) - 1 else "├─"
        pct = percentages[category]
        lines.append(_dotted_line(branch, category, f"{count}  ({pct}%)", pad_to=pad_to))
    lines.append("")

    lines.append("BREAKDOWN BY STATUS (valid records)")
    percentages = result.status_percentages()
    items = list(result.status_counts.items())
    pad_to = max(len(status) for status in result.status_counts) + 3
    for i, (status, count) in enumerate(items):
        branch = "└─" if i == len(items) - 1 else "├─"
        pct = percentages[status]
        lines.append(_dotted_line(branch, status, f"{count}  ({pct}%)", pad_to=pad_to))
    lines.append("")

    lines.append("SATISFACTION INDEX (closed tickets)")
    sat = result.satisfaction
    lines.append(f"  Scored tickets: {sat.scored} of {sat.closed}")
    avg = f"{sat.average:.2f}" if sat.average is not None else "n/a"
    lines.append(f"  Average score: {avg} / 5.00")
    score_labels = {
        1: "Very dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very satisfied",
    }
    score_items = list(sat.counts.items())
    score_display_labels = [f"Score {score} ({score_labels[score]})" for score, _ in score_items]
    pad_to = max(len(label) for label in score_display_labels) + 3
    for i, ((score, count), label) in enumerate(zip(score_items, score_display_labels)):
        branch = "└─" if i == len(score_items) - 1 else "├─"
        lines.append(_dotted_line(branch, label, str(count), pad_to=pad_to))

    lines.append("")
    lines.append("=" * width)
    return "\n".join(lines)


def to_export_rows(result: AnalysisResult) -> list[dict[str, str]]:
    """Long-format export: one metric per row, as requested by the Customer
    Support Lead so it can be pasted directly into the report template."""
    rows: list[dict[str, str]] = []

    def add(metric: str, value) -> None:
        rows.append({"metric": metric, "value": value})

    add("total_records", result.total_records)
    add("valid_records", result.valid_records)
    add("invalid_records", result.invalid_records)

    for key, count in result.invalid_breakdown.as_dict().items():
        add(f"invalid_rule_{key}", count)

    for category, count in result.category_counts.items():
        add(f"category_{category.lower()}", count)

    for status, count in result.status_counts.items():
        add(f"status_{status.lower()}", count)

    sat = result.satisfaction
    add("satisfaction_scored_tickets", sat.scored)
    add("satisfaction_average", sat.average if sat.average is not None else "")
    for score, count in sat.counts.items():
        add(f"satisfaction_score_{score}", count)

    return rows
