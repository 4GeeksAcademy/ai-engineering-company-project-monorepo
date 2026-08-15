"""Tests for carrier service — Asignación de Transportistas.

Covers: Happy path (Camino feliz), Boundary (Caso límite), and
Failure modes (Modo de fallo) for carrier assignment and cost calculation.
"""

from __future__ import annotations

import pytest

from src.models.carrier import (
    Carrier,
    CarrierAssignment,
    CarrierStatus,
    ShipmentPriority,
    ShipmentRequest,
)
from src.services.carrier_service import (
    _calculate_coste,
    assign_shipment,
    calculate_shipping_cost,
    create_carrier,
    get_assignment_by_id,
    get_carrier_by_id,
    list_assignments_by_carrier,
    list_carriers,
    update_carrier_load,
)


# ======================================================================
# create_carrier
# ======================================================================


class TestCreateCarrier:
    def test_create_valid_carrier(self, clean_logistics_db):
        """Happy path: create a carrier with valid data."""
        carrier = Carrier(
            nombre="Mensajería Express",
            tarifa_kg=7.5,
            capacidad_kg=500.0,
            regiones=["Madrid"],
        )
        created = create_carrier(carrier)
        assert created.id is not None
        assert created.nombre == "Mensajería Express"
        assert created.tarifa_kg == 7.5
        assert created.estado == CarrierStatus.DISPONIBLE

    def test_create_carrier_zero_capacity(self, clean_logistics_db):
        """Boundary: capacity of 0 is > 0 check — Pydantic gt=0 blocks it."""
        with pytest.raises(Exception):
            Carrier(
                nombre="Sin Capacidad",
                tarifa_kg=5.0,
                capacidad_kg=0.0,
            )

    def test_create_carrier_zero_tarifa(self, clean_logistics_db):
        """Boundary: tarifa_kg of 0 is not allowed (gt=0)."""
        with pytest.raises(Exception):
            Carrier(
                nombre="Gratis",
                tarifa_kg=0.0,
                capacidad_kg=100.0,
            )

    def test_create_carrier_max_load_capacity(self, clean_logistics_db):
        """Boundary: carrier created with peso_actual_kg == capacidad_kg (full)."""
        carrier = Carrier(
            nombre="Lleno",
            tarifa_kg=10.0,
            capacidad_kg=200.0,
            peso_actual_kg=200.0,
        )
        created = create_carrier(carrier)
        assert created.peso_disponible() == 0.0
        assert created.puede_asignar(0.1) is False


# ======================================================================
# get_carrier_by_id
# ======================================================================


class TestGetCarrier:
    def test_get_by_id_found(self, sample_carrier):
        """Happy path: existing carrier → returns carrier."""
        found = get_carrier_by_id(sample_carrier.id)
        assert found is not None
        assert found.nombre == sample_carrier.nombre

    def test_get_by_id_not_found(self, clean_logistics_db):
        """Failure mode: non-existent ID → returns None."""
        result = get_carrier_by_id("no-existe")
        assert result is None

    def test_get_by_id_empty_string(self, clean_logistics_db):
        """Boundary: empty string ID → returns None."""
        result = get_carrier_by_id("")
        assert result is None


# ======================================================================
# list_carriers
# ======================================================================


