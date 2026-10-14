"""
conftest.py — Fixtures compartidos para los tests del pipeline.

Proporciona:
- Sample events realistas para tests de transformación
- Paths a bases de datos temporales
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest


# ─────────────────────────────────────────────────────────────
# Fixtures de datos
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_events() -> list[dict[str, Any]]:
    """Retorna una lista de eventos similares a los que devuelve extract()."""
    return [
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T10:00:00+00:00",
            "event_type": "inbound_order_created",
            "value": 100.0,
            "warehouse": "los_angeles",
            "client_id": "fashion-co",
            "quantity": "100",
            "event_id": str(uuid4()),
        },
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T11:00:00+00:00",
            "event_type": "outbound_order_created",
            "value": 25.0,
            "warehouse": "los_angeles",
            "client_id": "fashion-co",
            "quantity": "25",
            "event_id": str(uuid4()),
        },
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T12:00:00+00:00",
            "event_type": "stock_threshold_triggered",
            "value": 0.0,
            "warehouse": "los_angeles",
            "client_id": "fashion-co",
            "quantity": "0",
            "event_id": str(uuid4()),
        },
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T13:00:00+00:00",
            "event_type": "inventory_discrepancy_detected",
            "value": 0.0,
            "warehouse": "los_angeles",
            "client_id": "fashion-co",
            "quantity": "0",
            "event_id": str(uuid4()),
        },
        # Segundo warehouse + cliente
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T14:00:00+00:00",
            "event_type": "inbound_order_created",
            "value": 200.0,
            "warehouse": "zaragoza",
            "client_id": "techparts-inc",
            "quantity": "200",
            "event_id": str(uuid4()),
        },
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T15:00:00+00:00",
            "event_type": "outbound_order_created",
            "value": 50.0,
            "warehouse": "zaragoza",
            "client_id": "techparts-inc",
            "quantity": "50",
            "event_id": str(uuid4()),
        },
        # Evento con warehouse/client_id nulo (debe ser ignorado)
        {
            "id": str(uuid4()),
            "timestamp": "2026-09-07T16:00:00+00:00",
            "event_type": "inbound_order_created",
            "value": 0.0,
            "warehouse": None,
            "client_id": None,
            "quantity": None,
            "event_id": str(uuid4()),
        },
    ]


@pytest.fixture
def sample_kpi_record() -> dict[str, Any]:
    """Un registro KPI típico como el que produce transform()."""
    return {
        "warehouse": "los_angeles",
        "client_id": "fashion-co",
        "week_start": "2026-09-07",
        "inbound_units_count": 100,
        "outbound_orders_count": 1,
        "stockout_events_count": 1,
        "discrepancy_events_count": 1,
        "discrepancy_rate": 1.0,
    }


@pytest.fixture
def temp_db_dir() -> str:
    """Crea un directorio temporal para bases de datos de prueba."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Establecer variable de entorno para que database.py use este directorio
        old_val = os.environ.get("PIPELINES_DB_DIR")
        os.environ["PIPELINES_DB_DIR"] = tmpdir
        yield tmpdir
        # Restaurar
        if old_val is None:
            del os.environ["PIPELINES_DB_DIR"]
        else:
            os.environ["PIPELINES_DB_DIR"] = old_val


@pytest.fixture
def week_start() -> str:
    """Calcula el lunes de la semana ISO actual (semana de los datos de ejemplo)."""
    from datetime import datetime, timezone, timedelta
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    return monday.strftime("%Y-%m-%d")