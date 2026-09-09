"""
test_database.py — Tests unitarios para la capa de datos (database.py).

Cobertura:
- Conexión a ambas bases de datos
- Inicialización de esquemas (reporting y telemetry)
- Generación de datos de ejemplo
- Idempotencia de init_reporting_db()
- Aislamiento mediante PIPELINES_DB_DIR
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import pytest


class TestDatabaseConnections:
    """Verifica que los context managers de BD funcionan correctamente."""

    def test_get_telemetry_db_returns_connection(self, temp_db_dir):
        """Debe retornar una conexión sqlite3 válida."""
        from data.pipelines.database import get_telemetry_db

        with get_telemetry_db() as conn:
            assert isinstance(conn, sqlite3.Connection)
            # Verificar que es una conexión real consultando la tabla dummy
            result = conn.execute("SELECT 1 AS test").fetchone()
            assert result["test"] == 1

    def test_get_reporting_db_returns_connection(self, temp_db_dir):
        """Debe retornar una conexión sqlite3 válida (modo autocommit)."""
        from data.pipelines.database import get_reporting_db

        with get_reporting_db() as conn:
            assert isinstance(conn, sqlite3.Connection)
            result = conn.execute("SELECT 1 AS test").fetchone()
            assert result["test"] == 1

    def test_telemetry_db_path_respects_env_var(self, temp_db_dir):
        """La ruta de telemetry_events.db debe apuntar al directorio override."""
        from data.pipelines.database import get_telemetry_db_path

        expected_path = os.path.join(temp_db_dir, "telemetry_events.db")
        # Normalizar para comparar (resolver symlinks si es necesario)
        actual_path = get_telemetry_db_path()
        assert os.path.normpath(actual_path) == os.path.normpath(expected_path)

    def test_reporting_db_path_respects_env_var(self, temp_db_dir):
        """La ruta de reporting.db debe apuntar al directorio override."""
        from data.pipelines.database import get_reporting_db_path

        expected_path = os.path.join(temp_db_dir, "reporting.db")
        actual_path = get_reporting_db_path()
        assert os.path.normpath(actual_path) == os.path.normpath(expected_path)


class TestInitReportingDB:
    """Verifica la creación de tablas en reporting.db."""

    def test_creates_kpi_table(self, temp_db_dir):
        """Debe crear la tabla reporting_weekly_warehouse_client_performance."""
        from data.pipelines.database import init_reporting_db, get_reporting_db

        init_reporting_db()

        with get_reporting_db() as conn:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [row["name"] for row in tables]

        assert "reporting_weekly_warehouse_client_performance" in table_names

    def test_creates_pipeline_runs_table(self, temp_db_dir):
        """Debe crear la tabla reporting_pipeline_runs."""
        from data.pipelines.database import init_reporting_db, get_reporting_db

        init_reporting_db()

        with get_reporting_db() as conn:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [row["name"] for row in tables]

        assert "reporting_pipeline_runs" in table_names

    def test_idempotent_multiple_calls(self, temp_db_dir):
        """init_reporting_db() debe ser seguro llamarlo múltiples veces."""
        from data.pipelines.database import init_reporting_db

        init_reporting_db()
        init_reporting_db()
        init_reporting_db()  # No debe lanzar error

    def test_kpi_table_has_unique_constraint(self, temp_db_dir):
        """La tabla KPI debe tener UNIQUE(warehouse, client_id, week_start)."""
        from data.pipelines.database import init_reporting_db, get_reporting_db

        init_reporting_db()

        with get_reporting_db() as conn:
            # Obtener el create SQL de la tabla
            create_stmt = conn.execute(
                "SELECT sql FROM sqlite_master "
                "WHERE name = 'reporting_weekly_warehouse_client_performance'"
            ).fetchone()

        assert create_stmt is not None
        assert "UNIQUE(warehouse, client_id, week_start)" in create_stmt["sql"] or \
               "UNIQUE (warehouse, client_id, week_start)" in create_stmt["sql"]

    def test_pipeline_runs_table_has_required_columns(self, temp_db_dir):
        """La tabla pipeline_runs debe tener los 10 campos del diseño."""
        from data.pipelines.database import init_reporting_db, get_reporting_db

        init_reporting_db()

        with get_reporting_db() as conn:
            columns = conn.execute(
                "PRAGMA table_info('reporting_pipeline_runs')"
            ).fetchall()
            col_names = [row["name"] for row in columns]

        required = [
            "run_id", "pipeline_name", "status", "started_at",
            "finished_at", "rows_read", "rows_upserted",
            "error_message", "triggered_by", "week_start",
        ]
        for col in required:
            assert col in col_names, f"Columna faltante: {col}"


class TestInitTelemetryDB:
    """Verifica la creación y población de telemetry_events."""

    def test_creates_telemetry_table(self, temp_db_dir):
        """Debe crear la tabla telemetry_events."""
        from data.pipelines.database import init_telemetry_db_with_sample_data, get_telemetry_db

        init_telemetry_db_with_sample_data()

        with get_telemetry_db() as conn:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [row["name"] for row in tables]

        assert "telemetry_events" in table_names

    def test_populates_sample_data(self, temp_db_dir):
        """Debe insertar datos de ejemplo (al menos 50 eventos)."""
        from data.pipelines.database import init_telemetry_db_with_sample_data, get_telemetry_db

        init_telemetry_db_with_sample_data()

        with get_telemetry_db() as conn:
            count = conn.execute(
                "SELECT COUNT(*) AS cnt FROM telemetry_events"
            ).fetchone()

        assert count["cnt"] >= 50, (
            f"Se esperaban al menos 50 eventos, se obtuvieron {count['cnt']}"
        )

    def test_sample_data_has_required_event_types(self, temp_db_dir):
        """Los datos de ejemplo deben incluir los 4 tipos de evento."""
        from data.pipelines.database import init_telemetry_db_with_sample_data, get_telemetry_db

        init_telemetry_db_with_sample_data()

        with get_telemetry_db() as conn:
            event_types = conn.execute(
                "SELECT DISTINCT event_type FROM telemetry_events"
            ).fetchall()
            types = {row["event_type"] for row in event_types}

        required_types = {
            "inbound_order_created",
            "outbound_order_created",
            "stock_threshold_triggered",
            "inventory_discrepancy_detected",
        }
        missing = required_types - types
        assert not missing, f"Faltan tipos de evento: {missing}"

    def test_telemetry_table_has_expected_columns(self, temp_db_dir):
        """La tabla telemetry_events debe tener las columnas del esquema real."""
        from data.pipelines.database import init_telemetry_db_with_sample_data, get_telemetry_db

        init_telemetry_db_with_sample_data()

        with get_telemetry_db() as conn:
            columns = conn.execute(
                "PRAGMA table_info('telemetry_events')"
            ).fetchall()
            col_names = [row["name"] for row in columns]

        required = [
            "id", "timestamp", "service", "event_type",
            "level", "value", "message", "tags",
        ]
        for col in required:
            assert col in col_names, f"Columna faltante: {col}"

    def test_idempotent_multiple_calls(self, temp_db_dir):
        """init_telemetry_db_with_sample_data() debe ser seguro llamarlo varias veces."""
        from data.pipelines.database import init_telemetry_db_with_sample_data

        init_telemetry_db_with_sample_data()
        init_telemetry_db_with_sample_data()  # No debe lanzar error

    def test_sample_data_has_indexes(self, temp_db_dir):
        """Debe crear índices en timestamp, event_type y tags."""
        from data.pipelines.database import init_telemetry_db_with_sample_data, get_telemetry_db

        init_telemetry_db_with_sample_data()

        with get_telemetry_db() as conn:
            indexes = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index' "
                "AND tbl_name='telemetry_events'"
            ).fetchall()
            idx_names = [row["name"] for row in indexes]

        # Al menos debe tener los índices (pueden tener nombres autogenerados)
        assert len(idx_names) >= 3, f"Se esperaban al menos 3 índices, se obtuvieron {len(idx_names)}"