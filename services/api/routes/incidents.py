"""
routes/incidents.py — Endpoints del Gestor Centralizado de Incidencias (TrackFlow)

Mapa de rutas:
  POST   /api/incidents              → Crear incidencia
  GET    /api/incidents              → Listar todas (con filtros opcionales)
  GET    /api/incidents/{id}         → Detalle de una incidencia
  PATCH  /api/incidents/{id}/status  → Actualizar estado
  GET    /api/incidents/summary      → Resumen estadístico

Seguridad:
  Todos los endpoints requieren autenticación JWT (get_current_user).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

# TinyDB
from tinydb import TinyDB, Query as TinyQuery

from dependencies.auth_deps import get_current_user
from models import IncidentCreate, IncidentUpdateStatus, IncidentResponse, SummaryResponse
from models.incident import (
    STATUS_TRANSITIONS,
    STATUS_FINAL,
    VALID_CATEGORIES,
    VALID_BRANCHES,
    VALID_ORIGINS,
    VALID_STATUSES,
)

# ───── Misma instancia de TinyDB que el resto de la app ─────
INCIDENTS_DB_PATH = "incidentes_db.json"

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _get_incidents_table():
    """Devuelve la tabla 'incidents' de la base de datos de incidencias."""
    db = TinyDB(INCIDENTS_DB_PATH)
    return db.table("incidents")


def _doc_to_response(doc: dict) -> IncidentResponse:
    """Convierte un documento TinyDB a IncidentResponse."""
    return IncidentResponse(
        id=doc.get("incident_id", doc.get("id", 0)),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        category=doc.get("category", ""),
        status=doc.get("status", "open"),
        origin=doc.get("origin", "customer"),
        branch=doc.get("branch", "central"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )


def _next_id(table) -> int:
    """Genera el siguiente ID único para una nueva incidencia."""
    existing = table.all()
    if not existing:
        return 1
    return max(doc.get("incident_id", doc.get("id", 0)) for doc in existing) + 1


# ─────────────────────────────────────────────────────────────
# POST /api/incidents — Crear nueva incidencia
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=IncidentResponse, status_code=201)
def create_incident(
    data: IncidentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Crea una nueva incidencia en el sistema.

    El campo `branch` es SIEMPRE visible en el formulario.
    El estado inicial por defecto es 'open'.
    La transición de estados sigue las reglas definidas en CONTEXT-trackflow.

    Args:
        data: title, description, category, origin, branch, status (opcional, default 'open').

    Retorna:
        IncidentResponse con todos los datos de la incidencia creada.
    """
    table = _get_incidents_table()
    new_id = _next_id(table)
    now = datetime.now(timezone.utc).isoformat()

    incident_dict = {
        "incident_id": new_id,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "origin": data.origin,
        "branch": data.branch,
        "status": data.status if data.status else "open",
        "created_at": now,
        "updated_at": now,
    }

    table.insert(incident_dict)
    return _doc_to_response(incident_dict)


# ─────────────────────────────────────────────────────────────
# GET /api/incidents — Listar incidencias (con filtros opcionales)
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    origin: Optional[str] = Query(None, description="Filtrar por origen"),
    branch: Optional[str] = Query(None, description="Filtrar por sede"),
    sort_by: Optional[str] = Query("created_at", description="Campo de ordenación"),
    sort_order: Optional[str] = Query("desc", description="asc o desc"),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista todas las incidencias, con filtros y ordenación opcionales.

    Filtros disponibles: status, category, origin, branch.
    Ordenación: sort_by (campo) y sort_order (asc/desc).
    """
    table = _get_incidents_table()
    docs = table.all()

    # Filtros
    if status:
        docs = [d for d in docs if d.get("status") == status]
    if category:
        docs = [d for d in docs if d.get("category") == category]
    if origin:
        docs = [d for d in docs if d.get("origin") == origin]
    if branch:
        docs = [d for d in docs if d.get("branch") == branch]

    # Ordenación
    reverse = sort_order.lower() != "asc"
    docs.sort(key=lambda d: d.get(sort_by, ""), reverse=reverse)

    return [_doc_to_response(d) for d in docs]


# ─────────────────────────────────────────────────────────────
# GET /api/incidents/{id} — Detalle de una incidencia
# ─────────────────────────────────────────────────────────────

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle de una incidencia por su ID.

    Raises:
        404: Si la incidencia no existe.
    """
    table = _get_incidents_table()
    Incident = TinyQuery()
    doc = table.get(Incident.incident_id == incident_id)

    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Incidencia #{incident_id} no encontrada",
        )

    return _doc_to_response(doc)


# ─────────────────────────────────────────────────────────────
# PATCH /api/incidents/{id}/status — Actualizar estado
# ─────────────────────────────────────────────────────────────

@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    data: IncidentUpdateStatus,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza el estado de una incidencia validando las transiciones permitidas.

    Reglas de transición:
      open → in_progress | discarded
      in_progress → resolved | discarded
      resolved → (ninguna — estado final)
      discarded → (ninguna — estado final)

    Raises:
        404: Si la incidencia no existe.
        422: Si la transición no está permitida.
    """
    table = _get_incidents_table()
    Incident = TinyQuery()
    doc = table.get(Incident.incident_id == incident_id)

    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Incidencia #{incident_id} no encontrada",
        )

    current_status = doc.get("status", "open")
    new_status = data.status

    # Validar transición
    allowed = STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Transición no permitida: de '{current_status}' a '{new_status}'. "
                f"Transiciones válidas desde '{current_status}': "
                f"{', '.join(sorted(allowed)) if allowed else 'ninguna (estado final)'}"
            ),
        )

    now = datetime.now(timezone.utc).isoformat()
    table.update(
        {"status": new_status, "updated_at": now},
        Incident.incident_id == incident_id,
    )

    doc["status"] = new_status
    doc["updated_at"] = now
    return _doc_to_response(doc)


# ─────────────────────────────────────────────────────────────
# GET /api/incidents/summary — Resumen estadístico
# ─────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SummaryResponse)
def get_incidents_summary(
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve un resumen estadístico de todas las incidencias.

    Agrupa por:
      - status: open / in_progress / resolved / discarded
      - category: todas las categorías válidas
      - origin: customer / branch / internal
      - branch: todas las sedes válidas
    """
    table = _get_incidents_table()
    docs = table.all()

    by_status: dict[str, int] = {s: 0 for s in sorted(VALID_STATUSES)}
    by_category: dict[str, int] = {c: 0 for c in sorted(VALID_CATEGORIES)}
    by_origin: dict[str, int] = {o: 0 for o in sorted(VALID_ORIGINS)}
    by_branch: dict[str, int] = {b: 0 for b in sorted(VALID_BRANCHES)}

    for doc in docs:
        s = doc.get("status", "")
        if s in by_status:
            by_status[s] += 1

        c = doc.get("category", "")
        if c in by_category:
            by_category[c] += 1

        o = doc.get("origin", "")
        if o in by_origin:
            by_origin[o] += 1

        b = doc.get("branch", "")
        if b in by_branch:
            by_branch[b] += 1

    # Limpiar ceros
    by_status = {k: v for k, v in by_status.items() if v > 0}
    by_category = {k: v for k, v in by_category.items() if v > 0}
    by_origin = {k: v for k, v in by_origin.items() if v > 0}
    by_branch = {k: v for k, v in by_branch.items() if v > 0}

    return SummaryResponse(
        by_status=by_status,
        by_category=by_category,
        by_origin=by_origin,
        by_branch=by_branch,
    )