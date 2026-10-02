"""Short-lived password reset tokens and Resend email delivery."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from auth.settings import _load_dotenv

RESET_TOKEN_TTL_MINUTES = 30


def reset_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_reset_token() -> str:
    return secrets.token_urlsafe(48)


def reset_expiry(now: datetime | None = None) -> datetime:
    return (now or datetime.now(timezone.utc)) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)


def _settings() -> tuple[str, str, str]:
    _load_dotenv()
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("RESEND_FROM_EMAIL")
    backoffice_url = os.getenv("BACKOFFICE_URL", "http://localhost:3002").rstrip("/")
    if not api_key or not sender:
        raise RuntimeError("Password recovery email is not configured")
    return api_key, sender, backoffice_url


def send_reset_email(email: str, token: str) -> None:
    """Send a plain, mobile-readable reset email using the Resend API."""
    api_key, sender, backoffice_url = _settings()
    reset_url = f"{backoffice_url}/reset-password?token={quote(token, safe='')}"
    body = {
        "from": sender,
        "to": [email],
        "subject": "Reset your HealthCore password",
        "text": (
            "We received a request to reset your HealthCore password.\n\n"
            f"Use this link within {RESET_TOKEN_TTL_MINUTES} minutes to choose a new password:\n"
            f"{reset_url}\n\nIf you did not request a reset, you can ignore this email."
        ),
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError("Email provider rejected the recovery message")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("Email provider could not send the recovery message") from exc