class TestListCarriers:
    def test_list_all(self, sample_carrier):
        """Happy path: list all carriers."""
        carriers = list_carriers()
        assert len(carriers) >= 1

    def test_list_by_estado(self, sample_carrier, inactive_carrier):
        """Happy path: filter by estado."""
        disponibles = list_carriers(estado=CarrierStatus.DISPONIBLE.value)
        assert all(c.estado == CarrierStatus.DISPONIBLE.value for c in disponibles)

    def test_list_by_estado_no_match(self, clean_logistics_db):
        """Boundary: estado with no carriers → empty list."""
        carriers = list_carriers(estado=CarrierStatus.EN_RUTA.value)
        assert carriers == []

    def test_list_by_region(self, sample_carrier):
        """Happy path: filter by region."""
        carriers = list_carriers(region="Madrid")
        assert all("Madrid" in (c.regiones or []) for c in carriers)

    def test_list_by_region_no_match(self, clean_logistics_db):
        """Boundary: region with no carriers → empty list."""
        carriers = list_carriers(region="Tokio")
        assert carriers == []

    def test_list_by_carga_minima(self, sample_carrier, clean_logistics_db):
        """Boundary: filter carriers with minimum available capacity."""
        carriers = list_carriers(carga_minima_kg=100.0)
        assert len(carriers) >= 1

    def test_list_by_carga_minima_no_match(self, full_carrier):
        """Boundary: full carrier has 0 available capacity → not included."""
        carriers = list_carriers(carga_minima_kg=50.0)
        assert full_carrier.id not in [c.id for c in carriers]

    def test_list_empty(self, clean_logistics_db):
        """Boundary: no carriers in DB → empty list."""
        carriers = list_carriers()
        assert carriers == []


# ======================================================================
# update_carrier_load
# ======================================================================


class TestUpdateCarrierLoad:
    def test_update_load_valid(self, sample_carrier):
        """Happy path: add load to a carrier."""
        updated = update_carrier_load(sample_carrier.id, 100.0)
        assert updated is not None
        assert updated.peso_actual_kg == 100.0
        assert updated.peso_disponible() == sample_carrier.capacidad_kg - 100.0

    def test_update_load_exact_capacity(self, sample_carrier):
        """Boundary: add load exactly to capacity."""
        updated = update_carrier_load(sample_carrier.id, sample_carrier.capacidad_kg)
        assert updated is not None
        assert updated.peso_disponible() == 0.0

    def test_update_load_exceeds_capacity(self, sample_carrier):
        """Failure mode: load exceeds capacity raises ValueError."""
        with pytest.raises(ValueError, match="Capacidad excedida"):
            update_carrier_load(sample_carrier.id, sample_carrier.capacidad_kg + 1)

    def test_update_load_nonexistent(self, clean_logistics_db):
        """Failure mode: non-existent carrier returns None."""
        result = update_carrier_load("no-existe", 10.0)
        assert result is None

    def test_update_load_zero(self, sample_carrier):
        """Boundary: adding 0 kg load."""
        updated = update_carrier_load(sample_carrier.id, 0.0)
        assert updated is not None
        assert updated.peso_actual_kg == 0.0


# ======================================================================
# assign_shipment
# ======================================================================


