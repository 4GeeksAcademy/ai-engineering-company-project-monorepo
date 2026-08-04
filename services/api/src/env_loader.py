"""Minimal .env loader for local development.

This keeps runtime configuration simple without requiring an external dotenv
dependency. Values already present in the process environment are not
overwritten.
"""

from __future__ import annotations

import os
from pathlib import Path


_ENV_LOADED = False


def _iter_env_candidates() -> tuple[Path, ...]:
    src_dir = Path(__file__).resolve().parent
    api_root = src_dir.parent
    return (
        Path.cwd() / ".env",
        api_root / ".env",
    )


def _normalize_env_value(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def load_env_if_available() -> None:
    """Load the first available .env file into process environment."""

    global _ENV_LOADED
    if _ENV_LOADED:
        return

    for env_path in _iter_env_candidates():
        if not env_path.exists() or not env_path.is_file():
            continue

        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if "=" not in stripped:
                continue

            key, value = stripped.split("=", 1)
            normalized_key = key.strip()
            if not normalized_key:
                continue
            os.environ.setdefault(normalized_key, _normalize_env_value(value))

        _ENV_LOADED = True
        return
