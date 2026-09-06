"""
database.py — Capa de datos para el pipeline de desempeño de negocio

Propósito:
    Gestiona dos bases de datos SQLite locales que simulan el entorno de
    producción (PostgreSQL / Supabase):
    
    1. telemetry_events.db — Contiene los eventos de telemetría (solo lectura).
       Reproduce el esquema exacto de la tabla real `telemetry_events`:
       id (PK), timestamp, service, event_type, level, value, message, tags (jsonb).
    
    2. reporting.db — Contiene las tablas de destino del pipeline:
       - reporting.weekly_warehouse_client_performance (KPIs semanales)
       - reporting.pipeline_runs (log de ejecución)
    
    El pipeline NUNCA escribe en telemetry_events — solo lee de ahí y escribe
    en el esquema `reporting`.

Uso:
    from data.pipelines.database import get_telemetry_db, get_reporting_db
    
    with get_telemetry_db() as conn:
        rows = conn.execute("SELECT * FROM telemetry_events").fetchall()

Estructura:
    - get_telemetry_db(): Context manager para la base de eventos (solo lectura)
    - get_reporting_db(): Context manager para la base de reportes (lectura/escritura)
    - init_reporting_db(): Crea las tablas de destino si no existen
    - init_telemetry_db_with_sample_data(): Crea telemetry_events con datos de ejemplo
"""

from __future__ import annotations

import os

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Generator, Optional
from uuid import uuid4

# ─────────────────────────────────────────────────────────────
# Constantes — rutas a las bases de datos SQLite locales
# Estas rutas son relativas a este archivo (data/pipelines/).
# En producción, estos paths apuntarían a cadenas de conexión
# de PostgreSQL/Supabase.
# ─────────────────────────────────────────────────────────────

# La variable de entorno PIPELINES_DB_DIR permite sobreescribir el directorio
# de bases de datos (usado por --db-path en pipeline.py y por los tests).
def _get_db_dir() -> Path:
    _override = os.environ.get("PIPELINES_DB_DIR")
    return Path(_override) if _override else Path(__file__).parent

def get_telemetry_db_path() -> str:
    return str(_get_db_dir() / "telemetry_events.db")

def get_reporting_db_path() -> str:
    return str(_get_db_dir() / "reporting.db")


# ─────────────────────────────────────────────────────────────
# Funciones de conexión (context managers)
# ─────────────────────────────────────────────────────────────


@contextmanager
def get_telemetry_db() -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager para la base de eventos de telemetría (solo lectura).
    
    Abre una conexión, devuelve filas como diccionarios (row_factory = Row),
    y cierra al salir. Es solo lectura — no se debe escribir aquí.
    
    Uso:
        with get_telemetry_db() as conn:
            events = conn.execute("SELECT * FROM telemetry_events").fetchall()
    """
    conn = sqlite3.connect(get_telemetry_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_reporting_db() -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager para la base de reportes (lectura/escritura).
    
    Aquí es donde el pipeline escribe los KPIs calculados y el log de ejecución.
    La conexión entra en modo autocommit (isolation_level=None) para que
    cada UPSERT se persista inmediatamente — así, si el pipeline falla a mitad
    de camino, los datos ya insertados no se pierden (ver Fase 3 del diseño).
    
    Uso:
        with get_reporting_db() as conn:
            conn.execute("INSERT INTO ...")
    """
    conn = sqlite3.connect(get_reporting_db_path(), isolation_level=None)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────
# Inicialización de esquemas
# ─────────────────────────────────────────────────────────────


def init_reporting_db() -> None:
    """
    Crea las tablas del esquema `reporting` si no existen.
    
    Tablas creadas:
    - reporting.weekly_warehouse_client_performance: KPIs semanales por
      almacén y cliente. La constraint UNIQUE(warehouse, client_id, week_start)
      es la base de la estrategia de idempotencia (UPSERT).
    - reporting.pipeline_runs: Log de ejecución con los 10 campos del diseño.
    
    Esta función es idempotente: se puede llamar múltiples veces sin efectos
    secundarios (usa CREATE TABLE IF NOT EXISTS).
    """
    with get_reporting_db() as conn:
        # ── Tabla destino de KPIs (ver CONTEXT-trackflow.md sección 5) ──
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reporting_weekly_warehouse_client_performance (
                id                  TEXT PRIMARY KEY,
                warehouse           TEXT NOT NULL,
                client_id           TEXT NOT NULL,
                week_start          TEXT NOT NULL,  -- Fecha ISO (lunes)
                inbound_units_count     INTEGER NOT NULL DEFAULT 0,
                outbound_orders_count   INTEGER NOT NULL DEFAULT 0,
                stockout_events_count   INTEGER NOT NULL DEFAULT 0,
                discrepancy_events_count INTEGER NOT NULL DEFAULT 0,
                discrepancy_rate        REAL NOT NULL DEFAULT 0,
                computed_at             TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(warehouse, client_id, week_start)
            )
        """)

        # ── Tabla de log de ejecución (10 campos, ver Fase 3 del diseño) ──
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reporting_pipeline_runs (
                run_id          TEXT PRIMARY KEY,
                pipeline_name   TEXT NOT NULL,
                status          TEXT NOT NULL,
                started_at      TEXT NOT NULL,
                finished_at     TEXT,
                rows_read       INTEGER DEFAULT 0,
                rows_upserted   INTEGER DEFAULT 0,
                error_message   TEXT,
                triggered_by    TEXT NOT NULL DEFAULT 'scheduled',
                week_start      TEXT NOT NULL
            )
        """)


