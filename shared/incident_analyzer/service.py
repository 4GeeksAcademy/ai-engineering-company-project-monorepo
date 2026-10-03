from __future__ import annotations

import csv
import io
import os
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from .errors import AnalysisError
from .schema import (
    CATEGORY_ORDER,
    CLOSED_STATUS,
    COUNTRY_ORDER,
    CLINICS,
    INVALID_REASON_LABELS,
    INVALID_REASON_ORDER,
    OPTIONAL_FIELDS,
    PATIENT_ID_PATTERN,
    PHI_VALUE_PATTERN,
    INCIDENT_ID_PATTERN,
    DATE_PATTERN,
    REASON_CLOSED_NO_SCORE,
    REASON_COUNTRY_MISMATCH,
    REASON_EMPTY_DESCRIPTION,
    REASON_INVALID_CATEGORY,
    REASON_INVALID_CLINIC_ID,
    REASON_INVALID_COUNTRY,
    REASON_INVALID_DATE,
    REASON_INVALID_INCIDENT_ID,
    REASON_INVALID_STATUS,
    REASON_MISSING_PATIENT_ID,
    REASON_SCORE_OUT_OF_RANGE,
    VALID_COUNTRIES,
    REQUIRED_FIELDS,
    SCORE_LABELS,
    SCORE_ORDER,
    STATUS_ORDER,
    VALID_CATEGORIES,
    VALID_CLINIC_IDS,
    VALID_STATUSES,
)


@dataclass
class InvalidRecord:
    row_number: int
    incident_id: str
    reasons: list[str]
    details: list[str]


@dataclass
class AnalysisResult:
    source_name: str
    total_rows: int
    valid_count: int
    invalid_count: int
    by_category: dict[str, int]
    by_status: dict[str, int]
    by_country: dict[str, int]
    invalid_by_reason: dict[str, int]
    avg_satisfaction_closed: float | None
    satisfaction_sample_size: int
    closed_valid_count: int
    satisfaction_by_score: dict[int, int]
    invalid_records: list[InvalidRecord] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "source_name": self.source_name,
            "total_rows": self.total_rows,
            "valid_count": self.valid_count,
            "invalid_count": self.invalid_count,
            "by_category": self.by_category,
            "by_status": self.by_status,
            "by_country": self.by_country,
            "invalid_by_reason": self.invalid_by_reason,
            "avg_satisfaction_closed": self.avg_satisfaction_closed,
            "satisfaction_sample_size": self.satisfaction_sample_size,
            "closed_valid_count": self.closed_valid_count,
            "satisfaction_by_score": {
                str(score): count for score, count in self.satisfaction_by_score.items()
            },
            "invalid_records": [
                {
                    "row_number": item.row_number,
                    "incident_id": item.incident_id,
                    "reasons": item.reasons,
                    "details": item.details,
                }
                for item in self.invalid_records
            ],
        }
        _assert_no_phi(payload)
        return payload

    def format_console(self) -> str:
        lines: list[str] = [
            "=" * 60,
            "  HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS",
            f"  Source file: {self.source_name}",
            "=" * 60,
            "",
            _dotted("TOTAL RECORDS IN FILE", self.total_rows, width=38),
            f"  ├─ {_dotted('Valid records', self.valid_count, width=34)}",
            f"  └─ {_dotted('Invalid / incomplete', self.invalid_count, width=34)}",
            "",
            "INVALID RECORDS BREAKDOWN",
        ]
        reason_rows = [
            (reason, self.invalid_by_reason.get(reason, 0))
            for reason in INVALID_REASON_ORDER
            if reason in self.invalid_by_reason
        ]
        if not reason_rows:
            lines.append("  No invalid records detected.")
        else:
            lines.extend(_tree_rows(reason_rows, label_fn=lambda key: INVALID_REASON_LABELS.get(key, key)))

        lines.extend(["", "BREAKDOWN BY CATEGORY (valid records)"])
        lines.extend(
            _count_tree(self.by_category, CATEGORY_ORDER, self.valid_count, label_fn=lambda key: key)
        )
        lines.extend(["", "BREAKDOWN BY STATUS (valid records)"])
        lines.extend(_count_tree(self.by_status, STATUS_ORDER, self.valid_count, label_fn=lambda key: key))
        lines.extend(["", "BREAKDOWN BY COUNTRY (valid records)"])
        lines.extend(_count_tree(self.by_country, COUNTRY_ORDER, self.valid_count, label_fn=lambda key: key))

        avg = (
            f"{self.avg_satisfaction_closed:.2f}"
            if self.avg_satisfaction_closed is not None
            else "n/a"
        )
        lines.extend(
            [
                "",
                "SATISFACTION INDEX (closed cases)",
                f"  Scored cases: {self.satisfaction_sample_size} of {self.closed_valid_count}",
                f"  Average score: {avg} / 5.00",
            ]
        )
        score_rows = [
            (score, self.satisfaction_by_score.get(score, 0))
            for score in SCORE_ORDER
            if score in self.satisfaction_by_score
        ]
        if score_rows:
            lines.extend(
                _tree_rows(
                    score_rows,
                    label_fn=lambda score: f"Score {score} ({SCORE_LABELS[score]})",
                )
            )
        else:
            lines.append("  No closed cases with a recorded score.")

        lines.extend(["", "=" * 60])
        text = "\n".join(lines)
        return redact_phi(text)


