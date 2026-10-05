"""Shared HealthCore incident analysis — used by the CLI script and the API."""

from .errors import AnalysisError
from .schema import (
    CLOSED_STATUS,
    COMPANY,
    EXPECTED_SAMPLE_METRICS,
    OPTIONAL_FIELDS,
    REQUIRED_FIELDS,
    SAMPLE_CSV_FILENAME,
    VALID_CATEGORIES,
    VALID_CLINIC_IDS,
    VALID_STATUSES,
)
from .service import (
    AnalysisResult,
    analyze_csv_bytes,
    analyze_csv_path,
    append_run_log,
    metrics_to_csv,
    redact_phi,
    write_results_csv,
)

__all__ = [
    "AnalysisError",
    "AnalysisResult",
    "CLOSED_STATUS",
    "COMPANY",
    "EXPECTED_SAMPLE_METRICS",
    "OPTIONAL_FIELDS",
    "REQUIRED_FIELDS",
    "SAMPLE_CSV_FILENAME",
    "VALID_CATEGORIES",
    "VALID_CLINIC_IDS",
    "VALID_STATUSES",
    "analyze_csv_bytes",
    "analyze_csv_path",
    "append_run_log",
    "metrics_to_csv",
    "redact_phi",
    "write_results_csv",
]
