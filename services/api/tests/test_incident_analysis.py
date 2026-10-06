"""Análisis de incidencias por CSV (``POST /api/incidents/analyze`` and ``GET /api/incidents/results/export``): the business
rules of turning the helpdesk's export into the numbers the Customer Support Lead reads.

Layout shared by every test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP call per test
through ``authed_client`` (``async_client`` where the point is having no session). What is asserted is the analysis itself,
the numbers and which records count as valid, plus the in-memory "last analysis" the export serves; not how the JSON is shaped.

The rules come from ``scripts/CONTEXT-nexova.md``: a record is invalid for any of seven reasons, a CLOSED ticket needs a score
of 1 to 5, and a customer's email is only ever checked for an ``@``: it must never come back in any output.
"""

from __future__ import annotations

import csv
import io
from pathlib import Path

import pytest
from incidents_analyzer import analyze as analyze_rows, read_rows

from incidents import service as analysis_service

pytestmark = pytest.mark.anyio

COLUMNS = [
    "ticket_id", "date", "client_company", "category", "description", "agent_id", "status", "customer_email",
    "satisfaction_score",
]
REAL_EXPORT = Path(__file__).resolve().parents[3] / "data" / "raw" / "incidents-nexova.csv"
EMAIL = "elena.smith13@icloud.com"


def record(**overrides) -> dict[str, str]:
    """One valid CLOSED ticket; each test changes only what it is about."""
    return {
        "ticket_id": "NXV-000001", "date": "2024-01-18", "client_company": "FinServ Group", "category": "ACCESS",
        "description": "Role permissions not updated", "agent_id": "AGT-08", "status": "CLOSED",
        "customer_email": EMAIL, "satisfaction_score": "5",
    } | overrides


def csv_bytes(rows: list[dict[str, str]], columns: list[str] = COLUMNS, *, newline: str = "\n", bom: bool = False) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore", lineterminator=newline)
    writer.writeheader()
    writer.writerows(rows)
    return (("﻿" if bom else "") + buffer.getvalue()).encode("utf-8")


async def upload(client, content: bytes, filename: str = "incidents.csv"):
    """The only way into the analysis: a multipart upload of the file."""
    return await client.post("/api/incidents/analyze", files={"file": (filename, content, "text/csv")})


def export_metrics(response) -> dict[str, str]:
    return {row["metric"]: row["value"] for row in csv.DictReader(io.StringIO(response.text))}


@pytest.fixture(autouse=True)
def no_previous_analysis(monkeypatch):
    """The last analysis is kept in a module-level variable: every test starts with none, and the real one is put back."""
    monkeypatch.setattr(analysis_service, "_last_result", None)


# --- HAPPY PATH ---------------------------------------------------------------------------------------


async def test_a_valid_file_is_analysed_and_every_record_is_counted_once(authed_client):
    rows = [
        record(ticket_id="NXV-000001", category="ACCESS", status="CLOSED", satisfaction_score="5"),
        record(ticket_id="NXV-000002", category="ACCESS", status="CLOSED", satisfaction_score="3"),
        record(ticket_id="NXV-000003", category="BILLING", status="OPEN", satisfaction_score=""),
    ]

    result = (await upload(authed_client, csv_bytes(rows))).json()

    assert (result["total_records"], result["valid_records"], result["invalid_records"]) == (3, 3, 0)
    assert (result["category_counts"]["ACCESS"], result["category_counts"]["BILLING"]) == (2, 1)
    assert (result["status_counts"]["CLOSED"], result["status_counts"]["OPEN"], result["status_counts"]["DISCARDED"]) == (2, 1, 0)


async def test_the_satisfaction_index_is_built_only_from_closed_tickets(authed_client):
    rows = [
        record(ticket_id="NXV-000001", status="CLOSED", satisfaction_score="5"),
        record(ticket_id="NXV-000002", status="CLOSED", satisfaction_score="4"),
        record(ticket_id="NXV-000003", status="OPEN", satisfaction_score="1"),  # a score on an open ticket is not a satisfaction
    ]

    satisfaction = (await upload(authed_client, csv_bytes(rows))).json()["satisfaction"]

    assert (satisfaction["closed"], satisfaction["scored"], satisfaction["average"]) == (2, 2, 4.5)
    assert satisfaction["distribution"]["5"] == satisfaction["distribution"]["4"] == 1
    assert satisfaction["distribution"]["1"] == 0