class TestAssignShipment:
    def test_assign_valid_shipment(self, sample_carrier):
        """Happy path: assign a shipment to an available carrier."""
        request = ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=50.0,
            origen="Madrid",
            destino="Barcelona",
        )
        assignment = assign_shipment(request)
        assert assignment is not None
        assert assignment.carrier_id == sample_carrier.id
        assert assignment.carrier_nombre == sample_carrier.nombre
        assert assignment.peso_kg == 50.0
        assert assignment.origen == "Madrid"
        assert assignment.destino == "Barcelona"
        assert assignment.estado == "asignado"
        assert assignment.coste_envio > 0

        # Verify carrier load was updated
        carrier = get_carrier_by_id(sample_carrier.id)
        assert carrier is not None
        assert carrier.peso_actual_kg == 50.0

    def test_assign_urgente_has_higher_cost(self, sample_carrier):
        """Happy path: urgent priority increases cost."""
        normal_request = ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=10.0,
            origen="A", destino="B",
        )
        urgent_request = ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=10.0,
            origen="A", destino="B",
            prioridad=ShipmentPriority.URGENTE,
        )
        normal_assign = assign_shipment(normal_request)
        assert normal_assign is not None

        # Reset carrier load (re-fetch after first assignment)
        updated_carrier = get_carrier_by_id(sample_carrier.id)
        assert updated_carrier is not None

        urgent_assign = assign_shipment(urgent_request)
        assert urgent_assign is not None

        # Urgent cost should be higher than normal cost for same weight
        assert urgent_assign.coste_envio > normal_assign.coste_envio

    def test_assign_carrier_not_found(self, clean_logistics_db):
        """Failure mode: carrier does not exist → returns None."""
        request = ShipmentRequest(
            carrier_id="no-existe",
            peso_kg=10.0,
            origen="A", destino="B",
        )
        result = assign_shipment(request)
        assert result is None

    def test_assign_inactive_carrier_fails(self, inactive_carrier):
        """Failure mode: inactive carrier raises ValueError."""
        request = ShipmentRequest(
            carrier_id=inactive_carrier.id,
            peso_kg=10.0,
            origen="A", destino="B",
        )
        with pytest.raises(ValueError, match="no está disponible"):
            assign_shipment(request)

    def test_assign_full_carrier_fails(self, full_carrier):
        """Failure mode: carrier at full capacity raises ValueError."""
        request = ShipmentRequest(
            carrier_id=full_carrier.id,
            peso_kg=0.1,
            origen="A", destino="B",
        )
        with pytest.raises(ValueError, match="no tiene capacidad suficiente"):
            assign_shipment(request)

    def test_assign_zero_weight_fails(self, sample_carrier):
        """Failure mode: weight ≤ 0 is blocked by Pydantic."""
        with pytest.raises(Exception):
            ShipmentRequest(
                carrier_id=sample_carrier.id,
                peso_kg=0,
                origen="A", destino="B",
            )

    def test_assign_negative_weight_fails(self, sample_carrier):
        """Failure mode: negative weight is blocked by Pydantic."""
        with pytest.raises(Exception):
            ShipmentRequest(
                carrier_id=sample_carrier.id,
                peso_kg=-5.0,
                origen="A", destino="B",
            )

    def test_assign_baja_priority_cheaper(self, sample_carrier):
        """Boundary: baja priority costs less than normal."""
        request = ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=100.0,
            origen="A", destino="B",
            prioridad=ShipmentPriority.BAJA,
        )
        assignment = assign_shipment(request)
        assert assignment is not None
        assert assignment.coste_envio < 100.0 * sample_carrier.tarifa_kg  # less than base


# ======================================================================
# get_assignment_by_id / list_assignments_by_carrier
# ======================================================================


class TestGetAssignment:
    def test_get_assignment_found(self, sample_carrier):
        """Happy path: find an assignment by ID."""
        request = ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=25.0,
            origen="Madrid", destino="Zaragoza",
        )
        assignment = assign_shipment(request)
        assert assignment is not None

        found = get_assignment_by_id(assignment.id)
        assert found is not None
        assert found.id == assignment.id

    def test_get_assignment_not_found(self, clean_logistics_db):
        """Failure mode: non-existent assignment ID → returns None."""
        result = get_assignment_by_id("no-existe")
        assert result is None


class TestListAssignments:
    def test_list_by_carrier(self, sample_carrier):
        """Happy path: list assignments for a carrier."""
        assign_shipment(ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=10.0, origen="A", destino="B",
        ))
        assign_shipment(ShipmentRequest(
            carrier_id=sample_carrier.id,
            peso_kg=20.0, origen="B", destino="C",
        ))
        assignments = list_assignments_by_carrier(sample_carrier.id)
        assert len(assignments) >= 2
        assert all(a.carrier_id == sample_carrier.id for a in assignments)

    def test_list_by_carrier_no_data(self, clean_logistics_db):
        """Boundary: carrier with no assignments → empty list."""
        assignments = list_assignments_by_carrier("some-id")
        assert assignments == []


# ======================================================================
# _calculate_coste / calculate_shipping_cost
# ======================================================================


