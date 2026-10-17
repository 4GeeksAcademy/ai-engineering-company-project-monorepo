"""Directorio de Proveedores (``/suppliers``, also served as ``/api/suppliers`` for the backoffice): the business rules of
keeping the company's supplier list.

Layout shared by every test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert; one HTTP call per test
through ``authed_client`` (``async_client`` where the point is having no session). Outcomes are asserted on the store, read
through ``suppliers.service``, not on the shape of the JSON: what is kept, what is refused, and what never changes.

The 15 seeded suppliers (``suppliers_db`` in ``conftest.py``): ids 1 to 15, 8 in Spain (EUR) and 7 in the USA (USD);
Greenhouse (5) and Coursera for Teams (9) are suspended. Complements ``test_suppliers_endpoints.py`` and
``test_suppliers_validation.py``, which predate it and keep their own structure.
"""

from __future__ import annotations

import pytest

from suppliers import service as suppliers_service
from suppliers.schemas import Country, SupplierStatus

pytestmark = pytest.mark.anyio

NEW = {
    "name": "Proveedor Nuevo",
    "country": "USA",
    "categories": ["ats_software", "job_boards"],
    "monthly_rate": 99.5,
    "currency": "USD",
    "status": "active",
}

SPAIN = {
    "LinkedIn Talent Solutions", "InfoJobs Premium", "Workable", "Thomas International",
    "Udemy Business", "Sage HR", "Microsoft 365 Business", "Regus Valencia",
}
USA = {"Indeed Sponsored", "Greenhouse", "HireVue", "Coursera for Teams", "Gusto", "Checkr", "WeWork Miami"}


def names(response) -> set[str]:
    return {supplier["name"] for supplier in response.json()}


def stored(supplier_id: int):
    return suppliers_service.get_supplier(supplier_id)


# --- HAPPY PATH ---------------------------------------------------------------------------------------


async def test_the_directory_lists_every_supplier(authed_client, suppliers_db):
    response = await authed_client.get("/suppliers")

    assert response.status_code == 200
    assert names(response) == SPAIN | USA
    assert len(response.json()) == len(suppliers_db) == 15


async def test_a_supplier_is_read_by_its_id(authed_client, suppliers_db):
    response = await authed_client.get("/suppliers/1")

    assert response.status_code == 200
    assert response.json()["name"] == "LinkedIn Talent Solutions"


async def test_a_new_supplier_is_added_with_the_next_id_and_can_be_read_back(authed_client, suppliers_db):
    response = await authed_client.post("/suppliers", json=NEW)

    assert response.status_code == 201
    supplier = stored(response.json()["id"])
    assert supplier.id == 16 and len(suppliers_db) == 16
    assert (supplier.name, supplier.country, supplier.monthly_rate, supplier.status) == (
        NEW["name"], Country.USA, NEW["monthly_rate"], SupplierStatus.ACTIVE,
    )
    assert (await authed_client.get("/suppliers/16")).json()["name"] == NEW["name"]


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"country": "Spain"}, SPAIN),
        ({"country": "USA"}, USA),
        ({"category": "ats_software"}, {"Workable", "Greenhouse"}),
        ({"category": "office_and_facilities"}, {"Regus Valencia", "WeWork Miami"}),
    ],
    ids=["spain", "usa", "ats", "office"],
)
async def test_the_directory_can_be_filtered_by_country_or_category(authed_client, suppliers_db, params, expected):
    assert names(await authed_client.get("/suppliers", params=params)) == expected


@pytest.mark.parametrize(
    ("path", "params"),
    [("/suppliers/search/by-country", {"country": "Spain"}), ("/suppliers/search/by-category", {"category": "training_platforms"})],
    ids=["by-country", "by-category"],
)
async def test_the_search_endpoints_find_the_same_suppliers_as_the_directory_filters(authed_client, suppliers_db, path, params):
    searched = await authed_client.get(path, params=params)
    filtered = await authed_client.get("/suppliers", params=params)

    assert searched.status_code == 200
    assert names(searched) == names(filtered) != set()


async def test_changing_the_monthly_rate_stamps_the_time_of_the_change(authed_client, suppliers_db):
    before = stored(1).updated_at

    response = await authed_client.patch("/suppliers/1/rate", json={"monthly_rate": 1350.5})

    assert response.status_code == 200
    assert stored(1).monthly_rate == 1350.5
    assert stored(1).updated_at > before


async def test_a_supplier_can_be_suspended_and_reactivated_and_the_history_is_kept(authed_client, suppliers_db):
    await authed_client.patch("/suppliers/1/status", json={"status": "suspended"})
    assert stored(1).status == SupplierStatus.SUSPENDED
    assert stored(1).name == "LinkedIn Talent Solutions"  # suspending retires nothing: the commercial history stays

    await authed_client.patch("/suppliers/1/status", json={"status": "active"})

    assert stored(1).status == SupplierStatus.ACTIVE


