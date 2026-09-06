"""
main.py — Servicio de Reporting API (independiente de telemetría)

Propósito:
    Servicio FastAPI independiente que expone los resultados del pipeline
    de desempeño de negocio a través de 3 endpoints:
    
    1. GET  /reporting/weekly-warehouse-client-performance — KPIs semanales
    2. GET  /reporting/pipeline-runs/latest — Metadata de última corrida
    3. POST /reporting/pipeline-runs — Disparar corrida manual

    Este servicio es SEPARADO de services/telemetry/ (no modifica nada allí).
    Importa funciones desde data/pipelines/ — no duplica la lógica.

Ejecución:
    cd /path/to/monorepo
    uvicorn services.reporting.main:app --reload --port 8004
    # O desde la raíz:
    python -m uvicorn services.reporting.main:app --reload --port 8004

Ver también:
    services/reporting/reporting_routes.py — implementación de los endpoints
    data/pipelines/PIPELINE_DESIGN.md — diseño del pipeline
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.reporting.reporting_routes import router as reporting_router

# ─────────────────────────────────────────────────────────────
# Configuración del logger
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Crear la aplicación FastAPI
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="TrackFlow — Reporting API (Pipeline de Desempeño de Negocio)",
    description="""
        API de reporting para el pipeline de desempeño de negocio.
        
        Proporciona acceso a los KPIs semanales de almacén/cliente,
        metadata de ejecuciones del pipeline, y capacidad de disparar
        corridas manuales.
        
        Este servicio es independiente de services/telemetry/.
        Los datos provienen de data/pipelines/reporting.db.
    """,
    version="1.0.0",
)

# ── CORS (misma política que services/api/main.py) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Incluir los routers de reporting ──
app.include_router(reporting_router)


# ─────────────────────────────────────────────────────────────
# Endpoint raíz (health check)
# ─────────────────────────────────────────────────────────────


@app.get("/")
def root() -> dict[str, str]:
    """Health check del servicio de reporting."""
    return {
        "service": "TrackFlow Reporting API",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint para orquestadores / monitoreo."""
    return {"status": "healthy"}