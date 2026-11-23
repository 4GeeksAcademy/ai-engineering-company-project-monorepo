"""TTLCache (cache.py) and the response caches built on it: expiry, invalidation on writes, isolation."""

from __future__ import annotations

import threading

import pytest

import inventory_service
from cache import TTLCache
from tests.test_incident_manager import VALID, create
from tests.test_inventory import inbound, new_asset, outbound


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


# --- TTLCache ---------------------------------------------------------------------------------------


def test_ttl_must_be_positive():
    with pytest.raises(ValueError):
        TTLCache("x", ttl=0)


def test_second_call_is_a_hit_and_loader_runs_once():
    cache: TTLCache[int] = TTLCache("x", ttl=10)
    calls = []
    assert cache.get_or_load("k", lambda: calls.append(1) or 7) == 7
    assert cache.get_or_load("k", lambda: calls.append(1) or 8) == 7
    assert len(calls) == 1 and (cache.hits, cache.misses) == (1, 1)


def test_entry_expires_after_ttl():
    clock = Clock()
    cache: TTLCache[int] = TTLCache("x", ttl=30, clock=clock)
    values = iter([1, 2])
    assert cache.get_or_load("k", lambda: next(values)) == 1
    clock.now += 29.9
    assert cache.get_or_load("k", lambda: next(values)) == 1
    clock.now += 0.2
    assert cache.get_or_load("k", lambda: next(values)) == 2


def test_keys_do_not_share_values():
    cache: TTLCache[str] = TTLCache("x", ttl=10)
    assert cache.get_or_load(("open",), lambda: "open rows") == "open rows"
    assert cache.get_or_load(("closed",), lambda: "closed rows") == "closed rows"


def test_invalidate_drops_entries():
    cache: TTLCache[int] = TTLCache("x", ttl=10)
    cache.get_or_load("k", lambda: 1)
    cache.invalidate()
    assert len(cache) == 0
    assert cache.get_or_load("k", lambda: 2) == 2


def test_loader_that_raced_an_invalidation_does_not_store_stale_data():
    cache: TTLCache[int] = TTLCache("x", ttl=10)

    def slow_loader() -> int:
        cache.invalidate()  # a write lands while this read is still in flight
        return 1  # ...so this value is already stale

    assert cache.get_or_load("k", slow_loader) == 1  # the caller still gets its answer
    assert cache.get_or_load("k", lambda: 2) == 2  # but nobody else is served it


def test_callers_get_copies_of_lists():
    cache: TTLCache[list[int]] = TTLCache("x", ttl=10)
    first = cache.get_or_load("k", lambda: [1, 2])
    first.append(99)
    assert cache.get_or_load("k", lambda: [0]) == [1, 2]


def test_cache_is_bounded():
    cache: TTLCache[int] = TTLCache("x", ttl=10, max_entries=3)
    for key in range(10):
        cache.get_or_load(key, lambda key=key: key)
    assert len(cache) <= 3


def test_disabled_cache_always_loads(monkeypatch):
    monkeypatch.setenv("CACHE_ENABLED", "0")
    cache: TTLCache[int] = TTLCache("x", ttl=10)
    values = iter([1, 2])
    assert cache.get_or_load("k", lambda: next(values)) == 1
    assert cache.get_or_load("k", lambda: next(values)) == 2
    assert len(cache) == 0


