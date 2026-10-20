#!/usr/bin/env python3
"""Measure the read endpoints of the running API: the same request repeated N times, like a busy dashboard.

Usage (API running, seeded with ``scripts/seed_load.py``):
    services/api/.venv/bin/python scripts/bench_endpoints.py --email dev@nexova.com --password '...'
    services/api/.venv/bin/python scripts/bench_endpoints.py --repeat 50 --label after-cache

Prints, per endpoint: the first call, the median, the p95 and the mean of the N calls, and how many answers came
from the cache (``X-Cache: HIT``). Output is Markdown, ready to paste into CACHING_REPORT.md.
"""

from __future__ import annotations

import argparse
import statistics
import time

import httpx

ENDPOINTS = [
    "/api/incidents/summary",
    "/api/incidents/facets",
    "/api/incidents?page=1&page_size=15",
    "/api/incidents?status=open&category=TECHNICAL&page=1&page_size=15",
    "/api/incidents/summary?status=open&status=in_progress",
    "/inventory/products",
    "/inventory/products?office=Valencia&category=hardware",
    "/inventory/orders",
    "/suppliers",
    "/suppliers/search/by-country?country=Spain",
    "/users/directory",
    "/profiles/me",
    "/auth/me",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--email", default="dev@nexova.com")
    parser.add_argument("--password", default="DevPass12345!")
    parser.add_argument("--repeat", type=int, default=30)
    parser.add_argument("--label", default="run")
    args = parser.parse_args()

    with httpx.Client(base_url=args.base, timeout=60) as client:
        login = client.post("/auth/login", data={"username": args.email, "password": args.password})
        login.raise_for_status()
        client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

        print(f"### {args.label} — {args.repeat} identical requests per endpoint\n")
        print("| Endpoint | 1st (ms) | median (ms) | p95 (ms) | mean (ms) | size (KB) | cache HITs |")
        print("|---|---:|---:|---:|---:|---:|---:|")
        for path in ENDPOINTS:
            times, hits, size = [], 0, 0
            for _ in range(args.repeat):
                start = time.perf_counter()
                response = client.get(path)
                times.append((time.perf_counter() - start) * 1000)
                if response.status_code != 200:
                    raise SystemExit(f"{path} -> {response.status_code}: {response.text[:200]}")
                hits += response.headers.get("X-Cache") == "HIT"
                size = len(response.content) / 1024
            p95 = sorted(times)[max(0, round(len(times) * 0.95) - 1)]
            print(f"| `{path}` | {times[0]:.1f} | {statistics.median(times):.1f} | {p95:.1f} | {statistics.mean(times):.1f} | {size:.1f} | {hits}/{args.repeat} |")


if __name__ == "__main__":
    main()
