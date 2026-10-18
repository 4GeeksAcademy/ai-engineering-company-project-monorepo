"""
routes/suppliers.py — Endpoints del Directorio de Proveedores

Mapa de rutas:
  POST   /suppliers              → Crear proveedor
  GET    /suppliers              → Listar todos (con filtros opcionales)
  GET    /suppliers/{id}         → Detalle de un proveedor
  PATCH  /suppliers/{id}/rate    → Actualizar tarifa
  PATCH  /suppliers/{id}/status  → Cambiar estado
  DELETE /suppliers/{id}         → Eliminar proveedor

¿Por qué un router separado y no todo en main.py?
--------------------------------------------------
main.py ya tiene los endpoints de incidencias (milestone anterior).
Si metemos suppliers ahí, el archivo crece sin control.
Un router es como un "mini FastAPI" que se conecta al principal.
Beneficio: cada feature tiene su propio archivo → más fácil de encontrar,
probar y modificar sin romper lo demás.
"""


from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from database import suppliers_table, Supplier as SupplierQuery
from dependencies.auth_deps import get_current_user
from models import Supplier, SupplierCreate, RateUpdate, StatusUpdate
from core.cache import cache_get, cache_set, cache_invalidate_prefix

router = APIRouter(
    prefix="/suppliers",
    tags=["suppliers"],   # agrupa los endpoints en Swagger UI
)


# ─────────────────────────────────────────────────────────────
# HELPER — convierte un registro de TinyDB en dict con id
# ─────────────────────────────────────────────────────────────

def _with_id(doc_id: int, data: dict) -> dict:
    """
    TinyDB guarda el id del documento separado del contenido.
    Este helper los une para que la respuesta siempre incluya el id.
    Ejemplo: {"id": 3, "name": "UPS Ground", "country": "USA", ...}
    """
    return {"id": doc_id, **data}


# ─────────────────────────────────────────────────────────────
# POST /suppliers — Registrar un proveedor nuevo
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=Supplier, status_code=201)
def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Registra un nuevo proveedor en el directorio.

    FastAPI valida automáticamente el body con SupplierCreate:
    - rate_per_shipment <= 0 → 422
    - status fuera de ['active', 'suspended'] → 422
    - categories inválidas → 422
    - moneda incorrecta para el país → 422

    Si todo es válido, inserta en TinyDB y devuelve el proveedor con su id.
    """
    data = supplier.model_dump()

    # updated_at lo genera el servidor, no el cliente
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Convertir Enums a sus valores string para guardar en TinyDB
    # TinyDB no conoce los Enum de Python — necesita strings normales
    data["status"] = data["status"].value if hasattr(data["status"], "value") else data["status"]
    data["country"] = data["country"].value if hasattr(data["country"], "value") else data["country"]
    data["currency"] = data["currency"].value if hasattr(data["currency"], "value") else data["currency"]
    data["categories"] = [
        c.value if hasattr(c, "value") else c for c in data["categories"]
    ]

    doc_id = suppliers_table.insert(data)
    cache_invalidate_prefix("suppliers:")
    return _with_id(doc_id, data)


# ─────────────────────────────────────────────────────────────
# GET /suppliers — Listar todos con filtros opcionales
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[Supplier])
def list_suppliers(
    country: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    """
    Devuelve todos los proveedores.
    Acepta parámetros de query opcionales:
      ?country=Spain       → solo proveedores de España
      ?category=carrier_last_mile  → solo los que tienen esa categoría
      ?country=USA&category=reverse_logistics  → ambos filtros combinados

    Si no se pasan parámetros, devuelve todos.

    ¿Cómo funciona Query() de TinyDB?
    -----------------------------------
    suppliers_table.search(SupplierQuery.country == "Spain")
    Esto lee el JSON y devuelve solo los documentos que coinciden.
    Es equivalente a SQL: SELECT * FROM suppliers WHERE country = 'Spain'
    """
    
    cache_key = f"suppliers:list:country={country}:category={category}"
    cached = cache_get(cache_key)

    if cached is not None:
        return cached

    all_docs = suppliers_table.all()

    results = []
    for doc in all_docs:
        # Aplicar filtro por país (case-sensitive, tal como está en el CONTEXT)
        if country and doc.get("country") != country:
            continue

        # Aplicar filtro por categoría
        # .get("categories", []) devuelve [] si el campo no existe (seguro)
        if category and category not in doc.get("categories", []):
            continue

        results.append(_with_id(doc.doc_id, dict(doc)))

    cache_set(cache_key, results, 60)
    return results

# ─────────────────────────────────────────────────────────────
# GET /suppliers/{id} — Detalle de un proveedor
# ─────────────────────────────────────────────────────────────

@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(
    supplier_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Devuelve el detalle de un proveedor por su ID de TinyDB.
    Si el ID no existe → 404 (no inventamos datos).
    """
    cache_key = f"suppliers:{supplier_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    doc = suppliers_table.get(doc_id=supplier_id)

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Proveedor con id {supplier_id} no encontrado."
        )

    result = _with_id(supplier_id, dict(doc))
    cache_set(cache_key, result, 60)
    return result