def analyze_csv_path(path: str | Path) -> AnalysisResult:
    csv_path = os.fspath(path)
    if not os.path.exists(csv_path):
        raise AnalysisError(
            f"File not found: {csv_path}",
            code="not_found",
            http_status=404,
        )
    if os.path.isdir(csv_path):
        raise AnalysisError(
            f"Expected a CSV file, got a directory: {csv_path}",
            code="invalid_format",
            http_status=400,
        )
    if os.path.getsize(csv_path) == 0:
        raise AnalysisError(
            "The file is empty. Upload a CSV with a header row and incident records.",
            code="empty_file",
            http_status=400,
        )

    with open(csv_path, encoding="utf-8-sig") as handle:
        non_empty_lines = 0
        for line in handle:
            if line.strip():
                non_empty_lines += 1
    if non_empty_lines == 0:
        raise AnalysisError(
            "The file is empty. Upload a CSV with a header row and incident records.",
            code="empty_file",
            http_status=400,
        )

    with open(csv_path, encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(4096)
        if "\x00" in sample:
            raise AnalysisError(
                "The file looks like a binary document, not a CSV. Export incidents as CSV.",
                code="invalid_format",
                http_status=400,
            )
        handle.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(handle, dialect=dialect)
        return _analyze_reader(reader, source_name=os.path.basename(csv_path))


def analyze_csv_bytes(raw: bytes, source_name: str = "upload.csv") -> AnalysisResult:
    if not raw or not raw.strip():
        raise AnalysisError(
            "The file is empty. Upload a CSV with a header row and incident records.",
            code="empty_file",
            http_status=400,
        )
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise AnalysisError(
            "The file is not valid UTF-8 text. Save the export as a CSV (UTF-8) and try again.",
            code="invalid_format",
            http_status=400,
        ) from exc

    sample = text[:4096]
    if "\x00" in sample:
        raise AnalysisError(
            "The file looks like a binary document, not a CSV. Export incidents as CSV.",
            code="invalid_format",
            http_status=400,
        )

    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    return _analyze_reader(reader, source_name=source_name)


def write_results_csv(result: AnalysisResult, output_path: str | Path) -> str:
    """Overwrite results.csv using csv.DictWriter and mode \"w\"."""
    destination = os.fspath(output_path)
    with open(destination, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["metric", "value", "percentage"])
        writer.writeheader()
        for row in _metric_rows(result):
            writer.writerow(row)
    return destination


def append_run_log(result: AnalysisResult, log_path: str | Path = "analyze.log") -> str:
    """Append one run summary line using mode \"a\" (does not overwrite prior runs)."""
    destination = os.fspath(log_path)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    avg = (
        f"{result.avg_satisfaction_closed:.2f}"
        if result.avg_satisfaction_closed is not None
        else "n/a"
    )
    line = (
        f"{timestamp}\t{result.source_name}\t"
        f"total={int(result.total_rows)}\t"
        f"valid={int(result.valid_count)}\t"
        f"invalid={int(result.invalid_count)}\t"
        f"avg_satisfaction={avg}\n"
    )
    with open(destination, "a", encoding="utf-8") as handle:
        handle.write(redact_phi(line))
    return destination


def metrics_to_csv(result: AnalysisResult) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["metric", "value", "percentage"])
    writer.writeheader()
    for row in _metric_rows(result):
        writer.writerow(row)
    return redact_phi(buffer.getvalue())