async def test_the_export_gives_the_last_analysis_as_one_metric_per_row(authed_client):
    rows = [record(ticket_id="NXV-000001", satisfaction_score="5"), record(ticket_id="NXV-000002", status="OPEN", satisfaction_score="")]
    await upload(authed_client, csv_bytes(rows))

    exported = await authed_client.get("/api/incidents/results/export")

    metrics = export_metrics(exported)
    assert exported.status_code == 200
    assert (metrics["total_records"], metrics["valid_records"], metrics["invalid_records"]) == ("2", "2", "0")
    assert (metrics["category_access"], metrics["status_closed"], metrics["status_open"]) == ("2", "1", "1")
    assert (metrics["satisfaction_scored_tickets"], metrics["satisfaction_average"]) == ("1", "5.0")


async def test_the_analysis_is_kept_in_memory_for_the_export(authed_client):
    await upload(authed_client, csv_bytes([record()]), filename="enero.csv")

    last = analysis_service.get_last_result()

    assert (last.source_name, last.total_records, last.valid_records) == ("enero.csv", 1, 1)


async def test_the_api_and_the_cli_script_give_the_same_numbers_on_the_real_export(authed_client):
    """Project rule: the script's logic and the API's must be identical."""
    expected = analyze_rows(read_rows(str(REAL_EXPORT)), source_name=REAL_EXPORT.name)

    result = (await upload(authed_client, REAL_EXPORT.read_bytes(), filename=REAL_EXPORT.name)).json()

    assert (result["total_records"], result["valid_records"], result["invalid_records"]) == (
        expected.total_records, expected.valid_records, expected.invalid_records,
    )
    assert result["category_counts"] == expected.category_counts
    assert result["status_counts"] == expected.status_counts
    assert result["invalid_breakdown"] == expected.invalid_breakdown.as_dict()
    assert result["satisfaction"]["average"] == expected.satisfaction.average
    data_rows = len(REAL_EXPORT.read_text(encoding="utf-8").splitlines()) - 1  # counted without the analyzer
    assert result["total_records"] == data_rows


# --- EDGE CASES --------------------------------------------------------------------------------------


async def test_a_byte_order_mark_and_windows_line_endings_do_not_change_the_analysis(authed_client):
    rows = [record(ticket_id="NXV-000001"), record(ticket_id="NXV-000002", category="BILLING")]
    plain = (await upload(authed_client, csv_bytes(rows))).json()

    windows = (await upload(authed_client, csv_bytes(rows, newline="\r\n", bom=True))).json()

    assert windows["valid_records"] == plain["valid_records"] == 2
    assert windows["category_counts"] == plain["category_counts"]


@pytest.mark.parametrize("filename", ["incidents.csv", "INCIDENTS.CSV", "Enero 2024.Csv", "a.b.csv"])
async def test_the_file_extension_is_checked_ignoring_case(authed_client, filename):
    assert (await upload(authed_client, csv_bytes([record()]), filename=filename)).status_code == 200


async def test_values_are_compared_ignoring_the_spaces_around_them(authed_client):
    padded = record(
        category="  ACCESS ", agent_id=" AGT-08 ", client_company="  FinServ Group  ", status=" CLOSED ", satisfaction_score=" 5 "
    )

    result = (await upload(authed_client, csv_bytes([padded]))).json()

    assert (result["valid_records"], result["category_counts"]["ACCESS"], result["satisfaction"]["average"]) == (1, 1, 5.0)


async def test_columns_the_analysis_does_not_know_are_ignored(authed_client):
    rows = [record() | {"internal_note": "do not look"}]

    result = await upload(authed_client, csv_bytes(rows, COLUMNS + ["internal_note"]))

    assert result.status_code == 200 and result.json()["valid_records"] == 1