async def test_a_partial_update_changes_only_the_fields_that_were_sent(authed_client, suppliers_db):
    before = stored(1)

    response = await authed_client.patch("/suppliers/1", json={"name": "LinkedIn Premium", "notes": "renegociar en marzo"})

    assert response.status_code == 200
    after = stored(1)
    assert (after.name, after.notes) == ("LinkedIn Premium", "renegociar en marzo")
    assert (after.monthly_rate, after.country, after.categories, after.status) == (
        before.monthly_rate, before.country, before.categories, before.status,
    )
    assert after.updated_at == before.updated_at  # the rate did not change, so neither did the stamp


async def test_a_supplier_is_removed_for_good(authed_client, suppliers_db):
    response = await authed_client.delete("/suppliers/3")

    assert response.status_code == 204
    assert len(suppliers_db) == 14
    assert (await authed_client.get("/suppliers/3")).status_code == 404


async def test_the_backoffice_alias_serves_and_changes_the_same_directory(authed_client, suppliers_db):
    assert names(await authed_client.get("/api/suppliers")) == SPAIN | USA

    created = await authed_client.post("/api/suppliers", json=NEW)

    assert created.status_code == 201
    assert len(suppliers_db) == 16
    assert "Proveedor Nuevo" in names(await authed_client.get("/suppliers"))


# --- EDGE CASES --------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"country": "USA", "category": "ats_software"}, {"Greenhouse"}),
        ({"country": "Spain", "category": "payroll_and_hr_software"}, {"Sage HR"}),
        ({"country": "Spain", "category": "office_and_facilities"}, {"Regus Valencia"}),
        ({"country": "Spain", "category": "background_check"}, set()),
    ],
    ids=["usa-ats", "spain-payroll", "spain-office", "no-match"],
)
async def test_country_and_category_filters_combine_with_and_and_no_match_is_an_empty_list(authed_client, suppliers_db, params, expected):
    response = await authed_client.get("/suppliers", params=params)

    assert response.status_code == 200
    assert names(response) == expected


async def test_a_supplier_with_several_categories_is_found_under_each_of_them(authed_client, suppliers_db):
    await authed_client.post("/suppliers", json=NEW)  # ats_software + job_boards

    for category in ("ats_software", "job_boards"):
        found = await authed_client.get("/suppliers/search/by-category", params={"category": category})
        assert "Proveedor Nuevo" in names(found)


async def test_an_update_with_nothing_in_it_changes_nothing(authed_client, suppliers_db):
    before = stored(1)

    response = await authed_client.patch("/suppliers/1", json={})

    assert response.status_code == 200
    assert stored(1) == before


async def test_the_timestamp_only_follows_changes_of_the_rate(authed_client, suppliers_db):
    original = stored(1).updated_at

    await authed_client.patch("/suppliers/1", json={"monthly_rate": 1200.0})  # the rate it already has
    assert stored(1).updated_at == original
    await authed_client.patch("/suppliers/1/status", json={"status": "suspended"})
    assert stored(1).updated_at == original  # a status change is not a rate change
    await authed_client.patch("/suppliers/1", json={"monthly_rate": 1300.0})

    assert stored(1).updated_at > original


@pytest.mark.parametrize(("rate", "accepted"), [(0.01, True), (1, True), (0, False), (-0.01, False)])
async def test_the_monthly_rate_must_be_greater_than_zero(authed_client, suppliers_db, rate, accepted):
    response = await authed_client.patch("/suppliers/1/rate", json={"monthly_rate": rate})

    assert response.is_success is accepted
    assert stored(1).monthly_rate == (rate if accepted else 1200.0)


async def test_the_optional_fields_may_be_left_out_or_null(authed_client, suppliers_db):
    bare = await authed_client.post("/suppliers", json=NEW)
    explicit = await authed_client.post(
        "/suppliers",
        json={**NEW, "name": "Con fecha", "contract_renewal_date": "2026-01-15", "contact_email": None, "notes": None},
    )

    assert bare.status_code == explicit.status_code == 201
    assert stored(16).contract_renewal_date is None
    assert str(stored(17).contract_renewal_date) == "2026-01-15"


async def test_a_supplier_can_change_country_when_the_currency_changes_with_it(authed_client, suppliers_db):
    response = await authed_client.patch("/suppliers/1", json={"country": "USA", "currency": "USD"})

    assert response.status_code == 200
    assert (stored(1).country, stored(1).currency.value) == (Country.USA, "USD")


@pytest.mark.parametrize("supplier_id", [0, -1, 999])
async def test_an_id_outside_the_directory_is_simply_not_found(authed_client, suppliers_db, supplier_id):
    assert (await authed_client.get(f"/suppliers/{supplier_id}")).status_code == 404


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/suppliers/999", None),
        ("PATCH", "/suppliers/999", {"name": "X"}),
        ("PATCH", "/suppliers/999/rate", {"monthly_rate": 5}),
        ("PATCH", "/suppliers/999/status", {"status": "suspended"}),
        ("DELETE", "/suppliers/999", None),
    ],
    ids=["read", "update", "rate", "status", "delete"],
)
async def test_every_operation_on_an_unknown_supplier_is_not_found_and_changes_nothing(authed_client, suppliers_db, method, path, body):
    before = suppliers_db.all()

    response = await authed_client.request(method, path, json=body)

    assert response.status_code == 404
    assert suppliers_db.all() == before


