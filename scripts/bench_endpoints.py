"""Measure read-endpoint latency, to decide (and prove) what is worth caching.

Calls each GET endpoint REPEATS times with identical parameters, in-process (FastAPI TestClient, so
the API's own cost without network). Prints first call, median and p95 in ms, plus rows returned.
Run it twice, with CACHE_ENABLED=0 and 1, against the same data:

    S=/tmp/bench; mkdir -p $S
    INCIDENTS_DB_PATH=$S/inc.json DATABASE_URL=sqlite:///$S/inv.db USERS_DB_PATH=$S/users.json SUPPLIERS_DB_PATH=$S/sup.json \\
      CACHE_ENABLED=0 uv run --project services/api python scripts/bench_endpoints.py

Never point DATABASE_URL at the real Supabase: the script registers a user and the seeder writes rows.
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time

REPEATS = int(os.environ.get("REPEATS", "30"))

ENDPOINTS = [
    "/health",
    "/suppliers",
    "/users",
    "/profiles/me",
    "/api/incidents/summary",
    "/api/incidents",
    "/api/incidents?status=open",
    "/inventory/products",
    "/inventory/products?office=Valencia",
    "/inventory/orders",
]


def main() -> int:
    if not os.environ.get("DATABASE_URL", "").startswith("sqlite"):
        print("Set DATABASE_URL to a sqlite: URL (see the docstring).", file=sys.stderr)
        return 1
    os.environ.setdefault("SECRET_KEY", "bench-secret-not-for-production")
    os.environ.setdefault("ALGORITHM", "HS256")
    os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    from fastapi.testclient import TestClient

    import main as api

    results = {}
    with TestClient(api.app) as client:
        client.post("/users", json={"email": "bench@example.com", "password": "correct-horse-1"})
        token = client.post("/auth/login", data={"username": "bench@example.com", "password": "correct-horse-1"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        for path in ENDPOINTS:
            times, rows = [], 0
            for _ in range(REPEATS):
                start = time.perf_counter()
                response = client.get(path, headers=headers)
                times.append((time.perf_counter() - start) * 1000)
                assert response.status_code == 200, (path, response.status_code)
                body = response.json()
                rows = len(body) if isinstance(body, list) else 1
            results[path] = {"rows": rows, "first_ms": times[0], "median_ms": statistics.median(times), "p95_ms": sorted(times)[int(len(times) * 0.95) - 1]}

    print(f"CACHE_ENABLED={os.environ.get('CACHE_ENABLED', '1')}  repeats={REPEATS}")
    print(f"{'endpoint':42} {'rows':>6} {'first':>9} {'median':>9} {'p95':>9}")
    for path, r in results.items():
        print(f"{path:42} {r['rows']:>6} {r['first_ms']:>8.1f}ms {r['median_ms']:>8.1f}ms {r['p95_ms']:>8.1f}ms")
    if os.environ.get("BENCH_JSON"):
        with open(os.environ["BENCH_JSON"], "w") as handle:
            json.dump(results, handle, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