def init_telemetry_db_with_sample_data() -> None:
    """
    Crea la tabla telemetry_events y la poblada con datos de ejemplo.
    
    La tabla replica el esquema real de Supabase/PostgreSQL:
    - id (TEXT, PK): UUID autogenerado
    - timestamp (TEXT): ISO 8601 en UTC
    - service (TEXT): nombre del servicio frontend
    - event_type (TEXT): tipo de evento de negocio
    - level (TEXT): nivel de severidad (info, warning, error)
    - value (REAL): valor numérico extraído (quantity)
    - message (TEXT): descripción legible
    - tags (TEXT): JSON con envelope (eventId, sessionId, userId, etc.)
      y payload de negocio (warehouse, client_id, product_id, etc.)
    
    Los datos de ejemplo incluyen eventos de las 2 semanas recientes
    para que el pipeline tenga datos que procesar.
    
    Es seguro llamarla múltiples veces — hace DROP + CREATE y regenera.
    """
    conn = sqlite3.connect(get_telemetry_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    
    # ── Crear tabla replica del esquema real ──
    conn.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_events (
            id          TEXT PRIMARY KEY,
            timestamp   TEXT NOT NULL,
            service     TEXT NOT NULL,
            event_type  TEXT NOT NULL,
            level       TEXT NOT NULL DEFAULT 'info',
            value       REAL DEFAULT 0,
            message     TEXT,
            tags        TEXT NOT NULL DEFAULT '{}'
        )
    """)
    
    # ── Índices (como en el DDL real) ──
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ts ON telemetry_events(timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_event_type ON telemetry_events(event_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tags ON telemetry_events(tags)")
    
    # ── Limpiar datos anteriores y regenerar ──
    conn.execute("DELETE FROM telemetry_events")
    
    # ── Datos de ejemplo ──────────────────────────────────
    # Se generan eventos para las semanas ISO 2026-36 y 2026-37
    # (septiembre 2026), con datos realistas para TrackFlow:
    # - Almacenes: los_angeles, zaragoza
    # - Clientes: fashion-co, techparts-inc, freshfood-logistics
    # - Productos variados por categoría
    # ─────────────────────────────────────────────────────
    
    sample_events = _generate_sample_events()
    
    for event in sample_events:
        conn.execute("""
            INSERT INTO telemetry_events (id, timestamp, service, event_type, level, value, message, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event["id"],
            event["timestamp"],
            event["service"],
            event["event_type"],
            event["level"],
            event["value"],
            event["message"],
            json.dumps(event["tags"])
        ))
    
    conn.commit()
    conn.close()