@pytest.mark.parametrize(
    ("change", "rule"),
    [
        ({"client_company": ""}, "missing_client_company"),
        ({"client_company": "   "}, "missing_client_company"),
        ({"category": "SALES"}, "invalid_or_missing_category"),
        ({"category": "access"}, "invalid_or_missing_category"),  # the vocabulary is exact: upper case only
        ({"category": ""}, "invalid_or_missing_category"),
        ({"description": "four"}, "invalid_description"),  # the minimum is 5 characters
        ({"description": "    "}, "invalid_description"),
        ({"agent_id": "AGT-1"}, "invalid_or_missing_agent_id"),
        ({"agent_id": "AGT-123"}, "invalid_or_missing_agent_id"),
        ({"agent_id": "agt-08"}, "invalid_or_missing_agent_id"),
        ({"agent_id": ""}, "invalid_or_missing_agent_id"),
        ({"customer_email": "no-at-sign"}, "invalid_or_missing_email"),
        ({"customer_email": ""}, "invalid_or_missing_email"),
        ({"status": "CLOSED", "satisfaction_score": ""}, "closed_without_score"),
        ({"satisfaction_score": "0"}, "score_out_of_range"),
        ({"satisfaction_score": "6"}, "score_out_of_range"),
        ({"satisfaction_score": "4.5"}, "score_out_of_range"),
        ({"satisfaction_score": "five"}, "score_out_of_range"),
        ({"status": "OPEN", "satisfaction_score": "9"}, "score_out_of_range"),  # the range applies to any status
    ],
)
async def test_each_rule_marks_a_record_invalid_and_is_counted_under_its_own_name(authed_client, change, rule):
    result = (await upload(authed_client, csv_bytes([record(**change)]))).json()

    assert (result["valid_records"], result["invalid_records"]) == (0, 1)
    assert result["invalid_breakdown"][rule] == 1
    assert sum(result["invalid_breakdown"].values()) == 1  # and under no other


@pytest.mark.parametrize(
    "change",
    [{"description": "five!"}, {"satisfaction_score": "1"}, {"satisfaction_score": "5"}, {"agent_id": "AGT-00"}, {"customer_email": "a@b"},
     {"status": "OPEN", "satisfaction_score": ""}, {"status": "DISCARDED", "satisfaction_score": ""}],
    ids=["description-5", "score-1", "score-5", "agent-00", "bare-email", "open-no-score", "discarded-no-score"],
)
async def test_the_values_at_the_edge_of_each_rule_are_still_valid(authed_client, change):
    result = (await upload(authed_client, csv_bytes([record(**change)]))).json()

    assert (result["valid_records"], result["invalid_records"]) == (1, 0)


async def test_a_record_breaking_several_rules_is_one_invalid_record_but_is_counted_under_each_rule(authed_client):
    broken = record(client_company="", category="SALES", customer_email="no-at-sign")

    result = (await upload(authed_client, csv_bytes([broken, record(ticket_id="NXV-000002")]))).json()

    assert (result["total_records"], result["valid_records"], result["invalid_records"]) == (2, 1, 1)
    assert sum(result["invalid_breakdown"].values()) == 3  # so the breakdown may add up to more than the invalid records


async def test_an_invalid_record_is_left_out_of_the_category_status_and_satisfaction_counts(authed_client):
    rows = [record(ticket_id="NXV-000001"), record(ticket_id="NXV-000002", category="BILLING", customer_email="no-at-sign")]

    result = (await upload(authed_client, csv_bytes(rows))).json()

    assert result["category_counts"]["BILLING"] == 0
    assert (result["status_counts"]["CLOSED"], result["satisfaction"]["scored"]) == (1, 1)


async def test_percentages_have_one_decimal_and_the_average_two(authed_client):
    rows = [
        record(ticket_id="NXV-000001", category="ACCESS", satisfaction_score="5"),
        record(ticket_id="NXV-000002", category="ACCESS", satisfaction_score="4"),
        record(ticket_id="NXV-000003", category="BILLING", satisfaction_score="4"),
    ]

    result = (await upload(authed_client, csv_bytes(rows))).json()

    assert (result["category_percentages"]["ACCESS"], result["category_percentages"]["BILLING"]) == (66.7, 33.3)
    assert result["satisfaction"]["average"] == 4.33


