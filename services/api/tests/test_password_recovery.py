from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import database
from auth.recovery import reset_token_hash
from conftest import auth_headers, login, register


def test_forgot_password_always_returns_same_confirmation(client, monkeypatch):
    messages = []
    monkeypatch.setattr("routes.auth.send_reset_email", lambda email, token: messages.append((email, token)))
    register(client)

    known = client.post("/auth/forgot-password", json={"email": "user@example.com"})
    unknown = client.post("/auth/forgot-password", json={"email": "missing@example.com"})

    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert "user@example.com" not in known.text
    assert len(messages) == 1
    email, token = messages[0]
    assert email == "user@example.com"
    assert token not in str(database.get_database().table(database.PASSWORD_RESET_TOKENS_TABLE).all())


def test_provider_failure_does_not_enumerate_or_leave_live_token(client, monkeypatch):
    register(client)

    def fail_delivery(email, token):
        raise RuntimeError("provider failure details must not escape")

    monkeypatch.setattr("routes.auth.send_reset_email", fail_delivery)
    response = client.post("/auth/forgot-password", json={"email": "user@example.com"})
    assert response.status_code == 200
    assert response.json() == {"message": "If that address is registered, you'll receive a link shortly."}
    assert database.get_database().table(database.PASSWORD_RESET_TOKENS_TABLE).all() == []


def test_reset_password_succeeds_once_and_changes_login(client, monkeypatch):
    register(client)
    sent = {}
    monkeypatch.setattr("routes.auth.send_reset_email", lambda email, token: sent.update(token=token))
    client.post("/auth/forgot-password", json={"email": "user@example.com"})

    response = client.post("/auth/reset-password", json={"token": sent["token"], "new_password": "New-Password-123"})
    assert response.status_code == 200
    assert client.post("/auth/login", json={"email": "user@example.com", "password": "New-Password-123"}).status_code == 200
    assert client.post("/auth/login", json={"email": "user@example.com", "password": "Correct-Horse-42"}).status_code == 401
    reused = client.post("/auth/reset-password", json={"token": sent["token"], "new_password": "Another-Password-123"})
    assert reused.status_code == 400


def test_reset_rejects_expired_invalid_and_superseded_tokens(client, monkeypatch):
    user = register(client)
    sent = {}
    monkeypatch.setattr("routes.auth.send_reset_email", lambda email, token: sent.update(token=token))
    client.post("/auth/forgot-password", json={"email": "user@example.com"})
    table = database.get_database().table(database.PASSWORD_RESET_TOKENS_TABLE)
    expired = table.all()[0]
    table.update({"expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()}, doc_ids=[expired.doc_id])
    expired_token = client.post("/auth/reset-password", json={"token": sent["token"], "new_password": "New-Password-123"})
    assert expired_token.status_code == 400

    first = "first-reset-token-" + "a" * 40
    second = "second-reset-token-" + "b" * 40
    database.create_password_reset_token(user["id"], reset_token_hash(first), (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat())
    database.create_password_reset_token(user["id"], reset_token_hash(second), (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat())
    assert client.post("/auth/reset-password", json={"token": first, "new_password": "New-Password-123"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": "z" * 48, "new_password": "New-Password-123"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": second, "new_password": "New-Password-123"}).status_code == 200


def test_change_password_requires_auth_and_checks_current_password(client):
    register(client)
    payload = {"current_password": "Correct-Horse-42", "new_password": "New-Password-123"}
    assert client.post("/auth/change-password", json=payload).status_code == 401
    headers = auth_headers(login(client))
    wrong = client.post("/auth/change-password", headers=headers, json={**payload, "current_password": "Wrong-Pass-123"})
    assert wrong.status_code == 400
    changed = client.post("/auth/change-password", headers=headers, json=payload)
    assert changed.status_code == 200
    assert client.post("/auth/login", json={"email": "user@example.com", "password": "New-Password-123"}).status_code == 200


def test_password_change_invalidates_reset_token(client, monkeypatch):
    register(client)
    reset_token = "reset-token-" + "r" * 40
    database.create_password_reset_token(1, reset_token_hash(reset_token), (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat())
    headers = auth_headers(login(client))
    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "Correct-Horse-42", "new_password": "New-Password-123"},
    )
    assert response.status_code == 200
    assert client.post("/auth/reset-password", json={"token": reset_token, "new_password": "Other-Password-123"}).status_code == 400


def test_reset_token_is_redeemed_only_once_under_concurrent_requests(client):
    user = register(client)
    token = "concurrent-reset-token-" + "c" * 40
    database.create_password_reset_token(
        user["id"], reset_token_hash(token), (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    )

    def redeem(password: str) -> int:
        response = client.post("/auth/reset-password", json={"token": token, "new_password": password})
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(redeem, ("First-Password-123", "Second-Password-123")))

    assert sorted(statuses) == [200, 400]
