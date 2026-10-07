"""Safe error text for logs and HTTP bodies.

Never put connection strings, secret keys, or internal filesystem paths
into client-facing messages.
"""
from __future__ import annotations

import logging
import re
from typing import Callable, TypeVar

logger = logging.getLogger("brasaland.safe_errors")

T = TypeVar("T")

_SENSITIVE = re.compile(
    r"""
    (?:postgres(?:ql)?|mysql|mongodb|redis|amqp|http|https)://[^\s'"]+
    |(?:api[_-]?key|secret|password|token|authorization)\s*[=:]\s*\S+
    |(?:sk-|gsk_|Bearer\s+)[A-Za-z0-9_\-\.]+
    |(?:/Users/|/home/|/var/folders/|\\\\[A-Za-z])
    |(?:supabase\.co|amazonaws\.com)
    |(?:BEGIN (?:RSA )?PRIVATE KEY)
    """,
    re.IGNORECASE | re.VERBOSE,
)


class ExternalServiceError(Exception):
    """Third-party call failed. ``str()`` is always safe to show or store."""

    def __init__(self, service: str) -> None:
        self.service = service
        super().__init__(f"{service} is unavailable")


def looks_sensitive(text: str) -> bool:
    if not text or not text.strip():
        return True
    lowered = text.lower()
    if "traceback (most recent call last)" in lowered or 'file "' in lowered:
        return True
    return _SENSITIVE.search(text) is not None


def public_error_text(text: object, fallback: str) -> str:
    if not isinstance(text, str) or looks_sensitive(text):
        return fallback
    stripped = text.strip()
    if len(stripped) > 180:
        return fallback
    return stripped


def call_external(service: str, operation: Callable[[], T]) -> T:
    """Run one third-party call; map any failure to ExternalServiceError."""
    try:
        return operation()
    except ExternalServiceError:
        raise
    except Exception as error:
        logger.exception("%s request failed", service)
        raise ExternalServiceError(service) from error
