from __future__ import annotations

from dataclasses import dataclass

from app.domains.analytics.incidents.analysis import (
    AnalysisResult,
    INVALID_REASON_LABELS,
    SCORE_LABELS,
    VALID_CATEGORIES,
    VALID_STATUSES,
    analyze_csv_text,
    export_rows,
)
from app.domains.analytics.incidents.schemas import (
    BreakdownItem,
    IncidentAnalysisResponse,
    SatisfactionSummary,
)


@dataclass
class StoredAnalysis:
    file_name: str
    csv_content: str
    payload: IncidentAnalysisResponse


_latest_analysis: StoredAnalysis | None = None


def analyze_incidents_csv(csv_text: str, file_name: str) -> IncidentAnalysisResponse:
    result = analyze_csv_text(csv_text)
    payload = build_response(result, file_name)
    store_latest_analysis(file_name, result, payload)
    return payload


def build_response(result: AnalysisResult, file_name: str) -> IncidentAnalysisResponse:
    invalid_breakdown = [
        BreakdownItem(code=reason_key, label=INVALID_REASON_LABELS[reason_key], count=result.invalid_reasons[reason_key])
        for reason_key in INVALID_REASON_LABELS
        if result.invalid_reasons[reason_key] > 0
    ]

    category_breakdown = [
        BreakdownItem(
            code=category,
            label=category,
            count=result.category_counts[category],
            percentage=round((result.category_counts[category] / result.valid_records) * 100, 1)
            if result.valid_records
            else 0.0,
        )
        for category in VALID_CATEGORIES
    ]

    status_breakdown = [
        BreakdownItem(
            code=status,
            label=status,
            count=result.status_counts[status],
            percentage=round((result.status_counts[status] / result.valid_records) * 100, 1)
            if result.valid_records
            else 0.0,
        )
        for status in VALID_STATUSES
    ]

    score_breakdown = [
        BreakdownItem(code=str(score), label=SCORE_LABELS[score], count=result.score_counts[score])
        for score in SCORE_LABELS
    ]

    return IncidentAnalysisResponse(
        source_file=file_name,
        total_records=result.total_records,
        valid_records=result.valid_records,
        invalid_records=result.invalid_records,
        invalid_breakdown=invalid_breakdown,
        category_breakdown=category_breakdown,
        status_breakdown=status_breakdown,
        satisfaction=SatisfactionSummary(
            scored_closed_cases=result.scored_closed_cases,
            total_closed_cases=result.total_closed_cases,
            average_score=round(result.average_satisfaction, 2),
            score_breakdown=score_breakdown,
        ),
    )


def store_latest_analysis(file_name: str, result: AnalysisResult, payload: IncidentAnalysisResponse) -> None:
    global _latest_analysis
    export_lines = ["metric,value,percentage"]
    for row in export_rows(result):
        export_lines.append(f"{row['metric']},{row['value']},{row['percentage']}")
    _latest_analysis = StoredAnalysis(
        file_name=file_name,
        csv_content="\n".join(export_lines) + "\n",
        payload=payload,
    )


def get_latest_analysis() -> StoredAnalysis | None:
    return _latest_analysis