def _generate_sample_events() -> list[dict[str, Any]]:
    """
    Genera una lista de eventos de telemetría realistas para TrackFlow.
    
    Distribución:
    - 40% inbound_order_created    (Volumen de Entrada)
    - 35% outbound_order_created   (Rendimiento de Salida)
    - 15% stock_threshold_triggered (Frecuencia de Desabastecimiento)
    - 10% inventory_discrepancy_detected (Tasa de Discrepancia)
    
    Los eventos se reparten entre los 2 almacenes y 3 clientes principales,
    con fechas distribuidas en las 2 semanas más recientes.
    """
    events: list[dict[str, Any]] = []
    
    # Almacenes y clientes de TrackFlow
    warehouses = ["los_angeles", "zaragoza"]
    clients = ["fashion-co", "techparts-inc", "freshfood-logistics"]
    
    # Productos por cliente (cada cliente tiene productos distintos)
    products_by_client = {
        "fashion-co": [
            {"id": "sku-001", "category": "apparel", "name": "Camisetas basicas"},
            {"id": "sku-002", "category": "apparel", "name": "Jeans premium"},
            {"id": "sku-003", "category": "footwear", "name": "Zapatillas deportivas"},
        ],
        "techparts-inc": [
            {"id": "sku-020", "category": "electronics", "name": "Microchips A7"},
            {"id": "sku-021", "category": "electronics", "name": "Cables HDMI 2m"},
            {"id": "sku-022", "category": "accessories", "name": "Funda protectora"},
        ],
        "freshfood-logistics": [
            {"id": "sku-040", "category": "perishable", "name": "Frutas tropicales"},
            {"id": "sku-041", "category": "perishable", "name": "Verduras organicas"},
            {"id": "sku-042", "category": "dairy", "name": "Quesos artesanales"},
        ],
    }
    
    now = datetime.now(timezone.utc)
    
    # Generar eventos para las 2 semanas anteriores
    for week_offset in range(2):
        week_num = 36 + week_offset  # Semanas ISO 36 y 37
        
        for warehouse in warehouses:
            for client in clients:
                products = products_by_client[client]
                
                # ── Inbound orders (entrada de mercancía) ──
                for i in range(4):
                    product = products[i % len(products)]
                    quantity = 50 + (i * 25)  # Cantidades variables
                    # Usar timedelta para evitar errores de "day out of range"
                    offset_days = 7 * week_offset + i + 1
                    ts = now - timedelta(days=offset_days)
                    event_id = str(uuid4())
                    events.append({
                        "id": event_id,
                        "timestamp": ts.isoformat(),
                        "service": "backoffice",
                        "event_type": "inbound_order_created",
                        "level": "info",
                        "value": float(quantity),
                        "message": f"Entrada de {quantity} uds de {product['name']} en {warehouse} para {client}",
                        "tags": {
                            "eventId": event_id,
                            "sessionId": str(uuid4()),
                            "userId": "system",
                            "schemaVersion": "1.0",
                            "requestId": str(uuid4()),
                            "warehouse": warehouse,
                            "client_id": client,
                            "product_id": product["id"],
                            "product_category": product["category"],
                            "quantity": quantity,
                        }
                    })
                
                # ── Outbound orders (salida de pedidos) ──
                for i in range(3):
                    product = products[i % len(products)]
                    quantity = 10 + (i * 5)
                    offset_days = 7 * week_offset + i + 2
                    ts = now - timedelta(days=offset_days)
                    event_id = str(uuid4())
                    events.append({
                        "id": event_id,
                        "timestamp": ts.isoformat(),
                        "service": "backoffice",
                        "event_type": "outbound_order_created",
                        "level": "info",
                        "value": float(quantity),
                        "message": f"Despacho de {quantity} uds de {product['name']} en {warehouse} para {client}",
                        "tags": {
                            "eventId": event_id,
                            "sessionId": str(uuid4()),
                            "userId": "system",
                            "schemaVersion": "1.0",
                            "requestId": str(uuid4()),
                            "warehouse": warehouse,
                            "client_id": client,
                            "product_id": product["id"],
                            "product_category": product["category"],
                            "quantity": quantity,
                        }
                    })
                
                # ── Stock threshold triggered (desabastecimiento) ──
                for i in range(2):
                    product = products[i % len(products)]
                    offset_days = 7 * week_offset + i + 3
                    ts = now - timedelta(days=offset_days)
                    event_id = str(uuid4())
                    events.append({
                        "id": event_id,
                        "timestamp": ts.isoformat(),
                        "service": "inventory",
                        "event_type": "stock_threshold_triggered",
                        "level": "warning",
                        "value": 0.0,
                        "message": f"Stock minimo alcanzado para {product['name']} en {warehouse} ({client})",
                        "tags": {
                            "eventId": event_id,
                            "sessionId": str(uuid4()),
                            "userId": "system",
                            "schemaVersion": "1.0",
                            "requestId": str(uuid4()),
                            "warehouse": warehouse,
                            "client_id": client,
                            "product_id": product["id"],
                            "product_category": product["category"],
                            "quantity": 0,
                        }
                    })
                
                # ── Inventory discrepancy detected (discrepancia) ──
                for i in range(1):
                    product = products[i % len(products)]
                    offset_days = 7 * week_offset + i + 4
                    ts = now - timedelta(days=offset_days)
                    event_id = str(uuid4())
                    events.append({
                        "id": event_id,
                        "timestamp": ts.isoformat(),
                        "service": "inventory",
                        "event_type": "inventory_discrepancy_detected",
                        "level": "error",
                        "value": 0.0,
                        "message": f"Discrepancia detectada en {product['name']} en {warehouse} ({client})",
                        "tags": {
                            "eventId": event_id,
                            "sessionId": str(uuid4()),
                            "userId": "system",
                            "schemaVersion": "1.0",
                            "requestId": str(uuid4()),
                            "warehouse": warehouse,
                            "client_id": client,
                            "product_id": product["id"],
                            "product_category": product["category"],
                            "quantity": 0,
                        }
                    })
    
    return events
