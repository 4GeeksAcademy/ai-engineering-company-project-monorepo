"""In-process TTL cache for the read endpoints that are expensive and shared by every user.

Why in-process and not Redis: the app is a single process with TinyDB (see ``incidents/incident_store.py``), so
Redis would add a service to run and monitor for no extra consistency. The trade-off is explicit: with several API
workers each one has its own copy, and a write on one worker does not clear the others. The TTL is what bounds that
staleness (and the staleness of writes made out of process, like ``scripts/seed_incidents.py``).

Rules every cache here follows (see CACHING_REPORT.md):

* Every entry has a TTL, chosen from how often the underlying data changes. Nothing lives forever.
* Every cache belongs to an invalidation *group* (``"incidents"``, ``"inventory"``). The code that writes the data
  calls ``invalidate(group)`` after the write; the next read rebuilds the value.
* The size is bounded (LRU), because some keys come from user input (filters, free-text search).
* Only data that is the same for every authenticated user is cached. Authentication runs *before* the handler (it
  is a router dependency), so a warm cache never lets an anonymous request through. A response that depends on the
  caller must put the user id in its key (``user_key``); none of the cached endpoints needs it today.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from typing import Any

from fastapi import Response
from pydantic import TypeAdapter

_MISSING = object()


class TTLCache:
    """A small thread-safe LRU dictionary whose entries expire ``ttl`` seconds after they were stored."""

    def __init__(self, name: str, *, group: str, ttl: float, maxsize: int = 128, clock: Callable[[], float] = time.monotonic):
        if ttl <= 0:
            raise ValueError("A cache without a TTL would serve stale data forever")
        self.name, self.group, self.ttl, self.maxsize = name, group, ttl, maxsize
        self._clock = clock
        self._entries: OrderedDict[Hashable, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = self.misses = 0
        self.generation = 0  # bumped by clear(): a value built before the last clear() is not stored
        _REGISTRY.append(self)

    def get(self, key: Hashable) -> Any:
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry[0] > self._clock():
                self._entries.move_to_end(key)
                self.hits += 1
                return entry[1]
            if entry is not None:
                del self._entries[key]  # expired
            self.misses += 1
            return _MISSING

    def set(self, key: Hashable, value: Any, *, generation: int | None = None) -> None:
        """Store ``value``. With ``generation`` (read *before* building the value) the store is skipped if the
        cache was cleared meanwhile: a read that started before a write must not put its old data back."""
        with self._lock:
            if generation is not None and generation != self.generation:
                return
            self._entries[key] = (self._clock() + self.ttl, value)
            self._entries.move_to_end(key)
            while len(self._entries) > self.maxsize:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self.generation += 1

    def __len__(self) -> int:
        return len(self._entries)


_REGISTRY: list[TTLCache] = []


def invalidate(group: str) -> None:
    """Drop every cached value of ``group``. Call it right after the data it was built from changed."""
    for cache in _REGISTRY:
        if cache.group == group:
            cache.clear()


def clear_all() -> None:
    """Empty every cache (tests, and a handy lever for operators)."""
    for cache in _REGISTRY:
        cache.clear()


def user_key(user_id: object, *parts: Hashable) -> tuple:
    """Key for a response that depends on who asks: the user id is part of it, so one user can never read another's."""
    return ("user", str(user_id), *parts)


def cached_json(cache: TTLCache, key: Hashable, build: Callable[[], Any], adapter: TypeAdapter) -> Response:
    """The JSON of ``build()``, from ``cache`` when it is there.

    The *serialised bytes* are what is stored, so a hit skips the query, the model building and the validation and
    serialisation of the response model. ``X-Cache: HIT|MISS`` tells which one it was (and the timing middleware
    logs it). The caller's ``response_model`` stays for the OpenAPI schema.
    """
    body = cache.get(key)
    status = "HIT"
    if body is _MISSING:
        generation = cache.generation
        body = adapter.dump_json(build())
        cache.set(key, body, generation=generation)
        status = "MISS"
    return Response(content=body, media_type="application/json", headers={"X-Cache": status})
