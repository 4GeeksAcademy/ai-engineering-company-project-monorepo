from pathlib import Path

import pytest

from incidents_shared.historical import (
    analyze_historical_incidents,
    validate_carrier_country,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = (
    REPO_ROOT
    / "content"
    / "contexts"
    / "incidents-file-analysis"
    / "incidents-trackflow.csv"
)


@pytest.fixture(scope="module")
def analysis():
    text = CSV_PATH.read_text(encoding="utf-8-sig")
    return analyze_historical_incidents(text)


def test_csv_has_100_records(analysis):
    assert analysis["total"] == 100


def test_95_valid_records(analysis):
    assert analysis["valid"] == 95


def test_5_invalid_records(analysis):
    assert analysis["invalid"] == 5


def test_invalid_breakdown_matches_confirmed_result(analysis):
    assert analysis["invalid_breakdown"] == {
        "invalid_tracking_number": 1,
        "carrier_country_mismatch": 1,
        "invalid_category": 1,
        "invalid_customer_email": 1,
        "closed_missing_score": 1,
    }


def test_trf_000025_is_invalid_due_to_carrier_country_mismatch(analysis):
    record = next(
        r for r in analysis["invalid_records"] if r["incident_id"] == "TRF-000025"
    )
    reasons = {error["reason"] for error in record["errors"]}
    assert "carrier_country_mismatch" in reasons


def test_no_customer_email_value_in_invalid_records(analysis):
    serialized = str(analysis["invalid_records"])
    assert "@" not in serialized


def test_carrier_es_valid():
    assert validate_carrier_country("ES", "LOCAL_ES") is True
    assert validate_carrier_country("ES", "MRW") is True
    assert validate_carrier_country("ES", "SEUR") is True
    assert validate_carrier_country("ES", "DHL_ES") is True


def test_carrier_es_with_fedex_invalid():
    assert validate_carrier_country("ES", "FEDEX") is False


def test_carrier_us_valid():
    assert validate_carrier_country("US", "UPS") is True
    assert validate_carrier_country("US", "FEDEX") is True
    assert validate_carrier_country("US", "DHL_US") is True


def test_carrier_us_with_mrw_invalid():
    assert validate_carrier_country("US", "MRW") is False
