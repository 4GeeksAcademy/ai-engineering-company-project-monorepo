"""Carrier assignment service — assign transportistas, calculate shipping costs.

Based on the TrackFlow logistics domain from ticket API-042.
Backed by TinyDB tables: carriers, carrier_assignments.
"""

from __future__ import annotations

from datetime import datetime, timezone

from tinydb import Query
from tinydb.table import Document

from src.database import get_carriers_table, get_carrier_assignments_table
from src.models.carrier import (
    Carrier,
    CarrierAssignment,
    CarrierStatus,
    ShipmentPriority,
    ShipmentRequest,
)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_carrier(document: Document) -> Carrier:
    payload = dict(document)
    return Carrier.model_validate(payload)


def _to_assignment(document: Document) -> CarrierAssignment:
    payload = dict(document)
    return CarrierAssignment.model_validate(payload)


def _calculate_coste(peso_kg: float, tarifa_kg: float, prioridad: ShipmentPriority) -> float:
    """Calculate the shipping cost based on weight, rate, and priority.

    Base cost = peso_kg * tarifa_kg.
    Priority multipliers:
      - urgente: 2.5x
      - alta: 1.5x
      - normal: 1.0x
      - baja: 0.8x
    """
    multipliers = {
        ShipmentPriority.URGENTE: 2.5,
        ShipmentPriority.ALTA: 1.5,
        ShipmentPriority.NORMAL: 1.0,
        ShipmentPriority.BAJA: 0.8,
    }
    base = peso_kg * tarifa_kg
    return round(base * multipliers[prioridad], 2)


# ──────────────────────────────────────────────
# Carrier CRUD
# ──────────────────────────────────────────────


def create_carrier(carrier: Carrier) -> Carrier:
    """Register a new carrier in the system."""
    carriers_table = get_carriers_table()
    doc_id = carriers_table.insert(carrier.model_dump(mode="json"))
    document = carriers_table.get(doc_id=doc_id)
    if document is None:
        raise RuntimeError("No se pudo crear el transportista")
    return _to_carrier(document)


def get_carrier_by_id(carrier_id: str) -> Carrier | None:
    """Look up a carrier by UUID."""
    carriers_table = get_carriers_table()
    query = Query()
    document = carriers_table.get(query.id == carrier_id)
    if document is None:
        return None
    return _to_carrier(document)


def list_carriers(
    *,
    estado: str | None = None,
    region: str | None = None,
    carga_minima_kg: float | None = None,
) -> list[Carrier]:
    """List carriers with optional filters.

    - estado: filter by CarrierStatus value.
    - region: filter by region (exact match in regiones list).
    - carga_minima_kg: only carriers with peso_disponible >= this value.
    """
    carriers_table = get_carriers_table()
    documents = carriers_table.all()

    if estado is not None:
        documents = [d for d in documents if d.get("estado") == estado]
    if region is not None:
        documents = [
            d for d in documents
            if region in (d.get("regiones") or [])
        ]
    if carga_minima_kg is not None:
        documents = [
            d for d in documents
            if (d.get("capacidad_kg", 0) - d.get("peso_actual_kg", 0)) >= carga_minima_kg
        ]

    return [_to_carrier(d) for d in documents]


def update_carrier_load(carrier_id: str, peso_adicional_kg: float) -> Carrier | None:
    """Add weight load to a carrier (after assigning a package).

    Returns None if the carrier does not exist.
    Raises ValueError if the additional weight would exceed capacity.
    """
    carrier = get_carrier_by_id(carrier_id)
    if carrier is None:
        return None

    nuevo_peso = carrier.peso_actual_kg + peso_adicional_kg
    if nuevo_peso > carrier.capacidad_kg:
        raise ValueError(
            f"Capacidad excedida: disponible {carrier.peso_disponible():.2f} kg, "
            f"solicitado {peso_adicional_kg:.2f} kg"
        )

    carriers_table = get_carriers_table()
    query = Query()
    carriers_table.update(
        {
            "peso_actual_kg": nuevo_peso,
            "updated_at": _now_utc().isoformat(),
        },
        query.id == carrier_id,
    )

    # Re-fetch and return updated
    document = carriers_table.get(query.id == carrier_id)
    if document is None:
        return None
    return _to_carrier(document)


# ──────────────────────────────────────────────
# Carrier assignment logic
# ──────────────────────────────────────────────


def assign_shipment(request: ShipmentRequest) -> CarrierAssignment | None:
    """Assign a shipment to a carrier and calculate the cost.

    Steps:
      1. Validate the carrier exists and is available.
      2. Validate the carrier has enough capacity.
      3. Validate the package weight (> 0 is enforced by ShipmentRequest).
      4. Calculate shipping cost.
      5. Update the carrier's current load.
      6. Record the assignment.

    Returns a CarrierAssignment on success.
    Returns None if the carrier does not exist.
    Raises ValueError for business rule violations.
    """
    # 1. Carrier existence check
    carrier = get_carrier_by_id(request.carrier_id)
    if carrier is None:
        return None

    # 2. Carrier availability
    if carrier.estado != CarrierStatus.DISPONIBLE:
        raise ValueError(
            f"El transportista '{carrier.nombre}' no está disponible "
            f"(estado: {carrier.estado.value})"
        )

    # 3. Capacity check
    if not carrier.puede_asignar(request.peso_kg):
        raise ValueError(
            f"El transportista '{carrier.nombre}' no tiene capacidad suficiente: "
            f"disponible {carrier.peso_disponible():.2f} kg, "
            f"solicitado {request.peso_kg:.2f} kg"
        )

    # 4. Calculate cost
    coste = _calculate_coste(request.peso_kg, carrier.tarifa_kg, request.prioridad)

    # 5. Update carrier load
    updated_carrier = update_carrier_load(request.carrier_id, request.peso_kg)
    if updated_carrier is None:
        raise RuntimeError("No se pudo actualizar la carga del transportista")

    # 6. Create assignment record
    assignment = CarrierAssignment(
        carrier_id=request.carrier_id,
        carrier_nombre=carrier.nombre,
        peso_kg=request.peso_kg,
        origen=request.origen,
        destino=request.destino,
        prioridad=request.prioridad,
        coste_envio=coste,
    )

    assignments_table = get_carrier_assignments_table()
    assignments_table.insert(assignment.model_dump(mode="json"))
    return assignment


def get_assignment_by_id(assignment_id: str) -> CarrierAssignment | None:
    """Look up a carrier assignment by ID."""
    assignments_table = get_carrier_assignments_table()
    query = Query()
    document = assignments_table.get(query.id == assignment_id)
    if document is None:
        return None
    return _to_assignment(document)


def list_assignments_by_carrier(carrier_id: str) -> list[CarrierAssignment]:
    """Return all assignments for a specific carrier."""
    assignments_table = get_carrier_assignments_table()
    query = Query()
    documents = assignments_table.search(query.carrier_id == carrier_id)
    return [_to_assignment(d) for d in documents]


def calculate_shipping_cost(
    peso_kg: float,
    tarifa_kg: float,
    prioridad: ShipmentPriority = ShipmentPriority.NORMAL,
) -> float:
    """Calculate a shipping cost without performing an assignment.

    This is a query-only function.
    Raises ValueError if peso_kg <= 0 or tarifa_kg <= 0.
    """
    if peso_kg <= 0:
        raise ValueError("El peso debe ser mayor que 0")
    if tarifa_kg <= 0:
        raise ValueError("La tarifa por kg debe ser mayor que 0")
    return _calculate_coste(peso_kg, tarifa_kg, prioridad)