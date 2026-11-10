from __future__ import annotations

import pytest

from services.api import telemetry_database


def test_telemetry_engine_requires_postgres_and_forces_ssl(monkeypatch):
    telemetry_database._engine_for_url.cache_clear()
    captured = {}
    sentinel = object()

    def fake_create_engine(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return sentinel

    monkeypatch.setattr(telemetry_database, "create_engine", fake_create_engine)
    monkeypatch.setenv(
        "TELEMETRY_DATABASE_URL",
        "postgresql://telemetry_user:private@example.supabase.co:5432/postgres",
    )

    assert telemetry_database.get_telemetry_engine() is sentinel
    assert captured["url"].drivername == "postgresql"
    assert captured["url"].query["sslmode"] == "require"
    assert captured["kwargs"]["pool_pre_ping"] is True
    assert captured["kwargs"]["connect_args"] == {"connect_timeout": 10}
    telemetry_database._engine_for_url.cache_clear()


def test_telemetry_engine_preserves_other_ssl_parameters(monkeypatch):
    telemetry_database._engine_for_url.cache_clear()
    captured = {}
    monkeypatch.setattr(
        telemetry_database,
        "create_engine",
        lambda url, **_kwargs: captured.setdefault("url", url),
    )
    monkeypatch.setenv(
        "TELEMETRY_DATABASE_URL",
        "postgresql://user:private@db.example:5432/postgres?sslmode=verify-full&application_name=trackflow",
    )

    engine = telemetry_database.get_telemetry_engine()

    assert engine.query["sslmode"] == "verify-full"
    assert engine.query["application_name"] == "trackflow"
    telemetry_database._engine_for_url.cache_clear()


def test_telemetry_engine_requires_url(monkeypatch):
    monkeypatch.delenv("TELEMETRY_DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="TELEMETRY_DATABASE_URL is not configured"):
        telemetry_database.get_telemetry_engine()


def test_telemetry_engine_rejects_non_postgresql_url(monkeypatch):
    telemetry_database._engine_for_url.cache_clear()
    monkeypatch.setenv("TELEMETRY_DATABASE_URL", "sqlite:///telemetry.db")
    with pytest.raises(RuntimeError, match="must use PostgreSQL"):
        telemetry_database.get_telemetry_engine()
    telemetry_database._engine_for_url.cache_clear()