"""Central API nouns from CONTEXT.md Technology: menus, sales, customers, suppliers."""
from __future__ import annotations

import importlib
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.app import app  # pylint: disable=wrong-import-position

users = importlib.import_module("users")
sales = importlib.import_module("sales")
customers = importlib.import_module("customers")


@pytest.fixture()
def client():
    temp_dir = tempfile.TemporaryDirectory()
    original_database_path = users.DATABASE_PATH
    users.DATABASE_PATH = Path(temp_dir.name) / "company_api.db"
    try:
        yield TestClient(app)
    finally:
        users.DATABASE_PATH = original_database_path
        temp_dir.cleanup()


def _headers(client: TestClient) -> dict[str, str]:
    created = client.post(
        "/users",
        json={"email": "ops@brasaland.test", "password": "secret-password"},
    )
    assert created.status_code == 201
    token = client.post(
        "/auth/token",
        data={"username": "ops@brasaland.test", "password": "secret-password"},
    )
    assert token.status_code == 200
    return {"Authorization": f"Bearer {token.json()['access_token']}"}


def _assert_error_envelope(response, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    body = response.json()
    assert body["status"] == status_code
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]
    assert "detail" in body


def test_openapi_covers_technology_nouns(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    joined = " ".join(paths)
    for needle in ("/locations", "/menus", "/sales", "/customers", "/suppliers", "/inventory"):
        assert needle in joined
    assert "/sales/overview" in paths
    assert "/customers/overview" in paths
    assert "/suppliers/overview" in paths
    assert "/menus/catalogue" in paths


def test_menus_are_public_and_priced_in_cop_and_usd(client: TestClient) -> None:
    response = client.get("/menus")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 6
    ids = {item["id"] for item in items}
    assert "grilled-sirloin" in ids
    for item in items:
        assert "Colombia" in item["available_in"]
        assert "Florida" in item["available_in"]
        assert item["price_cop"] > 0
        assert item["price_usd"] > 0

    catalogue = client.get("/menus/catalogue")
    assert catalogue.status_code == 200
    payload = catalogue.json()
    assert payload["currencies"] == ["COP", "USD"]
    assert payload["same_recipes_every_kitchen"] is True
    assert payload["location_count"] == 14

    missing = client.get("/menus/not-a-dish")
    _assert_error_envelope(missing, 404, "not_found")


def test_sales_require_jwt_and_carry_currency_location_and_timestamp(client: TestClient) -> None:
    anonymous = client.get("/sales/overview")
    _assert_error_envelope(anonymous, 401, "unauthorized")

    headers = _headers(client)
    tickets = client.get("/sales", headers=headers)
    assert tickets.status_code == 200
    rows = tickets.json()
    assert len(rows) == 14 * 3
    location_ids = {row["location_id"] for row in rows}
    assert len(location_ids) == 14
    assert {row["currency"] for row in rows} == {"COP", "USD"}
    for row in rows:
        assert row["location_id"]
        assert row["occurred_at"]
        assert row["amount"] > 0
        assert row["currency"] in {"COP", "USD"}

    cop = client.get("/sales", headers=headers, params={"currency": "COP"})
    assert cop.status_code == 200
    assert cop.json()
    assert all(row["currency"] == "COP" for row in cop.json())
    assert all(row["location_id"].startswith("co-") for row in cop.json())

    usd = client.get("/sales", headers=headers, params={"currency": "USD"})
    assert all(row["currency"] == "USD" for row in usd.json())
    assert all(row["location_id"].startswith("us-") for row in usd.json())

    overview = client.get("/sales/overview", headers=headers)
    assert overview.status_code == 200
    payload = overview.json()
    assert payload["total_locations"] == 14
    assert payload["currencies"] == ["COP", "USD"]
    assert payload["sale_count"] == len(rows)
    assert payload["chain_total_cop"] == pytest.approx(sum(row["amount_cop"] for row in rows))
    assert payload["chain_total_usd"] == pytest.approx(sum(row["amount_usd"] for row in rows))
    assert payload["colombia_total_cop"] > 0
    assert payload["florida_total_usd"] > 0
    assert len(payload["locations"]) == 14
    assert payload["no_sales_alerts"] == []
    assert {row["currency"] for row in payload["locations"]} == {"COP", "USD"}

    brickell = client.get("/sales/locations/us-mia-brickell", headers=headers)
    assert brickell.status_code == 200
    assert brickell.json()["currency"] == "USD"
    assert brickell.json()["sale_count"] == 3

    medellin = client.get("/sales/locations/co-med-centro", headers=headers)
    assert medellin.json()["currency"] == "COP"

    one = client.get("/sales/sal-us-mia-brickell-1", headers=headers)
    assert one.status_code == 200
    body = one.json()
    assert body["currency"] == "USD"
    assert body["location_id"] == "us-mia-brickell"
    assert body["occurred_at"].endswith("-04:00")

    missing = client.get("/sales/locations/no-such-site", headers=headers)
    _assert_error_envelope(missing, 404, "not_found")
    missing_ticket = client.get("/sales/sal-missing", headers=headers)
    _assert_error_envelope(missing_ticket, 404, "not_found")

    alerts = client.get("/sales/alerts", headers=headers)
    assert alerts.status_code == 200
    assert alerts.json() == []


def test_quiet_location_is_a_no_sales_alert() -> None:
    sample = sales._SALES[0]
    after_close = sample.model_copy(update={"occurred_at": "2026-09-16T23:10:00-05:00", "location_id": sample.location_id})
    rollups = sales.build_location_rollups([after_close])
    quiet = [row.location_id for row in rollups if row.no_sales_during_open_hours]
    assert sample.location_id in quiet
    assert len(quiet) == 14


def test_customers_require_jwt_and_expose_brasa_points_balance(client: TestClient) -> None:
    anonymous = client.get("/customers")
    _assert_error_envelope(anonymous, 401, "unauthorized")

    headers = _headers(client)
    overview = client.get("/customers/overview", headers=headers)
    assert overview.status_code == 200
    payload = overview.json()
    assert payload["total_customers"] == 10
    assert payload["colombia_count"] > 0
    assert payload["florida_count"] > 0
    assert payload["digital_loyalty"] is False
    assert payload["stamp_card_users"] + payload["customers_without_stamp_card"] == payload["total_customers"]
    assert payload["customers_without_stamp_card"] / payload["total_customers"] == pytest.approx(0.6)
    assert payload["brasa_points_outstanding"] == sum(
        row["brasa_points_balance"] for row in payload["customers"]
    )
    assert "Brasa Point" in payload["points_rule"]

    one = client.get("/customers/cus-001", headers=headers)
    assert one.status_code == 200
    body = one.json()
    assert body["loyalty_program"] == "Brasa Points"
    assert body["loyalty_medium"] == "physical_stamp_card"
    assert body["digital_loyalty"] is False
    assert body["uses_stamp_card"] is True
    assert body["brasa_points_balance"] == 32
    assert body["loyalty_tier"] == "silver"
    assert body["order_history"]

    gold = client.get("/customers/cus-008", headers=headers)
    assert gold.json()["brasa_points_balance"] == 54
    assert gold.json()["loyalty_tier"] == "gold"
    assert gold.json()["market"] == "Florida"

    unused = client.get("/customers/cus-010", headers=headers)
    assert unused.json()["uses_stamp_card"] is False
    assert unused.json()["brasa_points_balance"] == 0
    assert unused.json()["loyalty_tier"] == "bronze"

    missing = client.get("/customers/cus-999", headers=headers)
    _assert_error_envelope(missing, 404, "not_found")


def test_loyalty_tier_bands() -> None:
    assert customers.loyalty_tier(0) == "bronze"
    assert customers.loyalty_tier(19) == "bronze"
    assert customers.loyalty_tier(20) == "silver"
    assert customers.loyalty_tier(49) == "silver"
    assert customers.loyalty_tier(50) == "gold"


def test_suppliers_require_jwt_and_cover_twenty_across_two_markets(client: TestClient) -> None:
    anonymous = client.get("/suppliers")
    _assert_error_envelope(anonymous, 401, "unauthorized")

    headers = _headers(client)
    overview = client.get("/suppliers/overview", headers=headers)
    assert overview.status_code == 200
    payload = overview.json()
    assert payload["total_suppliers"] == 20
    assert payload["colombia_count"] + payload["florida_count"] == 20
    assert payload["colombia_count"] == 10
    assert payload["florida_count"] == 10
    assert payload["price_alerts"] > 0

    colombia = client.get("/suppliers", headers=headers, params={"country": "Colombia"})
    assert colombia.status_code == 200
    assert len(colombia.json()) == 10
    assert all(row["country"] == "Colombia" and row["currency"] == "COP" for row in colombia.json())

    florida = client.get("/suppliers", headers=headers, params={"country": "United States"})
    assert len(florida.json()) == 10
    assert all(row["currency"] == "USD" and row["market"] == "Florida" for row in florida.json())

    proteins = client.get("/suppliers", headers=headers, params={"category": "proteins"})
    assert proteins.status_code == 200
    assert len(proteins.json()) >= 2

    one = client.get("/suppliers/sup-013", headers=headers)
    assert one.status_code == 200
    assert one.json()["name"] == "Gulf Coast Produce"
    assert len(one.json()["price_history"]) == 2
    assert one.json()["emergency_surcharge_pct"] == 8

    alerted = client.get("/suppliers/sup-010", headers=headers)
    assert alerted.json()["price_alert"] is True
    assert alerted.json()["latest_currency"] == "COP"

    missing = client.get("/suppliers/sup-999", headers=headers)
    _assert_error_envelope(missing, 404, "not_found")

    invalid = client.get("/suppliers", headers=headers, params={"country": "Spain"})
    _assert_error_envelope(invalid, 422, "validation_error")
