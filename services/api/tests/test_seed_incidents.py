import sys
from pathlib import Path

import pytest
from tinydb import TinyDB


REPO_ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = (
    REPO_ROOT
    / "content"
    / "contexts"
    / "incidents-file-analysis"
    / "incidents-trackflow.csv"
)

# `scripts/` is not an installed package — bootstrap it onto sys.path so
# the seed script can be imported and exercised directly in tests.
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from seed_incidents import seed_incidents  # noqa: E402


PRIVATE_HISTORICAL_FIELDS = {
    "customer_email",
    "incident_id",
    "tracking_number",
    "carrier",
    "satisfaction_score",
}


@pytest.fixture
def temp_tables(tmp_path):
    db = TinyDB(tmp_path / "test-incidents-db.json")
    return db.table("incidents"), db.table("incident_seed_keys")


def test_seed_run_1_inserts_95(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    summary = seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    assert summary["inserted"] == 95
    assert summary["skipped_existing"] == 0
    assert summary["invalid"] == 5
    assert summary["total_incidents"] == 95
    assert len(incidents_table) == 95


def test_seed_run_2_is_idempotent(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)
    summary = seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    assert summary["inserted"] == 0
    assert summary["skipped_existing"] == 95
    assert summary["total_incidents"] == 95
    assert len(incidents_table) == 95


def test_seed_invalid_breakdown(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    summary = seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    assert summary["invalid_breakdown"] == {
        "invalid_tracking_number": 1,
        "carrier_country_mismatch": 1,
        "invalid_category": 1,
        "invalid_customer_email": 1,
        "closed_missing_score": 1,
    }


def test_seed_status_counts(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    docs = incidents_table.all()
    from collections import Counter
    status_counts = Counter(doc["status"] for doc in docs)

    assert status_counts["open"] == 29
    assert status_counts["resolved"] == 52
    assert status_counts["discarded"] == 14
    assert status_counts.get("in_progress", 0) == 0


def test_seed_category_counts(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    docs = incidents_table.all()
    from collections import Counter
    category_counts = Counter(doc["category"] for doc in docs)

    assert category_counts["lost_parcel"] == 14
    assert category_counts["carrier_issue"] == 45
    assert category_counts["delivery_failure"] == 19
    assert category_counts["returns_issue"] == 17
    for other in (
        "inventory_discrepancy",
        "warehouse_incident",
        "system_failure",
        "client_complaint",
        "other",
    ):
        assert category_counts.get(other, 0) == 0


def test_seed_origin_counts(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    docs = incidents_table.all()
    from collections import Counter
    origin_counts = Counter(doc["origin"] for doc in docs)

    assert origin_counts["customer"] == 95
    assert origin_counts.get("branch", 0) == 0
    assert origin_counts.get("internal", 0) == 0


def test_seed_branch_counts(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    docs = incidents_table.all()
    from collections import Counter
    branch_counts = Counter(doc["branch"] for doc in docs)

    assert branch_counts["la_office"] == 50
    assert branch_counts["zaragoza_office"] == 45
    for other in ("central", "la_warehouse", "zaragoza_warehouse"):
        assert branch_counts.get(other, 0) == 0


def test_seed_no_duplicates_across_runs(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    assert len(incidents_table) == 95
    assert len(seed_keys_table) == 95


def test_seed_does_not_persist_historical_pii_fields(temp_tables):
    incidents_table, seed_keys_table = temp_tables
    seed_incidents(CSV_PATH, incidents_table, seed_keys_table)

    for doc in incidents_table.all():
        assert PRIVATE_HISTORICAL_FIELDS.isdisjoint(doc.keys())
        assert set(doc.keys()) == {
            "title",
            "description",
            "category",
            "status",
            "origin",
            "branch",
            "created_at",
            "updated_at",
        }
