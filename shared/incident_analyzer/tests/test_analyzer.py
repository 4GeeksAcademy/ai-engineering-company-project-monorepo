from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "shared"))

from incident_analyzer import (  # noqa: E402
    EXPECTED_SAMPLE_METRICS,
    AnalysisError,
    analyze_csv_bytes,
    analyze_csv_path,
    append_run_log,
    metrics_to_csv,
    write_results_csv,
)
from incident_analyzer.schema import PHI_VALUE_PATTERN  # noqa: E402

SAMPLE = ROOT / "scripts" / "incidents-healthcore.csv"
PHI = re.compile(r"PAT-\d{6}", re.IGNORECASE)


def test_sample_csv_matches_context_exactly() -> None:
    result = analyze_csv_path(SAMPLE)
    assert result.total_rows == EXPECTED_SAMPLE_METRICS["total_rows"]
    assert result.valid_count == EXPECTED_SAMPLE_METRICS["valid_count"]
    assert result.invalid_count == EXPECTED_SAMPLE_METRICS["invalid_count"]
    assert result.by_category == EXPECTED_SAMPLE_METRICS["by_category"]
    assert result.by_status == EXPECTED_SAMPLE_METRICS["by_status"]
    assert result.by_country == EXPECTED_SAMPLE_METRICS["by_country"]
    assert result.invalid_by_reason == EXPECTED_SAMPLE_METRICS["invalid_by_reason"]
    assert result.avg_satisfaction_closed == EXPECTED_SAMPLE_METRICS["avg_satisfaction_closed"]
    assert result.satisfaction_sample_size == EXPECTED_SAMPLE_METRICS["satisfaction_sample_size"]
    assert result.closed_valid_count == 52
    assert result.satisfaction_by_score == EXPECTED_SAMPLE_METRICS["satisfaction_by_score"]
    assert len(result.invalid_records) == 6


def test_console_contains_required_context_values() -> None:
    result = analyze_csv_path(SAMPLE)
    console = result.format_console()
    assert "HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS" in console
    assert "TOTAL RECORDS IN FILE" in console
    assert "100" in console
    assert "Valid records" in console
    assert "94" in console
    assert "Invalid / incomplete" in console
    assert "APPOINTMENT" in console
    assert "(31.9%)" in console
    assert "OPEN" in console
    assert "CLOSED" in console
    assert "DISCARDED" in console
    assert "Average score: 3.58 / 5.00" in console
    assert "Scored cases: 52 of 52" in console
    assert "Missing patient_id" in console
    assert "Country/clinic mismatch" in console
    assert PHI.search(console) is None


def test_outputs_never_contain_patient_id_values() -> None:
    result = analyze_csv_path(SAMPLE)
    export = metrics_to_csv(result)
    payload = json.dumps(result.to_dict())
    console = result.format_console()
    for blob in (export, payload, console):
        assert PHI.search(blob) is None
        assert PHI_VALUE_PATTERN.search(blob) is None
    for item in result.invalid_records:
        joined = " ".join(item.details)
        assert PHI.search(joined) is None
        assert "PAT-" not in item.incident_id


def test_empty_file_raises() -> None:
    with pytest.raises(AnalysisError) as exc:
        analyze_csv_bytes(b"", source_name="empty.csv")
    assert exc.value.code == "empty_file"


def test_header_only_raises() -> None:
    header = (
        b"incident_id,date,clinic_id,country,category,description,status,"
        b"patient_id,satisfaction_score\n"
    )
    with pytest.raises(AnalysisError) as exc:
        analyze_csv_bytes(header, source_name="header-only.csv")
    assert exc.value.code == "empty_file"


def test_missing_columns_raises() -> None:
    raw = b"incident_id,status\nHC-000001,OPEN\n"
    with pytest.raises(AnalysisError) as exc:
        analyze_csv_bytes(raw, source_name="bad.csv")
    assert exc.value.code == "invalid_format"
    assert "Missing required column" in exc.value.message


def test_write_results_overwrites_and_log_appends(tmp_path: Path) -> None:
    result = analyze_csv_path(SAMPLE)
    results_file = tmp_path / "results.csv"
    log_file = tmp_path / "analyze.log"

    write_results_csv(result, results_file)
    first = results_file.read_text(encoding="utf-8")
    assert first.splitlines()[0] == "metric,value,percentage"
    assert "valid_records,94,94.0" in first
    assert first.count("valid_records,94,94.0") == 1
    assert "satisfaction.average,3.58" in first
    assert "country.US,61,64.9" in first
    assert PHI.search(first) is None

    write_results_csv(result, results_file)
    second = results_file.read_text(encoding="utf-8")
    assert first == second

    append_run_log(result, log_file)
    append_run_log(result, log_file)
    log_text = log_file.read_text(encoding="utf-8")
    assert log_text.count("valid=94") == 2
    assert PHI.search(log_text) is None


def test_missing_required_date_is_invalid_without_phi() -> None:
    raw = (
        "incident_id,date,clinic_id,country,category,description,status,patient_id,satisfaction_score\n"
        "HC-000001,,US-TX-01,US,APPOINTMENT,Waited too long at reception,OPEN,PAT-000001,\n"
    ).encode("utf-8")
    result = analyze_csv_bytes(raw, source_name="missing-date.csv")
    assert result.invalid_count == 1
    assert result.invalid_by_reason["invalid_date"] == 1
    assert PHI.search(json.dumps(result.to_dict())) is None


def test_invalid_patient_id_is_counted_without_exposing_the_value() -> None:
    raw = (
        "incident_id,date,clinic_id,country,category,description,status,patient_id,satisfaction_score\n"
        "HC-000001,2026-03-01,US-TX-01,US,APPOINTMENT,Waited too long at reception,OPEN,NOT-A-PATIENT,\n"
    ).encode("utf-8")
    result = analyze_csv_bytes(raw, source_name="phi.csv")
    assert result.invalid_count == 1
    assert result.invalid_by_reason["missing_patient_id"] == 1
    console = result.format_console()
    export = metrics_to_csv(result)
    details = " ".join(result.invalid_records[0].details)
    for blob in (console, export, details, json.dumps(result.to_dict())):
        assert "NOT-A-PATIENT" not in blob
        assert PHI.search(blob) is None
