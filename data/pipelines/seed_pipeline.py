"""
seed_pipeline.py — Genera datos de ejemplo para el pipeline resiliente

Propósito:
    Puebla la base de datos SQLite local (telemetry_events.db) con eventos
    de telemetría realistas para TrackFlow, de modo que el pipeline tenga
    datos que procesar.

Uso:
    python data/pipelines/seed_pipeline.py

Esto crea/recrea:
    - data/pipelines/telemetry_events.db — Base con ~280 eventos de ejemplo
      distribuidas en 2 semanas, 2 almacenes y 3 clientes.
    - data/pipelines/reporting.db — Base con las tablas de destino vacías
      (listas para recibir el resultado del pipeline).

Nota:
    Esta base de datos SQLite local replica el esquema de la tabla real
    telemetry_events en PostgreSQL/Supabase. En producción no sería necesario
    un seed — los eventos llegarían desde el frontend vía POST /telemetry/events.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Añadir el monorepo al path para poder importar data.pipelines
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from data.pipelines.database import (
    init_reporting_db,
    init_telemetry_db_with_sample_data,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    """Inicializa ambas bases de datos y genera datos de ejemplo."""
    logger.info("🌱 Inicializando base de datos de telemetría con datos de ejemplo...")
    init_telemetry_db_with_sample_data()
    logger.info("✅ telemetry_events.db creada con eventos de ejemplo")
    
    logger.info("📋 Inicializando base de datos de reporting (tablas destino)...")
    init_reporting_db()
    logger.info("✅ reporting.db creada con tablas reporting_weekly_* y reporting_pipeline_runs")
    
    logger.info("")
    logger.info("🎉 Bases de datos listas. Ejecuta ahora:")
    logger.info("   python data/pipelines/pipeline.py")
    logger.info("   python data/pipelines/pipeline.py --week-start 2026-09-07")
    logger.info("")


if __name__ == "__main__":
    main()