"""Read caches (``core/cache.py``): expiry, size bound, invalidation on writes and who may read from them.

The rules under test come from CACHING_REPORT.md:

* every entry expires (TTL) and the size is bounded (LRU);
* a committed write drops the cached reads it affects, so a user sees their own change at once;
* the cache never lets an unauthenticated request through, and the write paths never read from it.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter
from sqlmodel import Session, SQLModel
from tinydb import TinyDB

from conftest import ALICE, BOB, headers_for, uuid_of
from core.cache import _MISSING, TTLCache, cached_json, invalidate, user_key
from incidents import incident_router, incident_store as store
from inventory import models
from inventory.database import build_engine, get_db
from main import app

INCIDENTS = "/api/incidents"
NEW_INCIDENT = {
    "title": "VPN drops",
    "description": "VPN drops every ten minutes",
    "category": "TECHNICAL",
    "origin": "customer",
    "branch": "central",
}


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


# --- the cache itself -----------------------------------------------------------------------------------------------


def test_an_entry_expires_when_its_ttl_has_passed():
    clock = FakeClock()
    cache = TTLCache("t.expiry", group="t", ttl=10, clock=clock)
    cache.set("k", "v")
    clock.advance(9.9)
    assert cache.get("k") == "v"
    clock.advance(0.2)
    assert cache.get("k") is _MISSING and len(cache) == 0  # an expired entry is removed when it is read


def test_a_cache_without_a_ttl_is_refused():
    with pytest.raises(ValueError):
        TTLCache("t.nottl", group="t", ttl=0)


def test_the_least_recently_used_entry_is_evicted_beyond_maxsize():
    cache = TTLCache("t.lru", group="t", ttl=60, maxsize=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")  # "a" is now the most recently used
    cache.set("c", 3)
    assert cache.get("b") is _MISSING and len(cache) == 2
    assert cache.get("a") == 1 and cache.get("c") == 3


def test_invalidate_clears_only_its_group():
    mine = TTLCache("t.mine", group="g1", ttl=60)
    other = TTLCache("t.other", group="g2", ttl=60)
    mine.set("k", 1)
    other.set("k", 1)
    invalidate("g1")
    assert len(mine) == 0 and len(other) == 1


def test_a_value_built_before_an_invalidation_is_not_stored_after_it():
    """A slow read that started before a write must not put its old data back once the write cleared the cache."""
    cache = TTLCache("t.race", group="t", ttl=60)
    generation = cache.generation
    cache.clear()  # the write happens while the read is still building
    cache.set("k", "stale", generation=generation)
    assert len(cache) == 0


def test_cached_json_builds_once_and_reports_hit_or_miss():
    cache = TTLCache("t.json", group="t", ttl=60)
    calls = []
    build = lambda: calls.append(1) or {"n": len(calls)}  # noqa: E731
    adapter = TypeAdapter(dict)
    first = cached_json(cache, "k", build, adapter)
    second = cached_json(cache, "k", build, adapter)
    assert (first.headers["x-cache"], second.headers["x-cache"]) == ("MISS", "HIT")
    assert first.body == second.body == b'{"n":1}' and len(calls) == 1


def test_a_user_scoped_key_never_collides_between_users():
    assert user_key(uuid_of(ALICE), "orders") != user_key(uuid_of(BOB), "orders")


# --- incidents ------------------------------------------------------------------------------------------------------


@pytest.fixture()
def incidents_db(tmp_path, monkeypatch):
    database = TinyDB(tmp_path / "incidents-db.json")
    monkeypatch.setattr(store, "_db", database)
    yield database
    database.close()


@pytest.fixture()
def client(incidents_db, auth_headers) -> TestClient:
    return TestClient(app, headers=auth_headers)


def create_incident(client, **overrides) -> dict:
    response = client.post(INCIDENTS, json={**NEW_INCIDENT, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def cache_state(response) -> str:
    return response.headers.get("x-cache", "-")


@pytest.mark.parametrize("path", ["/summary", "/facets", ""])
def test_the_incident_reads_are_served_from_the_cache_the_second_time(client, path):
    create_incident(client)
    first, second = client.get(INCIDENTS + path), client.get(INCIDENTS + path)
    assert (cache_state(first), cache_state(second)) == ("MISS", "HIT")
    assert first.json() == second.json()


def test_creating_an_incident_is_visible_in_the_summary_immediately(client):
    create_incident(client)
    assert client.get(f"{INCIDENTS}/summary").json()["total"] == 1
    assert cache_state(client.get(f"{INCIDENTS}/summary")) == "HIT"  # warm
    create_incident(client, title="Second incident")
    after = client.get(f"{INCIDENTS}/summary")
    assert cache_state(after) == "MISS" and after.json()["total"] == 2


def test_a_status_change_is_visible_in_summary_and_list_immediately(client):
    incident = create_incident(client)
    assert client.get(f"{INCIDENTS}/summary").json()["status_counts"]["open"] == 1
    assert client.get(INCIDENTS).json()["items"][0]["status"] == "open"
    client.patch(f"{INCIDENTS}/{incident['id']}/status", json={"status": "in_progress"})
    assert client.get(f"{INCIDENTS}/summary").json()["status_counts"]["in_progress"] == 1
    assert client.get(INCIDENTS).json()["items"][0]["status"] == "in_progress"


def test_an_edit_that_adds_a_branch_is_visible_in_the_facets_immediately(client):
    incident = create_incident(client)
    assert client.get(f"{INCIDENTS}/facets").json()["branches"] == ["central"]
    client.patch(f"{INCIDENTS}/{incident['id']}", json={"origin": "branch", "branch": "Valencia Centro"})
    assert client.get(f"{INCIDENTS}/facets").json()["branches"] == ["Valencia Centro"]


def test_different_filters_are_different_cache_entries(client):
    create_incident(client)
    moved = create_incident(client, title="Another")
    client.patch(f"{INCIDENTS}/{moved['id']}/status", json={"status": "discarded", "discard_reason": "Duplicate report"})
    everything = client.get(f"{INCIDENTS}/summary").json()["total"]
    only_open = client.get(f"{INCIDENTS}/summary", params={"status": "open"}).json()["total"]
    assert (everything, only_open) == (2, 1)
    assert client.get(f"{INCIDENTS}/summary", params={"status": "open"}).json()["total"] == 1  # still its own entry


def test_a_failed_write_changes_nothing_and_keeps_serving_the_cache(client):
    create_incident(client)
    client.get(f"{INCIDENTS}/summary")
    assert client.post(INCIDENTS, json={"title": "x"}).status_code == 422
    assert cache_state(client.get(f"{INCIDENTS}/summary")) == "HIT"


def test_a_warm_cache_never_answers_an_unauthenticated_request(client):
    create_incident(client)
    assert client.get(f"{INCIDENTS}/summary").status_code == 200  # warm it
    for path in ("/summary", "/facets", ""):
        anonymous = TestClient(app).get(INCIDENTS + path)
        assert anonymous.status_code == 401 and "x-cache" not in anonymous.headers


def test_a_write_made_outside_the_api_is_seen_only_after_the_ttl(client, incidents_db, monkeypatch):
    """The documented trade-off: out-of-process writes (e.g. the CSV seed script) are bounded by the TTL, not instant."""
    clock = FakeClock()
    monkeypatch.setattr(incident_router.SUMMARY_CACHE, "_clock", clock)
    original = create_incident(client)
    assert client.get(f"{INCIDENTS}/summary").json()["total"] == 1
    incidents_db.insert({**store.get(original["id"]), "id": "NXV-900001"})  # raw write: nothing invalidates
    stale = client.get(f"{INCIDENTS}/summary")
    assert cache_state(stale) == "HIT" and stale.json()["total"] == 1  # stale, inside the TTL
    clock.advance(incident_router.SUMMARY_CACHE.ttl + 1)
    fresh = client.get(f"{INCIDENTS}/summary")
    assert cache_state(fresh) == "MISS" and fresh.json()["total"] == 2  # fresh once it has expired


# --- inventory ------------------------------------------------------------------------------------------------------


@pytest.fixture()
def engine(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'inventory.sqlite'}")
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def stock_client(engine, auth_headers):
    def _session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = _session
    yield TestClient(app, headers=auth_headers)
    app.dependency_overrides.pop(get_db, None)


def new_asset(client, sku="NXV-CCH-001", **overrides) -> dict:
    body = {"name": "Monitor", "sku": sku, "category": "peripherals", "office": "Valencia", **overrides}
    response = client.post("/inventory/products", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def inbound(client, asset_id, quantity=10, office="Valencia"):
    body = {"asset_id": asset_id, "quantity": quantity, "supplier": "TechDistrib", "office": office}
    return client.post("/inventory/orders/inbound", json=body)


def outbound(client, asset_id, quantity=1):
    body = {"asset_id": asset_id, "quantity": quantity, "exit_type": "consumption", "assigned_to": None, "office": "Valencia"}
    return client.post("/inventory/orders/outbound", json=body)


def stock_of(client, asset_id) -> int:
    return next(a["current_stock"] for a in client.get("/inventory/products").json() if a["id"] == asset_id)


def test_the_inventory_reads_are_served_from_the_cache_the_second_time(stock_client):
    new_asset(stock_client)
    for path in ("/inventory/products", "/inventory/orders"):
        first, second = stock_client.get(path), stock_client.get(path)
        assert (cache_state(first), cache_state(second)) == ("MISS", "HIT")
        assert first.json() == second.json()


def test_an_inbound_order_updates_the_cached_stock_and_orders_at_once(stock_client):
    asset = new_asset(stock_client)
    assert stock_of(stock_client, asset["id"]) == 0
    assert stock_client.get("/inventory/orders").json() == []
    assert inbound(stock_client, asset["id"], 10).status_code == 201
    assert stock_of(stock_client, asset["id"]) == 10
    assert len(stock_client.get("/inventory/orders").json()) == 1


def test_an_outbound_order_updates_the_cached_stock_at_once(stock_client):
    asset = new_asset(stock_client)
    inbound(stock_client, asset["id"], 10)
    assert stock_of(stock_client, asset["id"]) == 10  # warm
    assert outbound(stock_client, asset["id"], 4).status_code == 201
    assert stock_of(stock_client, asset["id"]) == 6


def test_creating_an_asset_shows_up_in_the_cached_catalogue_at_once(stock_client):
    assert stock_client.get("/inventory/products").json() == []
    new_asset(stock_client)
    assert len(stock_client.get("/inventory/products").json()) == 1


def test_the_outbound_stock_check_reads_the_database_not_the_cache(stock_client, engine):
    """A stale cached stock must never decide whether an exit is allowed."""
    asset = new_asset(stock_client)
    assert stock_of(stock_client, asset["id"]) == 0  # the cache now says 0
    with Session(engine) as session:  # units arrive by a path that does not invalidate (another worker)
        session.add(models.AssetEntry(asset_id=asset["id"], quantity=5, supplier="X", office="Valencia", user_uuid=str(uuid_of(ALICE))))
        session.commit()
    assert stock_of(stock_client, asset["id"]) == 0  # still stale, inside the TTL
    assert outbound(stock_client, asset["id"], 3).status_code == 201  # the real stock (5) decides, not the cached 0
    assert outbound(stock_client, asset["id"], 3).status_code == 400  # and the real stock (2) refuses this one


def test_orders_are_cached_per_office_and_type(stock_client):
    asset = new_asset(stock_client)
    inbound(stock_client, asset["id"], 10)
    outbound(stock_client, asset["id"], 2)
    assert len(stock_client.get("/inventory/orders").json()) == 2
    assert [o["type"] for o in stock_client.get("/inventory/orders", params={"type": "outbound"}).json()] == ["outbound"]
    assert len(stock_client.get("/inventory/orders", params={"office": "Miami"}).json()) == 0
    assert len(stock_client.get("/inventory/orders").json()) == 2  # the first answer was not overwritten


def test_a_single_asset_is_not_cached(stock_client):
    """The order forms read ``GET /products/{id}`` right before and after registering an order."""
    asset = new_asset(stock_client)
    response = stock_client.get(f"/inventory/products/{asset['id']}")
    assert response.status_code == 200 and "x-cache" not in response.headers


def test_the_inventory_cache_rejects_anonymous_requests_when_warm(stock_client):
    new_asset(stock_client)
    stock_client.get("/inventory/products")
    assert TestClient(app).get("/inventory/products").status_code == 401
    assert TestClient(app, headers=headers_for(BOB)).get("/inventory/products").status_code == 200
