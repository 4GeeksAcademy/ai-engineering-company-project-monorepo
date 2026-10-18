"""
test_router.py — Suite de Pruebas Integral del Flujo Agéntico de RFPs (Parte 1 de 3)

Valida los principios de Sistemas Multiagentes:
1. Router Pattern: Clasificación tipada precisa (Warehouse, Freight, API, Out of Scope).
2. Structured Handoff: Traspaso formal con contratos e interfaces explícitas.
3. Scoped Context: Aislamiento del contexto y prevención de fugas de estado global.
4. Human Review Gate: Activación de revisión humana para licitaciones críticas (>= $100k).
5. Trazabilidad del Grafo: Registro paso a paso en la pista de auditoría.
"""

import sys
import os

# Asegurar importación del directorio local
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import (
    RFPRequest,
    RFPRequirement,
    RFPClassification,
    RFPTaskHandoff,
    RFPWorkflowState,
    WarehouseProposalOutput,
    FreightProposalOutput,
    TechAPIProposalOutput,
    RejectionProposalOutput
)
from router import RFPRouterEngine


def run_tests():
    print("🚀 ==========================================================")
    print("🚀 INICIANDO SUITE DE PRUEBAS: ENRUTAMIENTO AGÉNTICO DE RFPS")
    print("🚀 ==========================================================\n")

    engine = RFPRouterEngine()
    passed_tests = 0
    total_tests = 7

    # ------------------------------------------------------------------
    # TEST 1: Enrutamiento a Almacenamiento (Warehouse Fulfillment)
    # ------------------------------------------------------------------
    print("📦 [TEST 1] Flujo de Almacenamiento & Cross-docking (Warehouse)...")
    req1 = RFPRequest(
        rfp_id="RFP-2026-WH-01",
        client_name="Inditex Logistics SL",
        title="Almacenaje de inventario y preparación de stock en Zaragoza",
        raw_text=(
            "Licitación para la contratación de 2.000 m2 de superficie en centro logístico "
            "de Zaragoza para gestión de stock, picking diario y cross-docking refrigerado."
        ),
        budget_usd=38000.0,
        submission_deadline="2026-11-30",
        target_locations=["Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-01", description="Superficie mínima de 2000m2 con temperatura controlada"),
            RFPRequirement(req_id="REQ-02", description="Integración con terminales de radiofrecuencia para picking")
        ]
    )

    state1 = engine.process_rfp(req1)

    assert state1.classification.category == "warehouse_fulfillment", f"Esperado warehouse_fulfillment, obtenido {state1.classification.category}"
    assert state1.handoff.target_agent == "warehouse_specialist", f"Agente incorrecto: {state1.handoff.target_agent}"
    assert state1.handoff.expected_output_schema == "WarehouseProposalOutput"
    assert state1.status == "completed"
    assert state1.specialist_result["warehouse_assigned"] == "Zaragoza"
    assert state1.specialist_result["feasibility"] == "accepted"
    print(f"   ✅ Clasificado en: '{state1.classification.category}' (Confianza: {state1.classification.confidence_score})")
    print(f"   ✅ Handoff despachado hacia: '{state1.handoff.target_agent}'")
    print(f"   ✅ Propuesta técnica emitida: {state1.specialist_result['allocated_space_sqm']} m2 en almacén {state1.specialist_result['warehouse_assigned']}")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 2: Enrutamiento a Transporte y Rutas (Freight Transport)
    # ------------------------------------------------------------------
    print("\n🚛 [TEST 2] Flujo de Transporte y Rutas de Larga Distancia (Freight)...")
    req2 = RFPRequest(
        rfp_id="RFP-2026-FR-02",
        client_name="Mercadona Distribución SA",
        title="Contratación de fletes de transporte terrestre y camiones",
        raw_text=(
            "Buscamos transportista homologado para ruta diaria de trailers refrigerados "
            "entre Zaragoza y Madrid, con servicio express de entrega same-day y control de km."
        ),
        budget_usd=55000.0,
        submission_deadline="2026-12-15",
        target_locations=["Madrid", "Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-FR-1", description="Trailers de 24T con motor frigorífico y telemetría GPS")
        ]
    )

    state2 = engine.process_rfp(req2)

    assert state2.classification.category == "freight_transport"
    assert state2.handoff.target_agent == "freight_specialist"
    assert state2.handoff.expected_output_schema == "FreightProposalOutput"
    assert state2.status == "completed"
    assert state2.specialist_result["service_level"] == "Express"
    print(f"   ✅ Clasificado en: '{state2.classification.category}' (Confianza: {state2.classification.confidence_score})")
    print(f"   ✅ Handoff despachado hacia: '{state2.handoff.target_agent}'")
    print(f"   ✅ Propuesta de flete: {state2.specialist_result['vehicle_type']} ({state2.specialist_result['transit_time_hours']}h tránsito)")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 3: Enrutamiento a Integración de Software (Tech API)
    # ------------------------------------------------------------------
    print("\n💻 [TEST 3] Flujo de Conectores de Software y Webhooks (Tech API)...")
    req3 = RFPRequest(
        rfp_id="RFP-2026-API-03",
        client_name="Decathlon International",
        title="Integración de API REST y Webhooks para telemetría ERP",
        raw_text=(
            "Requerimos desarrollo de conectores de software e integración de endpoints REST "
            "y stream de webhooks para sincronizar eventos de stock con nuestro ERP corporativo."
        ),
        budget_usd=42000.0,
        requirements=[
            RFPRequirement(req_id="REQ-API-1", description="Conectores REST con autenticación JWT y payloads JSON")
        ]
    )

    state3 = engine.process_rfp(req3)

    assert state3.classification.category == "api_integration"
    assert state3.handoff.target_agent == "tech_api_specialist"
    assert state3.handoff.expected_output_schema == "TechAPIProposalOutput"
    assert state3.status == "completed"
    assert state3.specialist_result["integration_type"] == "REST_API"
    print(f"   ✅ Clasificado en: '{state3.classification.category}' (Confianza: {state3.classification.confidence_score})")
    print(f"   ✅ Handoff despachado hacia: '{state3.handoff.target_agent}'")
    print(f"   ✅ Propuesta de integración: {state3.specialist_result['integration_type']} en {state3.specialist_result['estimated_implementation_weeks']} semanas")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 4: Solicitud Fuera de Alcance y Rechazo Estructurado
    # ------------------------------------------------------------------
    print("\n🛑 [TEST 4] Solicitud Fuera de Alcance (Out of Scope / Rejection)...")
    req4 = RFPRequest(
        rfp_id="RFP-2026-OUT-04",
        client_name="Bodas & Eventos Gourmet",
        title="Servicio de catering y coctelería para eventos",
        raw_text="Solicitamos cotización para el suministro de barra libre, canapés gourmet y tartas nupciales."
    )

    state4 = engine.process_rfp(req4)

    assert state4.classification.category == "out_of_scope"
    assert state4.handoff.target_agent == "rejection_handler"
    assert state4.handoff.expected_output_schema == "RejectionProposalOutput"
    assert state4.status == "rejected"
    assert state4.specialist_result["rejection_code"] == "OUT_OF_SCOPE_LOGISTICS"
    assert state4.specialist_result["notified_sales_rep"] is True
    print(f"   🛑 Detectada solicitud fuera de ámbito: '{state4.classification.category}'")
    print(f"   ✅ Handoff despachado al gestor de rechazo: '{state4.handoff.target_agent}'")
    print(f"   ✅ Notificación generada con código: '{state4.specialist_result['rejection_code']}'")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 5: Compuerta de Revisión Humana por Presupuesto Crítico (>= $100k)
    # ------------------------------------------------------------------
    print("\n👑 [TEST 5] Detección de Licitación Crítica (Human Review Gate)...")
    req5 = RFPRequest(
        rfp_id="RFP-2026-CRIT-05",
        client_name="Amazon Hub Network",
        title="Mega-licitación de Almacenamiento Centralizado en Los Angeles",
        raw_text="Proyecto plurianual de almacenamiento masivo y hub de distribución en Los Angeles.",
        budget_usd=350000.0,
        target_locations=["Los Angeles"]
    )

    state5 = engine.process_rfp(req5)

    assert state5.classification.priority == "critical"
    assert state5.classification.requires_human_review is True
    print(f"   ✅ Prioridad evaluada: '{state5.classification.priority.upper()}' (Presupuesto: ${req5.budget_usd:,.2f})")
    print(f"   🛑 Compuerta de revisión humana activada (requires_human_review = True)")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 6: Validación de Scoped Context (Sin fugas de estado global)
    # ------------------------------------------------------------------
    print("\n🔒 [TEST 6] Validación de Contexto Acotado (Scoped Context Principle)...")
    # El handoff de almacén solo debe contener lo que el especialista necesita
    inputs = state1.handoff.scoped_inputs
    assert "target_locations" in inputs, "Faltan ubicaciones objetivo en scoped_inputs"
    assert "requirements" in inputs, "Faltan requerimientos técnicos en scoped_inputs"
    assert "routing_trail" not in inputs, "Fuga detectada: el especialista no debe recibir el historial de routing"
    assert "raw_text" not in inputs, "Fuga detectada: el especialista no debe recibir el texto no estructurado completo"
    print(f"   ✅ Scoped Context validado: {len(inputs)} variables transmitidas sin filtrar historial ni texto libre.")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 7: Trazabilidad y Pista de Auditoría del Grafo (Audit Trail)
    # ------------------------------------------------------------------
    print("\n📊 [TEST 7] Trazabilidad y Pista de Auditoría del Grafo (Audit Trail)...")
    trail = state1.routing_trail
    assert len(trail) >= 4, f"Se esperaban al menos 4 transiciones en el log, encontradas: {len(trail)}"
    nodes_visited = [step["node"] for step in trail]
    assert "ingestion_node" in nodes_visited
    assert "router_node" in nodes_visited
    assert "handoff_factory" in nodes_visited
    assert "warehouse_specialist" in nodes_visited

    print(f"   ✅ Grafo ejecutó secuencialmente los nodos: {' -> '.join(nodes_visited)}")
    print(f"   ✅ Total de eventos auditados: {len(trail)}")
    passed_tests += 1

    # ------------------------------------------------------------------
    # RESUMEN FINAL
    # ------------------------------------------------------------------
    print("\n🎉 ==========================================================")
    print(f"🎉 SUITE MULTIAGENTE SUPERADA: {passed_tests}/{total_tests} TESTS COMPLETADOS AL 100%")
    print("🎉 ==========================================================\n")


if __name__ == "__main__":
    run_tests()
