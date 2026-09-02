from collections import Counter
from pathlib import Path

import pytest

from incidents_shared.historical import analyze_historical_incidents
from incidents_shared.transform import (
    historical_row_dedup_key,
    transform_historical_row,
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
def valid_rows():
    text = CSV_PATH.read_text(encoding="utf-8-sig")
    analysis = analyze_historical_incidents(text)
    return analysis["valid_rows"]


@pytest.fixture(scope="module")
def transformed(valid_rows):
    result = [transform_historical_row(row) for row in valid_rows]
    assert all(item is not None for item in result)
    return result


def test_transform_status_mapping():
    assert transform_historical_row({
        "description": "Parcel lost in transit near warehouse dock",
        "date": "2024-01-08",
        "status": "OPEN",
        "category": "LOST_PARCEL",
        "country": "ES",
    })["status"] == "open"

    assert transform_historical_row({
        "description": "Parcel lost in transit near warehouse dock",
        "date": "2024-01-08",
        "status": "CLOSED",
        "category": "LOST_PARCEL",
        "country": "ES",
    })["status"] == "resolved"

    assert transform_historical_row({
        "description": "Parcel lost in transit near warehouse dock",
        "date": "2024-01-08",
        "status": "DISCARDED",
        "category": "LOST_PARCEL",
        "country": "ES",
    })["status"] == "discarded"


def test_transform_category_mapping():
    base = {
        "description": "Sample incident description text",
        "date": "2024-01-08",
        "status": "OPEN",
        "country": "US",
    }
    assert transform_historical_row({**base, "category": "LOST_PARCEL"})["category"] == "lost_parcel"
    assert transform_historical_row({**base, "category": "DELAYED_DELIVERY"})["category"] == "carrier_issue"
    assert transform_historical_row({**base, "category": "WRONG_ADDRESS"})["category"] == "delivery_failure"
    assert transform_historical_row({**base, "category": "RETURN_REQUEST"})["category"] == "returns_issue"
    assert transform_historical_row({**base, "category": "DAMAGE"})["category"] == "carrier_issue"


def test_transform_country_to_branch_mapping():
    base = {
        "description": "Sample incident description text",
        "date": "2024-01-08",
        "status": "OPEN",
        "category": "LOST_PARCEL",
    }
    assert transform_historical_row({**base, "country": "US"})["branch"] == "la_office"
    assert transform_historical_row({**base, "country": "ES"})["branch"] == "zaragoza_office"


def test_title_truncated_to_120_chars():
    long_description = "A" * 200
    result = transform_historical_row({
        "description": long_description,
        "date": "2024-01-08",
        "status": "OPEN",
        "category": "LOST_PARCEL",
        "country": "ES",
    })
    assert len(result["title"]) == 120
    assert result["description"] == long_description


def test_timestamps_are_utc_midnight():
    result = transform_historical_row({
        "description": "Sample incident description text",
        "date": "2024-03-15",
        "status": "OPEN",
        "category": "LOST_PARCEL",
        "country": "ES",
    })
    assert result["created_at"] == "2024-03-15T00:00:00+00:00"
    assert result["updated_at"] == result["created_at"]


def test_origin_is_always_customer(transformed):
    assert all(item["origin"] == "customer" for item in transformed)


def test_customer_email_not_in_transformed_output(transformed):
    serialized = str(transformed)
    assert "@" not in serialized
    assert all("customer_email" not in item for item in transformed)


def test_incident_id_not_in_transformed_payload(transformed):
    assert all("incident_id" not in item for item in transformed)


def test_dedup_key_uses_incident_id_when_present():
    row = {"incident_id": "TRF-000001"}
    transformed_row = {"title": "x", "created_at": "2024-01-01T00:00:00+00:00"}
    assert historical_row_dedup_key(row, transformed_row) == "TRF-000001"


def test_dedup_key_falls_back_to_title_and_created_at():
    row = {}
    transformed_row = {"title": "Parcel lost", "created_at": "2024-01-01T00:00:00+00:00"}
    assert historical_row_dedup_key(row, transformed_row) == "Parcel lost|2024-01-01T00:00:00+00:00"


def test_post_transform_counts_exact(transformed):
    assert len(transformed) == 95

    status_counts = Counter(item["status"] for item in transformed)
    assert status_counts["open"] == 29
    assert status_counts["resolved"] == 52
    assert status_counts["discarded"] == 14
    assert status_counts.get("in_progress", 0) == 0

    category_counts = Counter(item["category"] for item in transformed)
    assert category_counts["lost_parcel"] == 14
    assert category_counts["carrier_issue"] == 45
    assert category_counts["delivery_failure"] == 19
    assert category_counts["returns_issue"] == 17

    origin_counts = Counter(item["origin"] for item in transformed)
    assert origin_counts["customer"] == 95

    branch_counts = Counter(item["branch"] for item in transformed)
    assert branch_counts["la_office"] == 50
    assert branch_counts["zaragoza_office"] == 45
    assert branch_counts.get("central", 0) == 0
    assert branch_counts.get("la_warehouse", 0) == 0
    assert branch_counts.get("zaragoza_warehouse", 0) == 0