@pytest.mark.parametrize(("country", "currency"), [("Spain", "USD"), ("USA", "EUR")], ids=["spain-usd", "usa-eur"])
async def test_the_currency_has_to_match_the_country_when_a_supplier_is_created(authed_client, suppliers_db, country, currency):
    response = await authed_client.post("/suppliers", json={**NEW, "country": country, "currency": currency})

    assert not response.is_success
    assert len(suppliers_db) == 15


@pytest.mark.parametrize(
    "change", [{"country": "USA"}, {"currency": "USD"}], ids=["country-alone", "currency-alone"]
)
async def test_an_update_that_would_break_the_currency_rule_is_refused_and_leaves_the_supplier_untouched(
    authed_client, suppliers_db, change
):
    before = stored(1)  # Spain, EUR

    response = await authed_client.patch("/suppliers/1", json=change)

    assert not response.is_success
    assert stored(1) == before


@pytest.mark.parametrize(
    "bad",
    [
        {"status": "inactive"},
        {"status": ""},
        {"monthly_rate": 0},
        {"monthly_rate": "abc"},
        {"name": ""},
        {"categories": []},
        {"categories": ["unknown_category"]},
        {"country": "France"},
        {"updated_at": "2020-01-01T00:00:00Z"},
        {"id": 99},
        {"unknown_field": "x"},
    ],
    ids=["status", "empty-status", "zero-rate", "text-rate", "empty-name", "no-categories", "bad-category", "bad-country",
         "client-timestamp", "client-id", "extra-field"],
)
async def test_invalid_data_never_reaches_the_store_on_create_or_update(authed_client, suppliers_db, bad):
    before = suppliers_db.all()

    created = await authed_client.post("/suppliers", json={**NEW, **bad})
    updated = await authed_client.patch("/suppliers/1", json=bad)

    assert not created.is_success and not updated.is_success
    assert suppliers_db.all() == before


@pytest.mark.parametrize(
    ("path", "params"),
    [
        ("/suppliers", {"country": "France"}),
        ("/suppliers", {"category": "nope"}),
        ("/suppliers", {"country": "spain"}),
        ("/suppliers/search/by-country", {}),
        ("/suppliers/search/by-category", {}),
        ("/suppliers/search/by-country", {"country": "Narnia"}),
    ],
    ids=["country", "category", "lower-case-country", "search-no-country", "search-no-category", "search-bad-country"],
)
async def test_a_filter_with_an_unknown_or_missing_value_is_refused_rather_than_answered_with_an_empty_list(
    authed_client, suppliers_db, path, params
):
    response = await authed_client.get(path, params=params)

    assert not response.is_success
    assert not isinstance(response.json(), list)  # a refusal, not an empty (or a full) list of suppliers


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/suppliers", None),
        ("GET", "/api/suppliers", None),
        ("GET", "/suppliers/1", None),
        ("GET", "/suppliers/search/by-country?country=Spain", None),
        ("GET", "/suppliers/search/by-category?category=job_boards", None),
        ("POST", "/suppliers", NEW),
        ("POST", "/api/suppliers", NEW),
        ("PATCH", "/suppliers/1", {"name": "X"}),
        ("PATCH", "/suppliers/1/rate", {"monthly_rate": 5}),
        ("PATCH", "/suppliers/1/status", {"status": "suspended"}),
        ("DELETE", "/suppliers/1", None),
    ],
)
async def test_the_whole_directory_needs_a_session_and_nothing_changes_without_one(async_client, suppliers_db, method, path, body):
    before = suppliers_db.all()

    response = await async_client.request(method, path, json=body)

    assert response.status_code == 401
    assert suppliers_db.all() == before


async def test_a_removed_supplier_can_no_longer_be_changed(authed_client, suppliers_db):
    await authed_client.delete("/suppliers/3")

    for method, path, body in (
        ("PATCH", "/suppliers/3", {"name": "X"}),
        ("PATCH", "/suppliers/3/rate", {"monthly_rate": 5}),
        ("PATCH", "/suppliers/3/status", {"status": "suspended"}),
    ):
        assert (await authed_client.request(method, path, json=body)).status_code == 404
    assert len(suppliers_db) == 14


@pytest.mark.ai_suggested
@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING: the dedicated rate endpoint stamps updated_at even when the rate is unchanged, while "
    "PATCH /suppliers/{id} does not. The schema says the stamp follows changes of the rate.",
)
async def test_sending_the_rate_a_supplier_already_has_does_not_move_the_timestamp(authed_client, suppliers_db):
    original = stored(1).updated_at

    await authed_client.patch("/suppliers/1/rate", json={"monthly_rate": 1200.0})

    assert stored(1).updated_at == original
