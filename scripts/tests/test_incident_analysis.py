"""Checks the shared analysis module and CLI against CONTEXT-nexova.es.md."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from incident_analysis import CsvFormatError, EmptyCsvError, analyze_csv_text  # noqa: E402

CSV_PATH = SCRIPTS / "incidents-nexova.csv"
HEADER = "ticket_id,date,client_company,category,description,agent_id,status,customer_email,satisfaction_score\n"


@pytest.fixture(scope="module")
def result():
    return analyze_csv_text(CSV_PATH.read_text(encoding="utf-8"))


def test_totals_match_context(result):
    assert (result.total_records, result.valid_records, result.invalid_records) == (100, 96, 4)


def test_invalid_rules_match_context(result):
    assert result.invalid_breakdown == {
        "missing_client_company": 1,
        "invalid_category": 1,
        "invalid_email": 1,
        "closed_without_score": 1,
    }


def test_invalid_by_field_separates_missing_from_not_allowed(result):
    assert result.invalid_by_field == {
        "client_company": {"missing": 1},
        "category": {"missing": 1},
        "customer_email": {"invalid": 1},
        "satisfaction_score": {"missing": 1},
    }


def test_categories_statuses_and_scores_match_context(result):
    assert result.by_category == {"TECHNICAL": 28, "BILLING": 18, "ACCESS": 21, "HR_QUERY": 17, "COMPLAINT": 12}
    assert result.by_status == {"OPEN": 27, "CLOSED": 56, "DISCARDED": 13}
    assert result.score_breakdown == {1: 2, 2: 5, 3: 10, 4: 22, 5: 17}
    assert (result.scored_tickets, result.closed_tickets, result.average_score) == (56, 56, 3.84)


def test_each_rule_is_detected():
    rows = [
        "BAD,2024-01-01,Acme,TECHNICAL,Printer down,AGT-01,OPEN,a@b.com,",
        "NXV-000002,2024-13-40,Acme,TECHNICAL,Printer down,AGT-01,OPEN,a@b.com,",
        "NXV-000003,2024-01-01,Acme,technical,Printer down,AGT-01,OPEN,a@b.com,",
        "NXV-000004,2024-01-01,Acme,TECHNICAL,no,AGT-01,OPEN,a@b.com,",
        "NXV-000005,2024-01-01,Acme,TECHNICAL,Printer down,AGT-1,OPEN,a@b.com,",
        "NXV-000006,2024-01-01,Acme,TECHNICAL,Printer down,AGT-01,PENDING,a@b.com,",
        "NXV-000007,2024-01-01,Acme,TECHNICAL,Printer down,AGT-01,CLOSED,a@b.com,6",
        "NXV-000008,2024-01-01,Acme,TECHNICAL,Printer down,AGT-01,OPEN,,",
    ]
    result = analyze_csv_text(HEADER + "\n".join(rows) + "\n")
    assert result.valid_records == 0
    assert result.invalid_breakdown == {
        "invalid_description": 1,
        "invalid_agent_id": 1,
        "invalid_email": 1,
        "invalid_score": 1,
        "invalid_status": 1,
        "invalid_ticket_id": 1,
        "invalid_date": 1,
        "invalid_category": 1,
    }
    assert result.invalid_by_field["customer_email"] == {"missing": 1}


def test_score_on_open_ticket_is_allowed_when_in_range():
    result = analyze_csv_text(HEADER + "NXV-000001,2024-01-01,Acme,BILLING,Refund please,AGT-02,OPEN,c@d.com,3\n")
    assert result.valid_records == 1
    assert result.average_score is None  # only closed tickets feed the index


@pytest.mark.parametrize(
    ("text", "error"),
    [
        ("", EmptyCsvError),
        ("﻿  \n", EmptyCsvError),
        ("ticket_id,date\nNXV-000001,2024-01-01\n", CsvFormatError),
        (HEADER, CsvFormatError),
    ],
)
def test_unusable_files_raise(text, error):
    with pytest.raises(error):
        analyze_csv_text(text)


def test_cli_prints_report_exports_and_never_leaks_emails(tmp_path):
    completed = subprocess.run(
        [sys.executable, str(SCRIPTS / "analyze.py"), str(CSV_PATH)],
        input="s\n",
        capture_output=True,
        text=True,
        cwd=tmp_path,
        check=True,
    )
    assert "Average score: 3.84 / 5.00" in completed.stdout
    assert "¿Deseas exportar los resultados a CSV? [s/n]" in completed.stdout
    exported = (tmp_path / "results.csv").read_text(encoding="utf-8").splitlines()
    assert exported[0] == "metric,value,description"
    assert "total_records,100,Records in file" in exported
    assert "average_score,3.84,Average satisfaction score of closed tickets (1-5)" in exported
    assert "@" not in completed.stdout + completed.stderr + "\n".join(exported)


def test_cli_reports_missing_file(tmp_path):
    completed = subprocess.run(
        [sys.executable, str(SCRIPTS / "analyze.py"), "nope.csv"], capture_output=True, text=True, cwd=tmp_path
    )
    assert completed.returncode == 1
    assert "file not found" in completed.stderr
