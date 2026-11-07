"""Inventory API: derived stock, exits that exceed it, user_uuid from the token, auth and schemas.

The SQL side runs on in-memory SQLite (see conftest); TinyDB holds the users as in production.
`FOR UPDATE` row locking is a no-op on SQLite, so concurrency is checked by hand against Postgres.
"""

import pytest
from sqlalchemy import event
from sqlmodel import Session, select

import database
import inventory_models
import inventory_schemas

ASSET = {"name": 'Portátil 14" Business', "sku": "NXV-IT-001", "category": "hardware", "office": "Valencia"}


def new_asset(client, **overrides):
    response = client.post("/inventory/products", json={**ASSET, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def inbound(client, asset_id, quantity=10, **overrides):
    return client.post(
        "/inventory/orders/inbound",
        json={"asset_id": asset_id, "quantity": quantity, "supplier": "TechDistrib Valencia S.L.", "office": "Valencia", **overrides},
    )


def outbound(client, asset_id, quantity=1, **overrides):
    body = {"asset_id": asset_id, "quantity": quantity, "exit_type": "allocation", "assigned_to": "María López", "office": "Valencia"}
    return client.post("/inventory/orders/outbound", json={**body, **overrides})


def stock(client, asset_id):
    return client.get(f"/inventory/products/{asset_id}").json()["current_stock"]


def count_exits():
    with Session(database.get_engine()) as session:
        return len(session.exec(select(inventory_models.AssetExit)).all())


# --- Derived stock ----------------------------------------------------------------------------------


def test_new_asset_starts_with_zero_stock(auth_client):
    asset = new_asset(auth_client)
    assert asset["current_stock"] == 0
    assert asset["office"] == "Valencia"


def test_stock_is_entries_minus_exits(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 10)
    inbound(auth_client, asset_id, 5)
    assert outbound(auth_client, asset_id, 3).status_code == 201
    assert stock(auth_client, asset_id) == 12
    listed = {item["id"]: item for item in auth_client.get("/inventory/products").json()}
    assert listed[asset_id]["current_stock"] == 12


def test_stock_is_per_asset(auth_client):
    first = new_asset(auth_client)["id"]
    second = new_asset(auth_client, sku="NXV-IT-002", office="Miami")["id"]
    inbound(auth_client, first, 7)
    assert stock(auth_client, first) == 7
    assert stock(auth_client, second) == 0


def test_no_endpoint_edits_stock(auth_client):
    asset_id = new_asset(auth_client)["id"]
    for method in (auth_client.put, auth_client.patch):
        assert method(f"/inventory/products/{asset_id}", json={"current_stock": 99}).status_code == 405
    created = auth_client.post("/inventory/products", json={**ASSET, "sku": "NXV-IT-009", "current_stock": 99})
    assert created.status_code == 422  # write schemas reject fields they do not own


# --- Exits above the stock ----------------------------------------------------------------------------


def test_exit_above_stock_is_400_and_writes_nothing(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 5)
    before = count_exits()
    response = outbound(auth_client, asset_id, 8)
    assert response.status_code == 400
    assert response.json()["detail"] == f"Insufficient stock for asset '{ASSET['name']}'. Available: 5, requested: 8."
    assert count_exits() == before
    assert stock(auth_client, asset_id) == 5


def test_exit_of_exactly_the_stock_is_allowed(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 5)
    assert outbound(auth_client, asset_id, 5).status_code == 201
    assert stock(auth_client, asset_id) == 0


def test_exit_on_asset_without_entries_is_400(auth_client):
    asset_id = new_asset(auth_client)["id"]
    assert outbound(auth_client, asset_id, 1).status_code == 400


# --- Validation and errors ----------------------------------------------------------------------------


def test_allocation_requires_assigned_to(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 5)
    assert outbound(auth_client, asset_id, assigned_to=None).status_code == 422
    assert outbound(auth_client, asset_id, assigned_to="   ").status_code == 422


def test_consumption_must_not_have_assigned_to(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 5)
    assert outbound(auth_client, asset_id, exit_type="consumption", assigned_to="Ana").status_code == 422
    ok = outbound(auth_client, asset_id, exit_type="consumption", assigned_to=None)
    assert ok.status_code == 201
    assert ok.json()["assigned_to"] is None


@pytest.mark.parametrize("quantity", [0, -3])
def test_quantity_must_be_positive(auth_client, quantity):
    asset_id = new_asset(auth_client)["id"]
    assert inbound(auth_client, asset_id, quantity).status_code == 422
    assert outbound(auth_client, asset_id, quantity).status_code == 422


def test_duplicate_sku_is_409(auth_client):
    new_asset(auth_client)
    assert auth_client.post("/inventory/products", json=ASSET).status_code == 409


def test_unknown_asset_is_404(auth_client):
    assert auth_client.get("/inventory/products/999").status_code == 404
    assert inbound(auth_client, 999).status_code == 404
    assert outbound(auth_client, 999).status_code == 404


def test_invalid_office_and_category_are_422(auth_client):
    assert auth_client.post("/inventory/products", json={**ASSET, "office": "Madrid"}).status_code == 422
    assert auth_client.post("/inventory/products", json={**ASSET, "category": "food"}).status_code == 422


# --- Authentication and user_uuid -------------------------------------------------------------------------


def test_user_uuid_comes_from_the_token_not_the_body(anon_client):
    from conftest import login, register

    user = register(anon_client, "ops@nexova.example")
    anon_client.headers.update(login(anon_client, "ops@nexova.example"))
    asset_id = new_asset(anon_client)["id"]
    assert inbound(anon_client, asset_id, 5, user_uuid="forged-id").status_code == 422
    entry = inbound(anon_client, asset_id, 5).json()
    exit_ = outbound(anon_client, asset_id, 1).json()
    assert entry["user_uuid"] == exit_["user_uuid"] == user["id"]


def test_everything_requires_a_token(anon_client):
    calls = [
        anon_client.get("/inventory/products"),
        anon_client.post("/inventory/products", json=ASSET),
        anon_client.get("/inventory/products/1"),
        anon_client.post("/inventory/orders/inbound", json={}),
        anon_client.post("/inventory/orders/outbound", json={}),
        anon_client.get("/inventory/orders"),
    ]
    assert [call.status_code for call in calls] == [401] * 6


# --- Orders list, schemas and queries -----------------------------------------------------------------------


def test_orders_list_has_both_types_with_asset_data(auth_client):
    asset_id = new_asset(auth_client)["id"]
    inbound(auth_client, asset_id, 5)
    outbound(auth_client, asset_id, 2)
    orders = auth_client.get("/inventory/orders").json()
    assert {order["order_type"] for order in orders} == {"inbound", "outbound"}
    for order in orders:
        assert (order["asset_id"], order["asset_name"], order["asset_sku"]) == (asset_id, ASSET["name"], ASSET["sku"])
        assert "asset" not in order
        assert order["office"] == "Valencia"
        assert order["user_uuid"]


def test_orders_can_be_filtered_by_office(auth_client):
    valencia = new_asset(auth_client)["id"]
    miami = new_asset(auth_client, sku="NXV-IT-002", office="Miami")["id"]
    inbound(auth_client, valencia, 5)
    inbound(auth_client, miami, 5, office="Miami")
    orders = auth_client.get("/inventory/orders", params={"office": "Miami"}).json()
    assert [order["asset_id"] for order in orders] == [miami]
    assert [asset["id"] for asset in auth_client.get("/inventory/products", params={"office": "Miami"}).json()] == [miami]


def test_schemas_are_not_orm_models():
    schema_classes = [inventory_schemas.AssetResponse, inventory_schemas.AssetEntryResponse, inventory_schemas.AssetExitResponse]
    for schema in schema_classes:
        assert not issubclass(schema, inventory_models.SQLModel)
    assert "current_stock" in inventory_schemas.AssetResponse.model_fields
    assert "current_stock" not in inventory_models.Asset.model_fields


def _count_queries(client, path):
    statements = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    engine = database.get_engine()
    event.listen(engine, "before_cursor_execute", record)
    try:
        assert client.get(path).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", record)
    return len(statements)


def test_lists_run_a_fixed_number_of_queries(auth_client):
    def populate(count):
        for index in range(count):
            asset_id = new_asset(auth_client, sku=f"SKU-{count}-{index}")["id"]
            inbound(auth_client, asset_id, 5)
            outbound(auth_client, asset_id, 1)

    populate(2)
    few = (_count_queries(auth_client, "/inventory/products"), _count_queries(auth_client, "/inventory/orders"))
    populate(8)
    many = (_count_queries(auth_client, "/inventory/products"), _count_queries(auth_client, "/inventory/orders"))
    assert few == many
    assert many[0] == 1
    assert many[1] == 2