def redact_phi(text: str) -> str:
    """Never emit a patient_id value. Field-name mentions (e.g. Missing patient_id) stay."""
    return PHI_VALUE_PATTERN.sub("[redacted]", text)


def _analyze_reader(reader: csv.DictReader, source_name: str) -> AnalysisResult:
    if reader.fieldnames is None:
        raise AnalysisError(
            "The CSV has no header row. The first line must contain the field names.",
            code="invalid_format",
            http_status=400,
        )

    headers = [_normalize_header(name) for name in reader.fieldnames]
    if len(headers) == 1 and headers[0] == "":
        raise AnalysisError(
            "The CSV has no header row. The first line must contain the field names.",
            code="invalid_format",
            http_status=400,
        )
    reader.fieldnames = headers
    missing_headers = [name for name in REQUIRED_FIELDS if name not in headers]
    if missing_headers:
        raise AnalysisError(
            "Incorrect CSV format. Missing required column(s): "
            + ", ".join(missing_headers)
            + ". Expected columns: "
            + ", ".join(REQUIRED_FIELDS)
            + ", satisfaction_score (optional unless status is CLOSED).",
            code="invalid_format",
            http_status=400,
        )

    valid_rows: list[dict[str, str]] = []
    invalid_records: list[InvalidRecord] = []
    data_row_count = 0

    for index, raw_row in enumerate(reader, start=2):
        if raw_row is None:
            continue
        row = {
            _normalize_header(key): (value or "").strip()
            for key, value in raw_row.items()
            if key is not None
        }
        if _row_is_blank(row):
            continue
        data_row_count += 1
        issues = _validate_row(row)
        if issues:
            reasons = [item[0] for item in issues]
            details = [redact_phi(item[1]) for item in issues]
            invalid_records.append(
                InvalidRecord(
                    row_number=index,
                    incident_id=row.get("incident_id", ""),
                    reasons=reasons,
                    details=details,
                )
            )
        else:
            valid_rows.append(row)

    if data_row_count == 0:
        raise AnalysisError(
            "The CSV contains a header but no incident records.",
            code="empty_file",
            http_status=400,
        )

    return _summarize(source_name, data_row_count, valid_rows, invalid_records)


def _metric_rows(result: AnalysisResult) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = [
        _metric("total_records", result.total_rows),
        _metric("valid_records", result.valid_count, _pct(result.valid_count, result.total_rows)),
        _metric("invalid_records", result.invalid_count, _pct(result.invalid_count, result.total_rows)),
    ]
    for reason in INVALID_REASON_ORDER:
        if reason in result.invalid_by_reason:
            rows.append(_metric(f"invalid.{reason}", result.invalid_by_reason[reason]))
    for key, value in result.by_category.items():
        rows.append(_metric(f"category.{key}", value, _pct(value, result.valid_count)))
    for key, value in result.by_status.items():
        rows.append(_metric(f"status.{key}", value, _pct(value, result.valid_count)))
    for key, value in result.by_country.items():
        rows.append(_metric(f"country.{key}", value, _pct(value, result.valid_count)))
    rows.append(
        _metric(
            "satisfaction.average",
            "" if result.avg_satisfaction_closed is None else f"{result.avg_satisfaction_closed:.2f}",
        )
    )
    rows.append(_metric("satisfaction.scored_cases", result.satisfaction_sample_size))
    rows.append(_metric("satisfaction.closed_cases", result.closed_valid_count))
    for score in SCORE_ORDER:
        if score in result.satisfaction_by_score:
            rows.append(_metric(f"satisfaction.score_{score}", result.satisfaction_by_score[score]))
    return rows


