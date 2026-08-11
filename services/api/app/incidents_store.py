"""In-memory store for the most recent incident analysis export."""

from __future__ import annotations

from shared.incident_analyzer.analyze import AnalysisResult

_last_analysis: AnalysisResult | None = None


def save_analysis(result: AnalysisResult) -> None:
    global _last_analysis
    _last_analysis = result


def get_last_analysis() -> AnalysisResult | None:
    return _last_analysis