def test_concurrent_readers_do_not_corrupt_the_cache():
    cache: TTLCache[int] = TTLCache("x", ttl=10, max_entries=4)
    errors = []

    def work(n: int) -> None:
        try:
            for i in range(200):
                cache.get_or_load(i % 6, lambda i=i: i)
                if i % 50 == 0:
                    cache.invalidate()
        except Exception as error:  # pragma: no cover
            errors.append(error)

    threads = [threading.Thread(target=work, args=(n,)) for n in range(8)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert errors == []


# --- Incident endpoints: cached reads, invalidated by every write -----------------------------------


def titles(client, query=""):
    return [item["title"] for item in client.get(f"/api/incidents{query}").json()]


def test_incident_list_is_served_from_cache(auth_client):
    create(auth_client, title="primera")
    repository = auth_client.app.state.incident_repository
    assert titles(auth_client) == ["primera"]
    # Written behind the cache's back (as another worker or a seed script would): not visible until the TTL.
    repository._table.insert({**repository._table.all()[0]})
    assert len(titles(auth_client)) == 1
    repository._list_cache.invalidate()
    assert len(titles(auth_client)) == 2


def test_creating_an_incident_invalidates_list_and_summary(auth_client):
    assert titles(auth_client) == []
    assert auth_client.get("/api/incidents/summary").json()["total"] == 0
    create(auth_client, title="nueva")
    assert titles(auth_client) == ["nueva"]
    assert auth_client.get("/api/incidents/summary").json()["total"] == 1


def test_status_change_invalidates_filtered_lists_and_summary(auth_client):
    incident = create(auth_client)
    assert len(titles(auth_client, "?status=open")) == 1
    assert titles(auth_client, "?status=in_progress") == []
    assert auth_client.get("/api/incidents/summary").json()["by_status"]["open"] == 1

    assert auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": "in_progress"}).status_code == 200

    assert titles(auth_client, "?status=open") == []
    assert len(titles(auth_client, "?status=in_progress")) == 1
    summary = auth_client.get("/api/incidents/summary").json()
    assert summary["by_status"]["open"] == 0 and summary["by_status"]["in_progress"] == 1


def test_rejected_status_change_keeps_cached_data(auth_client):
    incident = create(auth_client)
    titles(auth_client)
    repository = auth_client.app.state.incident_repository
    before = len(repository._list_cache)
    assert auth_client.patch(f"/api/incidents/{incident['id']}/status", json={"status": "resolved"}).status_code == 400
    assert len(repository._list_cache) == before  # nothing changed, nothing to invalidate


def test_cached_incident_list_still_requires_a_token(auth_client, anon_client):
    create(auth_client)
    titles(auth_client)  # warm the cache
    anon_client.headers.pop("Authorization", None)
    assert anon_client.get("/api/incidents").status_code == 401
    assert anon_client.get("/api/incidents/summary").status_code == 401


def test_mutating_a_response_does_not_poison_the_cache(auth_client):
    create(auth_client)
    repository = auth_client.app.state.incident_repository
    repository.list().clear()
    assert len(repository.list()) == 1


# --- Inventory: stock is cached for reading, never for deciding -------------------------------------


def stocks(client, query=""):
    return {a["sku"]: a["current_stock"] for a in client.get(f"/inventory/products{query}").json()}


def test_orders_and_new_assets_invalidate_the_product_list(auth_client):
    assert stocks(auth_client) == {}
    asset = new_asset(auth_client)
    assert stocks(auth_client) == {"NXV-IT-001": 0}
    assert inbound(auth_client, asset["id"], 10).status_code == 201
    assert stocks(auth_client) == {"NXV-IT-001": 10}
    assert outbound(auth_client, asset["id"], 4).status_code == 201
    assert stocks(auth_client) == {"NXV-IT-001": 6}
    assert stocks(auth_client, "?office=Valencia") == {"NXV-IT-001": 6}


def test_failed_exit_does_not_change_cached_stock(auth_client):
    asset = new_asset(auth_client)
    inbound(auth_client, asset["id"], 3)
    assert stocks(auth_client) == {"NXV-IT-001": 3}
    assert outbound(auth_client, asset["id"], 5).status_code == 400
    assert stocks(auth_client) == {"NXV-IT-001": 3}


def test_exit_check_uses_real_stock_even_if_the_cache_is_stale(auth_client):
    """A stale read cache must never let an exit through (or block one): the check reads the database."""
    asset = new_asset(auth_client)
    inbound(auth_client, asset["id"], 2)
    stocks(auth_client)  # warm the cache with the true stock (2)
    # Make the cached value lie: pretend 100 units are in stock.
    for _, cached in inventory_service._products_cache._entries.values():
        cached[0].current_stock = 100
    assert stocks(auth_client) == {"NXV-IT-001": 100}  # the read really is served from the (lying) cache
    assert outbound(auth_client, asset["id"], 5).status_code == 400


def test_product_cache_is_shared_data_only(auth_client):
    """Keys are only the office filter: the cache holds assets and stock, never anything about the caller."""
    stocks(auth_client)
    assert all(key is None or isinstance(key, inventory_service.Office) for key in inventory_service._products_cache._entries)