class TestCalculateCost:
    @pytest.mark.parametrize(
        ("peso", "tarifa", "prioridad", "esperado"),
        [
            (10.0, 5.0, ShipmentPriority.NORMAL, 50.0),    # 10*5*1.0
            (10.0, 5.0, ShipmentPriority.URGENTE, 125.0),  # 10*5*2.5
            (10.0, 5.0, ShipmentPriority.ALTA, 75.0),      # 10*5*1.5
            (10.0, 5.0, ShipmentPriority.BAJA, 40.0),      # 10*5*0.8
            (0.5, 10.0, ShipmentPriority.NORMAL, 5.0),     # 0.5*10*1.0
            (100.0, 2.0, ShipmentPriority.URGENTE, 500.0), # 100*2*2.5
        ],
    )
    def test_calculate_coste_various(self, peso, tarifa, prioridad, esperado):
        """Happy path: verify cost calculations for different inputs."""
        assert _calculate_coste(peso, tarifa, prioridad) == esperado

    def test_calculate_coste_rounding(self):
        """Boundary: verify rounding to 2 decimal places."""
        cost = _calculate_coste(3.333, 7.77, ShipmentPriority.NORMAL)
        # 3.333 * 7.77 = 25.89741 → round to 25.90
        assert cost == 25.90

    def test_calculate_shipping_cost_valid(self):
        """Happy path: calculate_shipping_cost standalone function."""
        cost = calculate_shipping_cost(10.0, 5.0, ShipmentPriority.NORMAL)
        assert cost == 50.0

    def test_calculate_shipping_cost_zero_peso_fails(self):
        """Failure mode: weight ≤ 0 raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            calculate_shipping_cost(0, 5.0)

    def test_calculate_shipping_cost_negative_peso_fails(self):
        """Failure mode: negative weight raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            calculate_shipping_cost(-10.0, 5.0)

    def test_calculate_shipping_cost_zero_tarifa_fails(self):
        """Failure mode: tarifa ≤ 0 raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            calculate_shipping_cost(10.0, 0)

    def test_calculate_shipping_cost_negative_tarifa_fails(self):
        """Failure mode: negative tarifa raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            calculate_shipping_cost(10.0, -5.0)

    def test_calculate_coste_default_priority(self):
        """Boundary: default priority (NORMAL)."""
        assert calculate_shipping_cost(10.0, 5.0) == 50.0


# ======================================================================
# Carrier model — domain logic
# ======================================================================


class TestCarrierModel:
    def test_puede_asignar_available(self):
        """Happy path: carrier can take a package within capacity."""
        carrier = Carrier(
            nombre="Test", tarifa_kg=5.0, capacidad_kg=100.0,
            peso_actual_kg=30.0,
        )
        assert carrier.puede_asignar(70.0) is True   # exactly remaining
        assert carrier.puede_asignar(69.9) is True   # under capacity
        assert carrier.puede_asignar(0.1) is True    # tiny package

    def test_puede_asignar_exceeds_capacity(self):
        """Failure mode: package exceeds available capacity."""
        carrier = Carrier(
            nombre="Test", tarifa_kg=5.0, capacidad_kg=100.0,
            peso_actual_kg=95.0,
        )
        assert carrier.puede_asignar(5.1) is False  # just over

    def test_puede_asignar_inactive(self):
        """Failure mode: inactive carrier cannot be assigned."""
        carrier = Carrier(
            nombre="Test", tarifa_kg=5.0, capacidad_kg=100.0,
            estado=CarrierStatus.INACTIVO,
        )
        assert carrier.puede_asignar(1.0) is False

    def test_peso_disponible(self):
        """Happy path: available weight calculation."""
        carrier = Carrier(
            nombre="Test", tarifa_kg=5.0, capacidad_kg=200.0,
            peso_actual_kg=50.0,
        )
        assert carrier.peso_disponible() == 150.0

    def test_peso_disponible_full(self):
        """Boundary: carrier at full capacity."""
        carrier = Carrier(
            nombre="Full", tarifa_kg=5.0, capacidad_kg=100.0,
            peso_actual_kg=100.0,
        )
        assert carrier.peso_disponible() == 0.0

    def test_peso_disponible_empty(self):
        """Boundary: carrier with no load."""
        carrier = Carrier(
            nombre="Empty", tarifa_kg=5.0, capacidad_kg=100.0,
            peso_actual_kg=0.0,
        )
        assert carrier.peso_disponible() == 100.0