# ─────────────────────────────────────────────────────────────
# PATCH /suppliers/{id}/rate — Actualizar tarifa
# ─────────────────────────────────────────────────────────────

@router.patch("/{supplier_id}/rate", response_model=Supplier)
def update_rate(
    supplier_id: int,
    payload: RateUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Actualiza la tarifa de un proveedor y registra automáticamente
    el timestamp de la actualización en updated_at.

    Carlos Vega (Head of Carrier Operations) necesita este historial
    para auditorías de costes.

    Pydantic valida que rate_per_shipment > 0 antes de llegar aquí.
    Si el proveedor no existe → 404.
    """
    doc = suppliers_table.get(doc_id=supplier_id)

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Proveedor con id {supplier_id} no encontrado."
        )

    # Actualizar tarifa y timestamp en un solo update de TinyDB
    suppliers_table.update(
        {
            "rate_per_shipment": payload.rate_per_shipment,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )

    updated_doc = suppliers_table.get(doc_id=supplier_id)
    cache_invalidate_prefix("suppliers:")
    return _with_id(supplier_id, dict(updated_doc))


# ─────────────────────────────────────────────────────────────
# PATCH /suppliers/{id}/status — Cambiar estado
# ─────────────────────────────────────────────────────────────

@router.patch("/{supplier_id}/status", response_model=Supplier)
def update_status(
    supplier_id: int,
    payload: StatusUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Activa o suspende un proveedor.

    El Enum SupplierStatus en StatusUpdate garantiza que solo
    llegan 'active' o 'suspended'. Cualquier otro valor → 422.

    En TrackFlow, el flujo habitual es suspender proveedores con
    alta tasa de incidencias, no eliminarlos — el historial de
    suspensiones es información operativa relevante.
    """
    doc = suppliers_table.get(doc_id=supplier_id)

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Proveedor con id {supplier_id} no encontrado."
        )

    new_status = payload.status.value if hasattr(payload.status, "value") else payload.status

    suppliers_table.update(
        {"status": new_status},
        doc_ids=[supplier_id],
    )

    updated_doc = suppliers_table.get(doc_id=supplier_id)
    cache_invalidate_prefix("suppliers:")
    return _with_id(supplier_id, dict(updated_doc))


# ─────────────────────────────────────────────────────────────
# DELETE /suppliers/{id} — Eliminar proveedor
# ─────────────────────────────────────────────────────────────

@router.delete("/{supplier_id}", status_code=200)
def delete_supplier(
    supplier_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Elimina un proveedor del directorio.
    Si no existe → 404.
    Devuelve confirmación con el id eliminado.

    Nota del tech lead: preferir suspender sobre eliminar cuando
    hay historial operativo. DELETE es para registros erróneos.
    """
    doc = suppliers_table.get(doc_id=supplier_id)

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Proveedor con id {supplier_id} no encontrado."
        )

    suppliers_table.remove(doc_ids=[supplier_id])
    cache_invalidate_prefix("suppliers:")
    return {"deleted": supplier_id, "message": "Proveedor eliminado correctamente."}
