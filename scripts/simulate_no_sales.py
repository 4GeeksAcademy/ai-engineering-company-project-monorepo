#!/usr/bin/env python3
"""Trigger a Brasaland no-sales alert without a POS feed.

The staff console at /accessible subscribes to the SSE stream. Run this
while that page is open: the banner and list update live, then clear when
you record a sale.

Examples (API already running):

    python scripts/simulate_no_sales.py quiet --location co-med-centro
    python scripts/simulate_no_sales.py resume --location co-med-centro --amount 48000
    python scripts/simulate_no_sales.py quiet --location us-mia-brickell
    python scripts/simulate_no_sales.py resume --location us-mia-brickell --amount 36.00 --currency USD
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_EMAIL = "grader.ops@brasaland.test"
DEFAULT_PASSWORD = "secret-password"


def _request(method: str, url: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"message": raw[:180]}
        return error.code, payload


def _token(base: str, email: str, password: str) -> str:
    status, payload = _request(
        "POST",
        f"{base}/auth/login",
        {"email": email, "password": password},
    )
    if status == 200 and payload.get("access_token"):
        return str(payload["access_token"])
    status, payload = _request(
        "POST",
        f"{base}/auth/register",
        {"email": email, "password": password, "name": "Ops grader"},
    )
    if status in {200, 201} and payload.get("access_token"):
        return str(payload["access_token"])
    login_status, login_payload = _request(
        "POST",
        f"{base}/auth/login",
        {"email": email, "password": password},
    )
    if login_status == 200 and login_payload.get("access_token"):
        return str(login_payload["access_token"])
    detail = payload.get("message") or payload.get("detail") or login_payload.get("message") or status
    raise SystemExit(f"Could not sign in to the staff API ({detail}).")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Simulate a Brasaland no-sales alert or a resumed sale.")
    parser.add_argument("action", choices=("quiet", "resume"))
    parser.add_argument("--location", default="co-med-centro", help="Location id from GET /locations")
    parser.add_argument("--amount", default=None, help="Sale amount when action is resume (COP or USD)")
    parser.add_argument("--currency", choices=("COP", "USD"), default=None)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    args = parser.parse_args(argv)

    base = args.api.rstrip("/")
    token = _token(base, args.email, args.password)
    body: dict = {"location_id": args.location, "action": args.action}
    if args.action == "resume":
        if args.amount:
            body["amount"] = args.amount
        if args.currency:
            body["currency"] = args.currency
    status, payload = _request("POST", f"{base}/realtime/ops-alerts/simulate", body, token)
    if status >= 400:
        message = payload.get("message") or payload.get("detail") or status
        print(message, file=sys.stderr)
        return 1
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