def _metric(name: str, value: Any, percentage: str = "") -> dict[str, Any]:
    return {"metric": name, "value": value, "percentage": percentage}


def _summarize(
    source_name: str,
    total_rows: int,
    valid_rows: list[dict[str, str]],
    invalid_records: list[InvalidRecord],
) -> AnalysisResult:
    by_category = Counter(row["category"] for row in valid_rows)
    by_status = Counter(row["status"] for row in valid_rows)
    by_country = Counter(row["country"] for row in valid_rows)
    invalid_by_reason: Counter[str] = Counter()
    for item in invalid_records:
        for reason in item.reasons:
            invalid_by_reason[reason] += 1

    scores: list[int] = []
    for row in valid_rows:
        if row["status"] != CLOSED_STATUS:
            continue
        parsed = _parse_score(row.get("satisfaction_score", ""))
        if parsed is not None:
            scores.append(parsed)

    avg = round(sum(scores) / len(scores), 2) if scores else None
    score_counts = Counter(scores)

    return AnalysisResult(
        source_name=source_name,
        total_rows=total_rows,
        valid_count=len(valid_rows),
        invalid_count=len(invalid_records),
        by_category=_ordered_counts(by_category, CATEGORY_ORDER),
        by_status=_ordered_counts(by_status, STATUS_ORDER),
        by_country=_ordered_counts(by_country, COUNTRY_ORDER),
        invalid_by_reason=_ordered_counts(invalid_by_reason, INVALID_REASON_ORDER),
        avg_satisfaction_closed=avg,
        satisfaction_sample_size=len(scores),
        closed_valid_count=by_status.get(CLOSED_STATUS, 0),
        satisfaction_by_score={score: score_counts[score] for score in SCORE_ORDER if score_counts[score]},
        invalid_records=invalid_records,
    )


def _validate_row(row: dict[str, str]) -> list[tuple[str, str]]:
    issues: list[tuple[str, str]] = []

    incident_id = row.get("incident_id", "")
    if not incident_id or INCIDENT_ID_PATTERN.fullmatch(incident_id) is None:
        issues.append(
            (
                REASON_INVALID_INCIDENT_ID,
                "incident_id is missing or is not in the required HC-XXXXXX format",
            )
        )

    date = row.get("date", "")
    if not date or DATE_PATTERN.fullmatch(date) is None:
        issues.append(
            (
                REASON_INVALID_DATE,
                "date is missing or is not in YYYY-MM-DD format",
            )
        )

    clinic_id = row.get("clinic_id", "")
    country = row.get("country", "")
    if not clinic_id or clinic_id not in VALID_CLINIC_IDS:
        issues.append(
            (
                REASON_INVALID_CLINIC_ID,
                "clinic_id is missing or is not one of the 12 HealthCore clinic codes",
            )
        )
    elif country not in VALID_COUNTRIES:
        issues.append(
            (
                REASON_INVALID_COUNTRY,
                "country is missing or is not US or UK",
            )
        )
    elif CLINICS[clinic_id][0] != country:
        issues.append(
            (
                REASON_COUNTRY_MISMATCH,
                "country does not match the country of the declared clinic_id",
            )
        )

    category = row.get("category", "")
    if not category or category not in VALID_CATEGORIES:
        issues.append(
            (
                REASON_INVALID_CATEGORY,
                "category is missing or is not one of the 5 allowed categories",
            )
        )

    description = row.get("description", "")
    if len(description) < 5:
        issues.append(
            (
                REASON_EMPTY_DESCRIPTION,
                "description is empty or shorter than 5 characters",
            )
        )

    patient_id = row.get("patient_id", "")
    if not patient_id or PATIENT_ID_PATTERN.fullmatch(patient_id) is None:
        issues.append(
            (
                REASON_MISSING_PATIENT_ID,
                "patient_id is missing or does not match the required identifier format",
            )
        )

    status = row.get("status", "")
    if not status or status not in VALID_STATUSES:
        issues.append(
            (
                REASON_INVALID_STATUS,
                "status is missing or is not OPEN, CLOSED, or DISCARDED",
            )
        )

    raw_score = row.get("satisfaction_score", "")
    parsed_score: int | None = None
    score_present = raw_score != ""
    if score_present:
        parsed_score = _parse_score(raw_score)
        if parsed_score is None or parsed_score not in SCORE_ORDER:
            issues.append(
                (
                    REASON_SCORE_OUT_OF_RANGE,
                    "satisfaction_score is present but not an integer between 1 and 5",
                )
            )

    if status == CLOSED_STATUS and not score_present:
        issues.append(
            (
                REASON_CLOSED_NO_SCORE,
                "CLOSED incident is missing a satisfaction_score",
            )
        )

    return issues


