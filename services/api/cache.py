"""In-process TTL cache for expensive, shared, read-mostly responses.

Rules this module enforces so callers cannot get them wrong:

* Every entry expires (`ttl` seconds, monotonic clock): nothing lives forever.
* `invalidate()` drops every entry of a cache AND bumps a generation counter. A loader
  that started before an invalidation never stores its (possibly stale) result, so a
  slow read racing a write cannot resurrect old data.
* Callers get their own copy of list values, so a route mutating its result cannot
  corrupt what the next request reads.
* Keys must be built from the request's *filters*, never from user data. Only cache
  responses that are identical for every authenticated user; per-user data (profile,
  /auth/me) must not go through here (or must put the user id in the key).
* CACHE_ENABLED=0 turns every cache into a pass-through (used to measure "before").

The cache is per process: with several workers, a write invalidates only its own
worker's cache, and the TTL bounds how stale the others can be.
"""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Callable, Hashable
from typing import Generic, TypeVar

T = TypeVar("T")

CACHE_ENABLED_ENV = "CACHE_ENABLED"


def cache_enabled() -> bool:
    return os.environ.get(CACHE_ENABLED_ENV, "1").strip().lower() not in {"0", "false", "no", "off"}


class TTLCache(Generic[T]):
    def __init__(self, name: str, ttl: float, max_entries: int = 128, clock: Callable[[], float] = time.monotonic) -> None:
        if ttl <= 0:
            raise ValueError("ttl must be positive: a cache entry without expiry is never allowed")
        self.name = name
        self.ttl = ttl
        self._max_entries = max_entries
        self._clock = clock
        self._entries: dict[Hashable, tuple[float, T]] = {}
        self._generation = 0
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get_or_load(self, key: Hashable, loader: Callable[[], T]) -> T:
        """Cached value for `key`, or `loader()` stored under it. Lists are returned as copies."""
        if not cache_enabled():
            return loader()
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry[0] > self._clock():
                self.hits += 1
                return _copy(entry[1])
            self._entries.pop(key, None)
            self.misses += 1
            generation = self._generation
        # The loader runs outside the lock so a slow query never blocks other keys.
        value = loader()
        with self._lock:
            if generation == self._generation:
                if len(self._entries) >= self._max_entries:
                    self._evict_expired_or_oldest()
                self._entries[key] = (self._clock() + self.ttl, value)
        return _copy(value)

    def invalidate(self) -> None:
        """Forget everything: call after any write that can change a cached response."""
        with self._lock:
            self._generation += 1
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    def _evict_expired_or_oldest(self) -> None:
        now = self._clock()
        for key in [key for key, (expires, _) in self._entries.items() if expires <= now]:
            del self._entries[key]
        if len(self._entries) >= self._max_entries:
            del self._entries[min(self._entries, key=lambda key: self._entries[key][0])]


def _copy(value: T) -> T:
    return list(value) if isinstance(value, list) else value  # type: ignore[return-value]
