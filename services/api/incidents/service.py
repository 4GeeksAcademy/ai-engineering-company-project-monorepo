"""Business logic for the incidents domain.

Wraps the shared ``incidents_analyzer`` package — the same code the CLI
script in ``scripts/analyze.py`` runs — so the script and the
API can never drift apart (see project rule: "La lógica del script y la
API deben ser idénticas").

State: the most recent analysis is kept in memory (module-level) so
GET /api/incidents/results/export can re-serve it. This is a single-process,
non-persistent cache — acceptable for this feature's current scope, but it
means the export endpoint has nothing to return after a restart, and a
second API worker process would not see results produced by the first.
Documented here rather than hidden, since it is a real production limitation.
"""

from __future__ import annotations

import csv
import io

from incidents_analyzer import AnalysisResult, analyze, missing_required_columns, to_export_rows

from .schemas import AnalyzeResponse, InvalidBreakdownOut, SatisfactionOut


class NotCsvFileError(Exception):
    """Uploaded file is not a .csv file."""


class EmptyCsvError(Exception):
    """Uploaded file has no data rows."""


class MissingColumnsError(Exception):
    """Uploaded CSV is missing one or more required columns."""

    def __init__(self, columns: list[str]):
        self.columns = columns
        super().__init__(f"Missing required columns: {', '.join(columns)}")


class NoAnalysisYetError(Exception):
    """No analysis has been run in this process yet."""


_last_result: AnalysisResult | None = None


def run_analysis(*, filename: str, content: bytes) -> AnalysisResult:
    if not filename.lower().endswith(".csv"):
        raise NotCsvFileError(f"Expected a .csv file, got: {filename}")

    text_stream = io.StringIO(content.decode("utf-8-sig"))
    reader = csv.DictReader(text_stream)

    missing = missing_required_columns(reader.fieldnames)
    if missing:
        raise MissingColumnsError(missing)

    rows = list(reader)
    if not rows:
        raise EmptyCsvError("CSV file has a header row but no data rows.")

    result = analyze(rows, source_name=filename)

    global _last_result
    _last_result = result
    return result


def get_last_result() -> AnalysisResult:
    if _last_result is None:
        raise NoAnalysisYetError("No analysis has been run yet. Call POST /api/incidents/analyze first.")
    return _last_result


def to_response(result: AnalysisResult) -> AnalyzeResponse:
    return AnalyzeResponse(
        source_name=result.source_name,
        total_records=result.total_records,
        valid_records=result.valid_records,
        invalid_records=result.invalid_records,
        invalid_breakdown=InvalidBreakdownOut(**result.invalid_breakdown.as_dict()),
        category_counts=result.category_counts,
        category_percentages=result.category_percentages(),
        status_counts=result.status_counts,
        status_percentages=result.status_percentages(),
        satisfaction=SatisfactionOut(
            scored=result.satisfaction.scored,
            closed=result.satisfaction.closed,
            average=result.satisfaction.average,
            distribution={str(score): count for score, count in result.satisfaction.counts.items()},
        ),
    )


def to_export_csv_bytes(result: AnalysisResult) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["metric", "value"])
    writer.writeheader()
    writer.writerows(to_export_rows(result))
    return buffer.getvalue().encode("utf-8")