def _parse_score(raw: str) -> int | None:
    if raw == "":
        return None
    try:
        as_int = int(raw)
    except ValueError:
        try:
            as_float = float(raw)
        except ValueError:
            return None
        if not as_float.is_integer():
            return None
        as_int = int(as_float)
    return as_int


def _ordered_counts(counter: Counter[str] | Counter[int] | dict[str, int], order: Iterable[Any]) -> dict[Any, int]:
    result: dict[Any, int] = {}
    for key in order:
        count = int(counter.get(key, 0))
        if count:
            result[key] = count
    extra = sorted(str(key) for key in counter if key not in result and counter[key])
    for key in extra:
        original = next(item for item in counter if str(item) == key)
        result[original] = int(counter[original])
    return result


def _count_tree(
    data: dict[str, int],
    order: Iterable[str],
    total: int,
    label_fn,
) -> list[str]:
    rows = [(key, data[key]) for key in order if key in data]
    if not rows:
        return ["  (none)"]
    return _tree_rows(
        rows,
        label_fn=label_fn,
        value_fn=lambda _key, count: f"{count}  ({_pct_number(count, total):.1f}%)",
    )


def _tree_rows(rows: list[tuple[Any, int]], label_fn, value_fn=None) -> list[str]:
    lines: list[str] = []
    last_index = len(rows) - 1
    for index, (key, count) in enumerate(rows):
        prefix = "  └─ " if index == last_index else "  ├─ "
        label = label_fn(key)
        value = value_fn(key, count) if value_fn else str(count)
        lines.append(prefix + _dotted(label, value, width=34))
    return lines


def _dotted(label: str, value: Any, width: int = 34) -> str:
    text = str(value)
    pad = width - len(label)
    dots = "." * max(2, pad)
    return f"{label} {dots} {text}"


def _pct(count: int, total: int) -> str:
    if not total:
        return "0.0"
    return f"{_pct_number(count, total):.1f}"


def _pct_number(count: int, total: int) -> float:
    if not total:
        return 0.0
    return count / total * 100


def _assert_no_phi(payload: Any) -> None:
    text = str(payload)
    if PHI_VALUE_PATTERN.search(text):
        raise AnalysisError(
            "Refusing to return output that contains a patient_id value.",
            code="phi_leak",
            http_status=500,
        )


def _normalize_header(name: str | None) -> str:
    return (name or "").strip().lstrip("\ufeff")


def _row_is_blank(row: dict[str, str]) -> bool:
    return all(not value for value in row.values())


def iter_required_fields() -> Iterable[str]:
    return REQUIRED_FIELDS


def iter_optional_fields() -> Iterable[str]:
    return OPTIONAL_FIELDS
