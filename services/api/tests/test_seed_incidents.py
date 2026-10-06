"""Historical seed: transformations, rejected rows, idempotency, CLI and the summary check."""

from __future__ import annotations

import csv
import io
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from incidents import incident_store as store
from incidents import seeding
from incidents_analyzer import contract, read_rows
from main import app

REPO = Path(__file__).resolve().parents[3]
CSV = REPO / "data" / "raw" / "incidents-nexova.csv"
SCRIPT = REPO / "scripts" / "seed_incidents.py"
ROW = {
    "ticket_id": "NXV-000500",
    "date": "2024-03-05",
    "client_company": "Acme",
    "category": "BILLING",
    "description": "Invoice shows the wrong VAT",
    "agent_id": "AGT-04",
    "status": "CLOSED",
    "customer_email": "pat@acme.com",
    "satisfaction_score": "4",
}


@pytest.fixture()
def db(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield database
    database.close()


@pytest.fixture()
def rows() -> list[dict[str, str]]:
    return read_rows(str(CSV))


# --- transformations -------------------------------------------------------------------------

def test_status_map_covers_the_csv_vocabulary():
    assert [seeding.map_status(s) for s in ("OPEN", "CLOSED", "DISCARDED")] == ["open", "resolved", "discarded"]
    with pytest.raises(KeyError):
        seeding.map_status("PENDING")


def test_category_map_covers_every_csv_category():
    assert {seeding.map_category(c) for c in contract.VALID_CATEGORIES} == set(contract.VALID_CATEGORIES)


def test_title_comes_from_the_description():
    assert seeding.title_from_description("  Short   one ") == "Short one"
    long = seeding.title_from_description("word " * 60)
    assert len(long) <= contract.TITLE_MAX and long.endswith("…") and "  " not in long


def test_date_becomes_created_at_at_midnight_utc():
    assert seeding.created_at_from_date("2024-03-05").isoformat() == "2024-03-05T00:00:00+00:00"


def test_branch_comes_from_a_location_column_or_defaults_to_central():
    assert seeding.branch_from_row(ROW) == "central"
    assert seeding.branch_from_row({**ROW, "ubicacion": " Valencia Centro "}) == "Valencia Centro"
    assert seeding.branch_from_row({**ROW, "location": "Miami", "ubicacion": "Valencia"}) == "Miami"
    assert seeding.branch_from_row({**ROW, "location": "  "}) == "central"


def test_a_row_becomes_a_customer_incident(db):
    seeding.seed_rows([{**ROW, "location": "Miami"}])
    doc = store.get("NXV-000500")
    assert (doc["id"], doc["title"], doc["description"]) == ("NXV-000500", ROW["description"], ROW["description"])
    assert (doc["status"], doc["category"], doc["origin"], doc["branch"]) == ("resolved", "BILLING", "customer", "Miami")
    assert (doc["created_at"], doc["updated_at"]) == ("2024-03-05T00:00:00Z", "2024-03-05T00:00:00Z")
    assert (doc["client_company"], doc["agent_id"], doc["satisfaction_score"]) == ("Acme", "AGT-04", 4)
    assert [(h["kind"], h["actor"], h["to_status"]) for h in doc["history"]] == [("imported", "seed", "resolved")]


def test_every_imported_incident_is_a_valid_customer_incident(db, rows):
    seeding.seed_rows(rows)
    docs = store.all_docs()
    assert {d["origin"] for d in docs} == {"customer"} and {d["branch"] for d in docs} == {"central"}
    assert all(0 < len(d["title"]) <= contract.TITLE_MAX for d in docs)
    assert {d["status"] for d in docs} <= set(contract.STATUSES)


# --- invalid rows ----------------------------------------------------------------------------

def test_the_provided_csv_loads_96_and_rejects_4_with_line_numbers(db, rows):
    report = seeding.seed_rows(rows)
    assert (report.total, report.inserted, report.skipped_existing, len(report.rejected)) == (100, 96, 0, 4)
    assert [(r.line, r.id, r.rules) for r in report.rejected] == [
        (18, "NXV-000017", ("missing_client_company",)),
        (44, "NXV-000043", ("invalid_or_missing_category",)),
        (87, "NXV-000086", ("invalid_or_missing_email",)),
        (91, "NXV-000090", ("closed_without_score",)),
    ]
    assert dict(report.rejected_by_rule) == {
        "missing_client_company": 1,
        "invalid_or_missing_category": 1,
        "invalid_or_missing_email": 1,
        "closed_without_score": 1,
    }
    assert not {r.id for r in report.rejected} & {d["id"] for d in store.all_docs()}


@pytest.mark.parametrize(
    "overrides,rule",
    [
        ({"client_company": ""}, "missing_client_company"),
        ({"category": "SPAM"}, "invalid_or_missing_category"),
        ({"description": "abc"}, "invalid_description"),
        ({"agent_id": "007"}, "invalid_or_missing_agent_id"),
        ({"customer_email": "nope"}, "invalid_or_missing_email"),
        ({"satisfaction_score": ""}, "closed_without_score"),
        ({"satisfaction_score": "9"}, "score_out_of_range"),
        ({"status": "PENDING"}, "invalid_or_missing_status"),  # not covered by the CSV rules
        ({"date": "05/03/2024"}, "invalid_date"),
        ({"ticket_id": "ticket-5"}, "schema:id"),
    ],
)
def test_each_kind_of_invalid_row_is_rejected_and_nothing_is_inserted(db, overrides, rule):
    report = seeding.seed_rows([{**ROW, **overrides}])
    assert report.inserted == 0 and [rule in r.rules for r in report.rejected] == [True]
    assert store.all_docs() == []


def test_rejection_reports_never_contain_customer_emails(db, rows):
    bad = {**ROW, "ticket_id": "NXV-000600", "customer_email": "secret.person@private.org", "category": "SPAM"}
    report = seeding.seed_rows([*rows, bad, {**ROW, "ticket_id": "NXV-000601", "customer_email": "x@@broken", "agent_id": "no"}])
    assert "@" not in repr(report)


def test_one_invalid_row_does_not_stop_the_valid_ones(db):
    report = seeding.seed_rows([{**ROW, "category": "SPAM"}, {**ROW, "ticket_id": "NXV-000501"}])
    assert (report.inserted, len(report.rejected)) == (1, 1) and store.get("NXV-000501")


# --- idempotency -----------------------------------------------------------------------------

def test_running_twice_does_not_duplicate(db, rows):
    seeding.seed_rows(rows)
    again = seeding.seed_rows(rows)
    assert (again.inserted, again.skipped_existing, len(again.rejected)) == (0, 96, 4)
    docs = store.all_docs()
    assert len(docs) == 96 and len({d["id"] for d in docs}) == 96


def test_an_id_repeated_inside_the_file_is_inserted_once(db):
    report = seeding.seed_rows([ROW, {**ROW, "description": "A different text for the same id"}])
    assert (report.inserted, report.skipped_existing) == (1, 1)
    assert store.get("NXV-000500")["description"] == ROW["description"]


def test_reseeding_never_overwrites_later_work_on_an_incident(db, rows, auth_headers):
    seeding.seed_rows(rows)
    client = TestClient(app, headers=auth_headers)
    # NXV-000054 is open in the CSV: someone picks it up
    assert client.patch("/api/incidents/NXV-000054/status", json={"status": "in_progress"}).status_code == 200
    seeding.seed_rows(rows)
    assert store.get("NXV-000054")["status"] == "in_progress"


def test_reset_wipes_and_reloads(db, rows):
    seeding.seed_rows(rows)
    store.insert({"id": "NXV-000999"})  # leftover
    report = seeding.seed_rows(rows, reset=True)
    assert report.inserted == 96 and len(store.all_docs()) == 96


def test_new_incidents_get_ids_after_the_seeded_ones(db, rows, auth_headers):
    seeding.seed_rows(rows)
    body = {"title": "After the seed", "description": "Created after loading the history", "category": "ACCESS", "origin": "internal", "branch": "central"}
    assert TestClient(app, headers=auth_headers).post("/api/incidents", json=body).json()["id"] == "NXV-000101"


# --- /api/incidents/summary vs the transformed CSV ---------------------------------------------

def test_summary_endpoint_matches_the_metrics_expected_from_the_csv(db, rows, auth_headers):
    seeding.seed_rows(rows)
    expected = seeding.expected_metrics(rows)
    # the expected numbers are those of the CONTEXT report, with the statuses translated
    assert expected["total"] == 96 and expected["satisfaction_average"] == 3.84
    assert expected["status_counts"] == {"open": 27, "resolved": 56, "discarded": 13}
    assert expected["category_counts"] == {"TECHNICAL": 28, "BILLING": 18, "ACCESS": 21, "HR_QUERY": 17, "COMPLAINT": 12}

    summary = TestClient(app, headers=auth_headers).get("/api/incidents/summary").json()
    assert summary["total"] == expected["total"]
    assert {k: summary["status_counts"][k] for k in expected["status_counts"]} == expected["status_counts"]
    assert summary["status_counts"]["in_progress"] == 0
    assert summary["category_counts"] == expected["category_counts"]
    assert summary["satisfaction_average"] == expected["satisfaction_average"]
    assert summary["satisfaction_scored"] == expected["satisfaction_scored"]
    assert seeding.metric_differences(expected, seeding.actual_metrics()) == []


def test_metric_differences_detects_a_mismatch(db, rows):
    seeding.seed_rows(rows)
    store.replace("NXV-000054", {**store.get("NXV-000054"), "status": "in_progress"})
    diffs = seeding.metric_differences(seeding.expected_metrics(rows), seeding.actual_metrics())
    assert any("status_counts[open]" in d for d in diffs)


# --- the script ------------------------------------------------------------------------------

def run_script(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True, cwd=REPO)


def test_script_loads_reports_rejections_and_verifies_the_summary(tmp_path):
    db_file = tmp_path / "incidents.json"
    result = run_script("--db", str(db_file))
    assert result.returncode == 0, result.stderr
    out = result.stdout
    assert "inserted ............ 96" in out and "rejected (invalid) .. 4" in out
    assert "line   18  NXV-000017: missing_client_company" in out and "line   91  NXV-000090: closed_without_score" in out
    assert "Summary check OK" in out and "open 27, resolved 56, discarded 13" in out and "3.84" in out
    assert "@" not in out


def test_script_is_idempotent_and_reset_reloads(tmp_path):
    db_file = tmp_path / "incidents.json"
    run_script("--db", str(db_file))
    again = run_script("--db", str(db_file))
    assert again.returncode == 0 and "inserted ............ 0" in again.stdout and "already present ..... 96" in again.stdout
    assert "Total incidents in database: 96" in again.stdout and "Summary check OK" in again.stdout
    reset = run_script("--db", str(db_file), "--reset")
    assert "inserted ............ 96" in reset.stdout


def test_script_skips_the_check_when_the_database_has_other_incidents(tmp_path):
    db_file = tmp_path / "incidents.json"
    run_script("--db", str(db_file))
    extra = io.StringIO()
    writer = csv.DictWriter(extra, fieldnames=list(ROW))
    writer.writeheader()
    writer.writerow(ROW)
    other = tmp_path / "other.csv"
    other.write_text(extra.getvalue(), encoding="utf-8")
    result = run_script("--db", str(db_file), "--csv", str(other))
    assert result.returncode == 0 and "Total incidents in database: 97" in result.stdout and "Summary check skipped" in result.stdout


def test_script_fails_clearly_on_a_missing_file_or_columns(tmp_path):
    missing = run_script("--db", str(tmp_path / "x.json"), "--csv", str(tmp_path / "nope.csv"))
    assert missing.returncode == 1 and "file not found" in missing.stderr
    bad = tmp_path / "bad.csv"
    bad.write_text("ticket_id,date\nNXV-1,2024-01-01\n", encoding="utf-8")
    result = run_script("--db", str(tmp_path / "x.json"), "--csv", str(bad))
    assert result.returncode == 1 and "missing required columns" in result.stderr and "customer_email" in result.stderr
