"""The inventory API (/inventory): assets, inbound/outbound orders and the derived stock.

Each test runs against a throw-away SQLite database (same SQLModel code, same constraints) and
the isolated TinyDB users of conftest. The rules under test come from the Hito 5 CONTEXT:

* stock is never stored or settable: it is entries minus exits;
* an outbound order above the stock answers 400 and writes nothing;
* ``assigned_to`` is required for an allocation and null for a consumption;
* every order is stamped with the TinyDB user who made it;
* reads do not fire one query per row (N+1).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel

from conftest import ALICE, BOB, headers_for, uuid_of
from core import config
from inventory import models, seeding, service
from inventory.database import build_engine, get_db
from inventory.schemas import AssetCreate
from main import app


@pytest.fixture()
def engine(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'inventory.sqlite'}")
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture()
def client(engine, auth_headers):
    def _session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = _session
    yield TestClient(app, headers=auth_headers)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def seeded(client, session):
    seeding.seed_inventory(session, user_uuid=str(uuid_of(ALICE)))
    return client


def stock_by_sku(client) -> dict[str, int]:
    return {a["sku"]: a["current_stock"] for a in client.get("/inventory/products").json()}


def new_asset(client, sku="NXV-TST-001", **overrides) -> dict:
    body = {"name": "Monitor 27\"", "sku": sku, "category": "peripherals", "office": "Valencia", **overrides}
    response = client.post("/inventory/products", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def inbound(client, asset_id, quantity=10, **overrides):
    body = {"asset_id": asset_id, "quantity": quantity, "supplier": "TechDistrib Valencia S.L.", "office": "Valencia", **overrides}
    return client.post("/inventory/orders/inbound", json=body)


def outbound(client, asset_id, quantity=1, exit_type="consumption", assigned_to=None, **overrides):
    body = {"asset_id": asset_id, "quantity": quantity, "exit_type": exit_type, "assigned_to": assigned_to, "office": "Valencia", **overrides}
    return client.post("/inventory/orders/outbound", json=body)


# --- seed and derived stock ---------------------------------------------------------------------

def test_the_seeded_stock_is_entries_minus_exits(seeded):
    assert stock_by_sku(seeded) == {
        "NXV-IT-001": 12,  # 10 + 5 received, 3 allocated
        "NXV-IT-002": 5,  # 6 received, 1 allocated
        "NXV-PER-001": 26,  # 30 received, 4 allocated
        "NXV-PER-002": 25,
        "NXV-OFF-001": 80,  # 100 received, 20 consumed
        "NXV-TRN-001": 40,
    }


def test_seeding_twice_changes_nothing_and_reset_reloads_it(session, seeded):
    assert seeding.seed_inventory(session, user_uuid=str(uuid_of(ALICE))) == (0, 0, 0)
    assert len(seeded.get("/inventory/products").json()) == 6
    assert seeding.seed_inventory(session, user_uuid=str(uuid_of(ALICE)), reset=True) == (6, 7, 4)
    assert len(seeded.get("/inventory/products").json()) == 6


def test_the_seed_has_the_orders_the_context_asks_for(seeded):
    orders = seeded.get("/inventory/orders").json()
    inbound_orders = [o for o in orders if o["type"] == "inbound"]
    outbound_orders = [o for o in orders if o["type"] == "outbound"]
    assert len([o for o in inbound_orders if o["asset"]["sku"] == "NXV-IT-001"]) >= 2
    assert len(inbound_orders) >= 4 and len(outbound_orders) >= 3
    assert any(o["exit_type"] == "allocation" and o["assigned_to"] for o in outbound_orders)
    assert any(o["exit_type"] == "consumption" and o["assigned_to"] is None for o in outbound_orders)


# --- assets -------------------------------------------------------------------------------------

def test_a_new_asset_starts_with_no_stock_and_shows_every_field(client):
    asset = new_asset(client)
    assert asset == {
        "id": asset["id"], "name": "Monitor 27\"", "sku": "NXV-TST-001",
        "category": "peripherals", "office": "Valencia", "current_stock": 0,
    }
    assert client.get(f"/inventory/products/{asset['id']}").json() == asset


def test_an_asset_with_an_existing_sku_is_a_conflict(client):
    new_asset(client, sku="NXV-DUP-001")
    response = client.post("/inventory/products", json={"name": "Otro", "sku": "NXV-DUP-001", "category": "hardware", "office": "Miami"})
    assert response.status_code == 409
    assert len(client.get("/inventory/products").json()) == 1


@pytest.mark.parametrize("change", [
    {"category": "furniture"}, {"office": "Madrid"}, {"name": "   "}, {"sku": ""}, {"name": None},
])
def test_an_asset_with_an_unknown_category_or_office_or_blank_text_is_refused(client, change):
    body = {"name": "Silla", "sku": "NXV-X-1", "category": "hardware", "office": "Valencia", **change}
    assert client.post("/inventory/products", json=body).status_code == 422
    assert client.get("/inventory/products").json() == []


def test_an_unknown_asset_is_not_found(client):
    assert client.get("/inventory/products/999").status_code == 404


def test_products_can_be_filtered_by_office_and_category(seeded):
    miami = seeded.get("/inventory/products", params={"office": "Miami"}).json()
    assert {a["sku"] for a in miami} == {"NXV-IT-002", "NXV-PER-002"}
    hardware = seeded.get("/inventory/products", params={"category": "hardware"}).json()
    assert {a["sku"] for a in hardware} == {"NXV-IT-001", "NXV-IT-002"}


# --- the stock cannot be set, only moved by orders ----------------------------------------------

def test_stock_in_a_request_body_is_ignored(client):
    asset = client.post(
        "/inventory/products",
        json={"name": "Ratón", "sku": "NXV-S-1", "category": "peripherals", "office": "Miami", "current_stock": 500},
    ).json()
    assert asset["current_stock"] == 0


def test_there_is_no_route_to_edit_an_asset_or_an_order(client):
    asset = new_asset(client)
    for method in ("put", "patch", "delete"):
        response = client.request(method.upper(), f"/inventory/products/{asset['id']}", json={"current_stock": 99})
        assert response.status_code == 405
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 0
    assert client.delete("/inventory/orders/1").status_code == 404
    assert client.patch("/inventory/orders/inbound", json={}).status_code == 405


def test_stock_is_not_a_column_of_any_table():
    for table in SQLModel.metadata.tables.values():
        assert "current_stock" not in table.columns
        assert "stock" not in table.columns


def test_entries_add_and_exits_remove_stock(client):
    asset = new_asset(client)
    assert inbound(client, asset["id"], 10).status_code == 201
    assert inbound(client, asset["id"], 5).status_code == 201
    assert outbound(client, asset["id"], 4, exit_type="allocation", assigned_to="Ana").status_code == 201
    assert outbound(client, asset["id"], 6).status_code == 201
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 5


# --- outbound orders above the stock ------------------------------------------------------------

def test_an_outbound_order_above_the_stock_is_refused_with_400_and_writes_nothing(client):
    asset = new_asset(client, name="Hub USB-C")
    inbound(client, asset["id"], 3)
    response = outbound(client, asset["id"], 4)
    assert response.status_code == 400
    assert response.json()["detail"] == "Insufficient stock for asset 'Hub USB-C'. Available: 3, requested: 4."
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 3
    assert [o["type"] for o in client.get("/inventory/orders").json()] == ["inbound"]


def test_an_outbound_order_for_exactly_the_stock_is_allowed_and_leaves_zero(client):
    asset = new_asset(client)
    inbound(client, asset["id"], 3)
    assert outbound(client, asset["id"], 3).status_code == 201
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 0
    assert outbound(client, asset["id"], 1).status_code == 400


def test_an_asset_that_never_had_stock_cannot_be_given_out(client):
    asset = new_asset(client)
    response = outbound(client, asset["id"], 1)
    assert response.status_code == 400
    assert "Available: 0, requested: 1" in response.json()["detail"]


# --- assigned_to follows exit_type --------------------------------------------------------------

def test_an_allocation_without_assigned_to_is_refused(client):
    asset = new_asset(client)
    inbound(client, asset["id"], 5)
    for missing in (None, "", "   "):
        assert outbound(client, asset["id"], 1, exit_type="allocation", assigned_to=missing).status_code == 422
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 5


def test_a_consumption_with_assigned_to_is_refused(client):
    asset = new_asset(client)
    inbound(client, asset["id"], 5)
    assert outbound(client, asset["id"], 1, exit_type="consumption", assigned_to="Ana").status_code == 422


def test_an_allocation_keeps_who_got_it_and_a_consumption_has_nobody(client):
    asset = new_asset(client)
    inbound(client, asset["id"], 5)
    allocation = outbound(client, asset["id"], 1, exit_type="allocation", assigned_to="  Ana Pérez ").json()
    consumption = outbound(client, asset["id"], 1, exit_type="consumption").json()
    assert (allocation["exit_type"], allocation["assigned_to"]) == ("allocation", "Ana Pérez")
    assert (consumption["exit_type"], consumption["assigned_to"]) == ("consumption", None)


# --- order input --------------------------------------------------------------------------------

@pytest.mark.parametrize("quantity", [0, -3, 1.5, "x", None])
def test_a_quantity_must_be_a_positive_integer(client, quantity):
    asset = new_asset(client)
    inbound(client, asset["id"], 5)
    assert inbound(client, asset["id"], quantity).status_code == 422
    assert outbound(client, asset["id"], quantity).status_code == 422
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 5


def test_an_order_for_an_unknown_asset_is_not_found(client):
    assert inbound(client, 999).status_code == 404
    assert outbound(client, 999).status_code == 404


def test_an_inbound_order_needs_a_supplier_and_a_known_office(client):
    asset = new_asset(client)
    assert inbound(client, asset["id"], supplier="  ").status_code == 422
    assert inbound(client, asset["id"], office="Madrid").status_code == 422
    assert client.get("/inventory/orders").json() == []


# --- office: the partition key ------------------------------------------------------------------

def test_an_order_from_another_office_than_the_assets_is_refused(client):
    asset = new_asset(client, office="Valencia")
    inbound(client, asset["id"], 5)
    for response in (inbound(client, asset["id"], 1, office="Miami"), outbound(client, asset["id"], 1, office="Miami")):
        assert response.status_code == 422
        assert "belongs to the Valencia office" in response.json()["detail"]
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 5
    assert len(client.get("/inventory/orders").json()) == 1


def test_stock_only_counts_the_orders_of_the_assets_own_office(client, session):
    asset = new_asset(client, office="Valencia")
    inbound(client, asset["id"], 5)
    # Rows that could only get here by bypassing the API (a manual insert, an old import).
    session.add(models.AssetEntry(asset_id=asset["id"], quantity=100, supplier="X", office="Miami", user_uuid="u"))
    session.add(models.AssetExit(asset_id=asset["id"], quantity=2, exit_type="consumption", office="Miami", user_uuid="u"))
    session.commit()
    assert client.get(f"/inventory/products/{asset['id']}").json()["current_stock"] == 5


def test_both_offices_keep_separate_stock_in_the_same_tables(seeded):
    stock = stock_by_sku(seeded)
    assert stock["NXV-IT-001"] == 12 and stock["NXV-IT-002"] == 5  # same product, one asset per office
    assert outbound(seeded, 2, 6, exit_type="allocation", assigned_to="John", office="Miami").status_code == 400


# --- traceability to the TinyDB user ------------------------------------------------------------

def test_every_order_carries_the_id_of_the_user_who_made_it(client):
    asset = new_asset(client)
    made_by_alice = inbound(client, asset["id"], 5).json()
    made_by_bob = client.post(
        "/inventory/orders/outbound",
        json={"asset_id": asset["id"], "quantity": 1, "exit_type": "consumption", "office": "Valencia"},
        headers=headers_for(BOB),
    ).json()
    assert made_by_alice["user_uuid"] == str(uuid_of(ALICE))
    assert made_by_bob["user_uuid"] == str(uuid_of(BOB))


def test_a_user_uuid_in_the_body_cannot_impersonate_somebody_else(client):
    asset = new_asset(client)
    order = inbound(client, asset["id"], 5, user_uuid=str(uuid_of(BOB))).json()
    assert order["user_uuid"] == str(uuid_of(ALICE))


# --- listing orders -----------------------------------------------------------------------------

def test_orders_list_inbound_and_outbound_with_their_asset(seeded):
    orders = seeded.get("/inventory/orders").json()
    assert len(orders) == 11
    first = next(o for o in orders if o["type"] == "outbound" and o["exit_type"] == "allocation")
    assert set(first["asset"]) == {"id", "name", "sku", "category", "office"}
    assert first["created_at"] and first["office"] in {"Valencia", "Miami"}
    assert [o["created_at"] for o in orders] == sorted((o["created_at"] for o in orders), reverse=True)


def test_orders_can_be_filtered_by_office_and_by_type(seeded):
    miami = seeded.get("/inventory/orders", params={"office": "Miami"}).json()
    assert miami and all(o["office"] == "Miami" for o in miami)
    outbound_only = seeded.get("/inventory/orders", params={"type": "outbound"}).json()
    assert len(outbound_only) == 4 and all(o["type"] == "outbound" for o in outbound_only)
    assert seeded.get("/inventory/orders", params={"type": "sideways"}).status_code == 422


# --- N+1 ----------------------------------------------------------------------------------------

def count_statements(engine):
    statements: list[str] = []

    def record(_conn, _cursor, statement, *_rest):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    return statements


def test_listing_products_is_one_query_however_many_assets_there_are(client, engine):
    for n in range(12):
        asset = new_asset(client, sku=f"NXV-N1-{n:03d}")
        inbound(client, asset["id"], 5)
    statements = count_statements(engine)
    assert len(client.get("/inventory/products").json()) == 12
    assert len(statements) == 1


def test_listing_orders_is_two_queries_however_many_orders_there_are(client, engine):
    asset = new_asset(client)
    inbound(client, asset["id"], 100)
    for _ in range(15):
        inbound(client, asset["id"], 1)
        outbound(client, asset["id"], 1)
    statements = count_statements(engine)
    assert len(client.get("/inventory/orders").json()) == 31
    assert len(statements) == 2  # entries JOIN assets, exits JOIN assets


# --- the database enforces what the API promises ------------------------------------------------

def test_the_database_itself_refuses_an_order_for_an_asset_that_does_not_exist(session):
    session.add(models.AssetEntry(asset_id=404, quantity=1, supplier="X", office="Valencia", user_uuid="u"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_the_database_itself_refuses_zero_quantities_and_inconsistent_exits(session):
    asset = service.create_asset(session, AssetCreate(name="Papel", sku="NXV-DB-1", category="office_supplies", office="Miami"))
    bad_rows = [
        models.AssetEntry(asset_id=asset.id, quantity=0, supplier="X", office="Miami", user_uuid="u"),
        models.AssetExit(asset_id=asset.id, quantity=-1, exit_type="consumption", office="Miami", user_uuid="u"),
        models.AssetExit(asset_id=asset.id, quantity=1, exit_type="allocation", assigned_to=None, office="Miami", user_uuid="u"),
        models.AssetExit(asset_id=asset.id, quantity=1, exit_type="consumption", assigned_to="Ana", office="Miami", user_uuid="u"),
    ]
    for row in bad_rows:
        session.add(row)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()


def test_the_asset_sku_is_unique_in_the_database(session):
    session.add(models.Asset(name="A", sku="NXV-U-1", category="hardware", office="Miami"))
    session.commit()
    session.add(models.Asset(name="B", sku="NXV-U-1", category="hardware", office="Miami"))
    with pytest.raises(IntegrityError):
        session.commit()


# --- access and wiring --------------------------------------------------------------------------

@pytest.mark.parametrize("method, path", [
    ("get", "/inventory/products"), ("post", "/inventory/products"), ("get", "/inventory/products/1"),
    ("post", "/inventory/orders/inbound"), ("post", "/inventory/orders/outbound"), ("get", "/inventory/orders"),
])
def test_every_inventory_route_needs_a_session(engine, method, path):
    app.dependency_overrides[get_db] = lambda: Session(engine)
    try:
        response = TestClient(app).request(method.upper(), path, json={})
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401


def test_all_inventory_routes_live_under_the_inventory_prefix():
    paths = {path for path in app.openapi()["paths"] if "inventory" in path}
    assert paths == {
        "/inventory/products", "/inventory/products/{asset_id}", "/inventory/orders/inbound",
        "/inventory/orders/outbound", "/inventory/orders",
    }


def test_the_inventory_has_no_users_table_and_orders_reference_users_by_plain_uuid():
    assert set(SQLModel.metadata.tables) == {"assets", "asset_entries", "asset_exits"}
    for name in ("asset_entries", "asset_exits"):
        assert not SQLModel.metadata.tables[name].c.user_uuid.foreign_keys


def test_startup_initialises_both_connections(engine, monkeypatch):
    from inventory import database

    opened = []
    monkeypatch.setattr(database, "get_tinydb", lambda: opened.append("tinydb"))
    monkeypatch.setattr(database, "get_engine", lambda: engine)
    database.init_db()
    assert opened == ["tinydb"]
    assert {"assets", "asset_entries", "asset_exits"} <= set(SQLModel.metadata.tables)


# --- configuration ------------------------------------------------------------------------------

def test_database_url_defaults_to_a_local_sqlite_file(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert config.get_database_url().startswith("sqlite:///")
    assert config.uses_local_inventory_db()


@pytest.mark.parametrize("given, expected", [
    ("postgres://u:p@host:6543/postgres", "postgresql+psycopg2://u:p@host:6543/postgres"),
    ("postgresql://u:p@host:6543/postgres", "postgresql+psycopg2://u:p@host:6543/postgres"),
    ("postgresql+psycopg2://u:p@host:6543/postgres", "postgresql+psycopg2://u:p@host:6543/postgres"),
])
def test_a_supabase_url_is_normalised_for_the_installed_driver(monkeypatch, given, expected):
    monkeypatch.setenv("DATABASE_URL", given)
    assert config.get_database_url() == expected
    assert not config.uses_local_inventory_db()


@pytest.mark.parametrize("password, encoded, decoded", [
    ("p@ss#w/rd:1?x", "p%40ss%23w%2Frd%3A1%3Fx", "p@ss#w/rd:1?x"),  # written as it is
    ("p%40ss%23w", "p%40ss%23w", "p@ss#w"),  # already percent-encoded: left alone
    ("plain123", "plain123", "plain123"),
])
def test_special_characters_in_the_password_do_not_break_the_url(monkeypatch, password, encoded, decoded):
    host = "aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
    monkeypatch.setenv("DATABASE_URL", f"postgresql://postgres.ref:{password}@{host}")
    url = config.get_database_url()
    assert url == f"postgresql+psycopg2://postgres.ref:{encoded}@{host}"
    parsed = make_url(url)
    assert (parsed.username, parsed.password) == ("postgres.ref", decoded)
    assert (parsed.host, parsed.port, parsed.database) == ("aws-0-eu-west-1.pooler.supabase.com", 6543, "postgres")
