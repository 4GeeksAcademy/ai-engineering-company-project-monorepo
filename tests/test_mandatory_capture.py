"""Mandatory capture payloads from real central-API writes."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from api.app import app

BOGOTA = ZoneInfo("America/Bogota")


def _token(client: TestClient) -> dict[str, str]:
    registered = client.post(
        "/auth/register",
        json={"email": f"capture.{uuid4().hex[:8]}@brasaland.test", "password": "secret-password"},
    )
    assert registered.status_code == 201, registered.text
    return {"Authorization": f"Bearer {registered.json()['access_token']}"}


def test_default_sale_stays_dine_in_and_maps_capture_to_in_store() -> None:
    import sales

    snapshot = list(sales._SALES)
    moment = datetime(2026, 9, 22, 18, 0, tzinfo=BOGOTA)
    try:
        with TestClient(app) as client:
            headers = _token(client)
            response = client.post(
                "/sales",
                headers=headers,
                json={
                    "location_id": "co-med-centro",
                    "amount": "48000",
                    "currency": "COP",
                    "occurred_at": moment.isoformat(),
                },
            )
            assert response.status_code == 201, response.text
            body = response.json()
            assert body["channel"] == "dine_in"
            assert body["covers"] == 1
            capture = body["capture"]
            assert capture["channel"] == "in_store"
            assert capture["covers_source"] == "defaulted_to_one"
            assert capture["lines"][0]["menu_item_name"] == "Grilled Sirloin"
            assert capture["loyalty_attached"] is False
            assert "loyalty_account_id" not in capture
            assert capture["points_earned"] == 4
    finally:
        sales._SALES[:] = snapshot


def test_explicit_plan_channel_is_stored() -> None:
    import sales

    snapshot = list(sales._SALES)
    try:
        with TestClient(app) as client:
            headers = _token(client)
            response = client.post(
                "/sales",
                headers=headers,
                json={
                    "location_id": "us-mia-downtown",
                    "amount": 36,
                    "currency": "USD",
                    "channel": "delivery",
                    "covers": 2,
                    "lines": [
                        {
                            "menu_item_id": "bbq-ribs",
                            "menu_item_name": "Brasaland BBQ Ribs",
                            "quantity": 2,
                            "line_amount": 36,
                        }
                    ],
                },
            )
            assert response.status_code == 201, response.text
            body = response.json()
            assert body["channel"] == "delivery"
            assert body["covers"] == 2
            assert body["capture"]["channel"] == "delivery"
            assert body["capture"]["covers_source"] == "pos"
            assert body["capture"]["lines"][0]["menu_item_id"] == "bbq-ribs"
    finally:
        sales._SALES[:] = snapshot


def test_inbound_line_and_price_variance() -> None:
    with TestClient(app) as client:
        headers = _token(client)
        products = client.get("/inventory", headers=headers)
        assert products.status_code == 200, products.text
        product = products.json()[0]
        suppliers = client.get("/suppliers", headers=headers, params={"country": "Colombia"})
        supplier = next(row for row in suppliers.json() if row["currency"] == "COP")
        response = client.post(
            "/orders/inbound",
            headers=headers,
            json={
                "location_id": "co-med-centro",
                "supplier_id": supplier["id"],
                "product_id": product["product_id"],
                "quantity": 2,
                "order_kind": "scheduled",
                "category": "proteins",
                "unit_price": round(supplier["latest_unit_price"] * 1.05, 2),
            },
        )
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["inbound"]["supplier_id"].startswith("sup_")
        assert body["inbound"]["surcharge_rate"] == 0
        assert body["inbound"]["approval_state"] == "not_required"
        assert body["price_variance"]["previous_unit_price"] == supplier["latest_unit_price"]
        assert body["price_variance"]["variance_pct"] >= 0.01


def test_customer_preference_uses_opaque_id() -> None:
    with TestClient(app) as client:
        headers = _token(client)
        customers = client.get("/customers", headers=headers)
        customer = customers.json()[0]
        response = client.post(
            f"/customers/{customer['id']}/preferences",
            headers=headers,
            json={"preference_code": "preferred_language", "preference_value": "es"},
        )
        assert response.status_code == 201, response.text
        capture = response.json()["capture"]
        assert capture["customer_id"].startswith("cus_")
        assert capture["customer_id"] != customer["id"]
        assert "name" not in capture
        assert capture["preference_value"] == "es"


def test_recommendation_show_and_accept() -> None:
    with TestClient(app) as client:
        headers = _token(client)
        shown = client.post(
            "/recommendations",
            headers=headers,
            json={"location_id": "co-med-centro", "surface": "checkout"},
        )
        assert shown.status_code == 201, shown.text
        body = shown.json()
        assert body["capture"]["menu_item_name"]
        assert body["capture"]["surface"] == "checkout"
        accepted = client.post(
            f"/recommendations/{body['recommendation_id']}/accept",
            headers=headers,
        )
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["capture"]["accepted"] is True
        assert accepted.json()["capture"]["recommendation_id"] == body["recommendation_id"]


def test_people_and_recipe_writes() -> None:
    with TestClient(app) as client:
        headers = _token(client)
        hired = client.post(
            "/people/hires",
            headers=headers,
            json={
                "country": "Colombia",
                "effective_date": "2026-10-01",
                "employment_basis": "kitchen",
            },
        )
        assert hired.status_code == 201, hired.text
        employee_id = hired.json()["capture"]["employee_id"]
        assert employee_id.startswith("emp_")
        separated = client.post(
            "/people/separations",
            headers=headers,
            json={
                "employee_id": employee_id,
                "effective_date": "2026-10-06",
                "separation_kind": "resignation",
            },
        )
        assert separated.status_code == 201, separated.text
        assert separated.json()["capture"]["country"] == "Colombia"
        opened = client.post(
            "/people/vacancies",
            headers=headers,
            json={
                "country": "United States",
                "opened_on": "2026-10-01",
                "employment_basis": "floor",
            },
        )
        vacancy_id = opened.json()["capture"]["vacancy_id"]
        filled = client.post(
            f"/people/vacancies/{vacancy_id}/fill",
            headers=headers,
            json={"filled_on": "2026-10-06"},
        )
        assert filled.status_code == 200, filled.text
        assert filled.json()["capture"]["days_to_fill"] == 5
        recipes = client.get("/training/recipes", headers=headers)
        recipe = recipes.json()[0]
        published = client.post(
            f"/training/recipes/{recipe['recipe_id']}/publish",
            headers=headers,
            json={"locale": "es"},
        )
        assert published.status_code == 201, published.text
        version = published.json()["capture"]["version"]
        assert published.json()["capture"]["title"]
        acknowledged = client.post(
            f"/training/recipes/{recipe['recipe_id']}/acknowledgements",
            headers=headers,
            json={"location_id": "us-mia-downtown", "version": version},
        )
        assert acknowledged.status_code == 201, acknowledged.text
        assert acknowledged.json()["capture"]["currency"] == "USD"