async def test_a_file_with_no_valid_record_has_no_percentages_to_divide_and_no_average(authed_client):
    result = (await upload(authed_client, csv_bytes([record(category="SALES")]))).json()
    exported = export_metrics(await authed_client.get("/api/incidents/results/export"))

    assert set(result["category_percentages"].values()) == {0.0}
    assert result["satisfaction"]["average"] is None
    assert exported["satisfaction_average"] == ""  # empty in the export, never a made-up zero


async def test_a_second_upload_replaces_the_previous_analysis(authed_client):
    await upload(authed_client, csv_bytes([record(), record(ticket_id="NXV-000002")]), filename="uno.csv")
    await upload(authed_client, csv_bytes([record()]), filename="dos.csv")

    metrics = export_metrics(await authed_client.get("/api/incidents/results/export"))

    assert metrics["total_records"] == "1"
    assert analysis_service.get_last_result().source_name == "dos.csv"


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize("filename", ["incidents.txt", "incidents.xlsx", "incidents", "incidents.csv.exe", "csv"])
async def test_a_file_that_is_not_a_csv_is_refused_and_nothing_is_analysed(authed_client, filename):
    response = await upload(authed_client, csv_bytes([record()]), filename=filename)

    assert response.status_code == 400
    assert analysis_service._last_result is None


async def test_a_file_that_is_not_utf8_text_is_refused(authed_client):
    response = await upload(authed_client, b"ticket_id,date\n\xff\xfe\x00\x01,2024-01-01\n")

    assert response.status_code == 400
    assert analysis_service._last_result is None


async def test_missing_required_columns_are_named_in_the_refusal(authed_client):
    columns = [column for column in COLUMNS if column not in ("category", "agent_id")]

    response = await upload(authed_client, csv_bytes([record()], columns))

    assert response.status_code == 422
    assert "category" in response.text and "agent_id" in response.text
    assert analysis_service._last_result is None


@pytest.mark.parametrize("content", [b"", b"\n", csv_bytes([])], ids=["empty-file", "blank-line", "header-only"])
async def test_a_file_without_data_is_refused_and_nothing_is_analysed(authed_client, content):
    response = await upload(authed_client, content)

    assert response.status_code == 422
    assert analysis_service._last_result is None


async def test_a_refused_upload_does_not_replace_the_analysis_already_there(authed_client):
    await upload(authed_client, csv_bytes([record()]), filename="bueno.csv")

    refused = await upload(authed_client, b"not,a,valid,header\n1,2,3,4\n", filename="malo.csv")
    metrics = export_metrics(await authed_client.get("/api/incidents/results/export"))

    assert not refused.is_success
    assert metrics["total_records"] == "1"
    assert analysis_service.get_last_result().source_name == "bueno.csv"


async def test_exporting_before_any_analysis_is_not_found(authed_client):
    response = await authed_client.get("/api/incidents/results/export")

    assert response.status_code == 404


async def test_a_request_without_a_file_is_refused_not_an_error(authed_client):
    response = await authed_client.post("/api/incidents/analyze")

    assert response.status_code == 422
    assert analysis_service._last_result is None


async def test_customers_emails_never_come_back_in_the_response_or_the_export(authed_client):
    rows = [record(ticket_id="NXV-000001"), record(ticket_id="NXV-000002", customer_email="second.customer@example.org"),
            record(ticket_id="NXV-000003", customer_email="not-an-email")]

    analysed = await upload(authed_client, csv_bytes(rows))
    exported = await authed_client.get("/api/incidents/results/export")

    for text in (analysed.text, exported.text):
        assert "@" not in text
        assert EMAIL not in text and "second.customer" not in text and "not-an-email" not in text


async def test_the_analysis_and_the_export_need_a_session_and_store_nothing_without_one(async_client):
    analysed = await upload(async_client, csv_bytes([record()]))
    exported = await async_client.get("/api/incidents/results/export")

    assert analysed.status_code == exported.status_code == 401
    assert analysis_service._last_result is None
