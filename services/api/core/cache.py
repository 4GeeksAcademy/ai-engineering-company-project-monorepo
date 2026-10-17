# core/cache.py — Caché en memoria con TTL e invalidación por prefijo
import time
from typing import Any

_store: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    entry = _store.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    _store[key] = (time.time() + ttl_seconds, value)


def cache_invalidate_prefix(prefix: str) -> None:
    for key in list(_store):
        if key.startswith(prefix):
            del _store[key]