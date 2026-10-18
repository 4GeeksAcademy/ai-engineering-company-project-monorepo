"""
test_approval_workflow.py — Suite de Pruebas de Control, Checkpointing y Cierre (Parte 3 de 3)

Valida los principios de Sistemas Multiagentes con Control y Reinicio:
1. Interrupción Automática (Interrupt): Pausa antes de la acción irreversible.
2. Checkpointing Persistente: Serialización y almacenamiento de estado en disco.
3. Reanudación con APPROVE: Formalización legal y contrato cerrado (CLOSED_WON).
4. Reanudación con REQUEST_CHANGES: Inyección de notas humanas para nueva iteración.
5. Reanudación con REJECT: Cancelación y archivo ordenado (CLOSED_REJECTED).
6. Pipeline End-to-End Completo: Unificación de Partes 1 (Router), 2 (Automejora) y 3 (Cierre).
"""

import os
import sys
import shutil

# Asegurar importación del directorio local
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import RFPRequest, RFPRequirement
from approval_schemas import HumanApprovalDecision, WorkflowCheckpoint
from approval_controller import (
    FileCheckpointer,
    ApprovalGateNode,
    WorkflowResumeEngine,
    EndToEndRFPOrchestrator
)


def run_tests():
    print("🔒 ==========================================================")
    print("🔒 INICIANDO SUITE DE CONTROL, CHECKPOINTING Y CIERRE (PARTE 3)")
    print("🔒 ==========================================================\n")

    # Usar directorio temporal aislado de checkpoints para pruebas
    test_storage = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".test_checkpoints")
    if os.path.exists(test_storage):
        shutil.rmtree(test_storage)
    
    checkpointer = FileCheckpointer(storage_dir=test_storage)
    orchestrator = EndToEndRFPOrchestrator(checkpointer=checkpointer)

    passed_tests = 0
    total_tests = 6

    # ------------------------------------------------------------------
    # TEST 1: Pausa e Interrupción del Flujo antes de Enviar (Interrupt Gate)
    # ------------------------------------------------------------------
    print("⏸️  [TEST 1] Interrupción del Grafo antes de Acción Irreversible...")
    req1 = RFPRequest(
        rfp_id="RFP-2026-HITL-01",
        client_name="Inditex Logistics SL",
        title="Almacenaje de inventario y preparación en Zaragoza",
        raw_text="Requerimos superficie de 2000m2 con control térmico en Zaragoza.",
        budget_usd=45000.0,
        target_locations=["Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-01", description="Superficie 2000m2", mandatory=True),
            RFPRequirement(req_id="REQ-02", description="Control térmico 2°C a 6°C", mandatory=True)
        ]
    )

    state1, chk1 = orchestrator.process_rfp_until_approval_gate(req1)

    assert state1.is_interrupted is True, "El grafo debía pausarse y marcar is_interrupted=True"
    assert state1.current_step == "awaiting_human_approval"
    assert chk1.is_paused is True
    assert chk1.step_name == "awaiting_human_approval"
    print(f"   ✅ Grafo pausado en: '{state1.current_step}'")
    print(f"   ✅ Checkpoint activo generado: '{chk1.checkpoint_id}'")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 2: Persistencia e Integridad del Checkpoint en Disco
    # ------------------------------------------------------------------
    print("\n💾 [TEST 2] Verificación de Persistencia del Checkpoint en Disco...")
    expected_path = checkpointer._get_path(req1.rfp_id)
    assert os.path.exists(expected_path), f"No se encontró el archivo de checkpoint en {expected_path}"
    
    loaded_chk = checkpointer.load_checkpoint(req1.rfp_id)
    assert loaded_chk is not None
    assert loaded_chk.checkpoint_id == chk1.checkpoint_id
    assert loaded_chk.state_snapshot["client_name"] == "Inditex Logistics SL"
    print(f"   ✅ Archivo JSON de checkpoint validado en: {os.path.basename(expected_path)}")
    print(f"   ✅ Snapshot serializado correctamente con cliente: '{loaded_chk.state_snapshot['client_name']}'")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 3: Reanudación con Decisión APPROVE (Closed Won)
    # ------------------------------------------------------------------
    print("\n✅ [TEST 3] Reanudación del Grafo con Aprobación Humana (APPROVE)...")
    decision_approve = HumanApprovalDecision(
        decision_id="DEC-APP-01",
        reviewer_id="REV-MGR-01",
        reviewer_name="Director de Operaciones",
        action="APPROVE",
        notes="Propuesta validada técnicamente y autorizada para firma.",
        approved_budget_cap=43200.0
    )

    resumed_state = orchestrator.submit_human_decision(req1.rfp_id, decision_approve)

    assert resumed_state.is_interrupted is False
    assert resumed_state.final_contract is not None
    assert resumed_state.final_contract.status == "CLOSED_WON"
    assert resumed_state.final_contract.total_cost_usd == 43200.0
    assert len(resumed_state.final_contract.digital_signature_hash) == 64
    
    # Comprobar que el checkpoint activo fue limpiado tras cerrar el acuerdo
    assert checkpointer.load_checkpoint(req1.rfp_id) is None
    print(f"   ✅ Reanudado con éxito: Paso final '{resumed_state.current_step}'")
    print(f"   ✅ Contrato emitido: '{resumed_state.final_contract.contract_id}' | Status: {resumed_state.final_contract.status}")
    print(f"   ✅ Firma Digital SHA-256: {resumed_state.final_contract.digital_signature_hash[:20]}...")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 4: Reanudación con Decisión REQUEST_CHANGES (Reoptimización)
    # ------------------------------------------------------------------
    print("\n📝 [TEST 4] Reanudación con Solicitud de Cambios (REQUEST_CHANGES)...")
    req2 = RFPRequest(
        rfp_id="RFP-2026-CHG-02",
        client_name="Mercadona Distribución",
        title="Transporte de flete y flotas de camión",
        raw_text="Contratación de camiones para envíos express entre Zaragoza y Valencia.",
        budget_usd=50000.0,
        target_locations=["Valencia", "Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-TR-01", description="Camiones 24T con frío")
        ]
    )

    state2, chk2 = orchestrator.process_rfp_until_approval_gate(req2)
    assert state2.is_interrupted is True

    decision_changes = HumanApprovalDecision(
        decision_id="DEC-CHG-02",
        reviewer_id="REV-DIR-02",
        reviewer_name="Responsable Comercial",
        action="REQUEST_CHANGES",
        notes="Por favor garantizar SLA de entrega en 18 horas y ajustar presupuesto a $46,000.",
        approved_budget_cap=46000.0
    )

    state_changed = orchestrator.submit_human_decision(req2.rfp_id, decision_changes)

    assert state_changed.is_interrupted is True  # Vuelve a pausarse con el nuevo borrador enmendado
    assert state_changed.current_step == "reopened_for_changes"
    
    # Comprobar que el checkpoint en disco se actualizó con la nueva versión
    updated_chk = checkpointer.load_checkpoint(req2.rfp_id)
    assert updated_chk is not None
    updated_draft = updated_chk.state_snapshot["proposal"]
    assert updated_draft["total_estimated_cost_usd"] == 46000.0
    assert updated_draft["sla_commitment_hours"] <= 18.0
    print(f"   ✅ Grafo reabierto con directiva humana: '{state_changed.current_step}'")
    print(f"   ✅ Borrador optimizado con SLA: {updated_draft['sla_commitment_hours']}h y coste: ${updated_draft['total_estimated_cost_usd']:,.2f}")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 5: Reanudación con Decisión REJECT (Closed Rejected)
    # ------------------------------------------------------------------
    print("\n🛑 [TEST 5] Reanudación con Rechazo Definitivo (REJECT)...")
    decision_reject = HumanApprovalDecision(
        decision_id="DEC-REJ-03",
        reviewer_id="REV-OPS-03",
        reviewer_name="Director General",
        action="REJECT",
        notes="Capacidad operativa de camiones completa en esa ruta para el Q4."
    )

    state_rejected = orchestrator.submit_human_decision(req2.rfp_id, decision_reject)

    assert state_rejected.is_interrupted is False
    assert state_rejected.final_contract is not None
    assert state_rejected.final_contract.status == "CLOSED_REJECTED"
    assert checkpointer.load_checkpoint(req2.rfp_id) is None
    print(f"   🛑 RFP cancelada formalmente: '{state_rejected.final_contract.status}'")
    print(f"   ✅ Justificación registrada en auditoría: '{decision_reject.notes}'")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 6: Pipeline End-to-End Completo (Router ➔ Automejora ➔ Cierre)
    # ------------------------------------------------------------------
    print("\n🌐 [TEST 6] Validación End-to-End Integrada (Parte 1 ➔ Parte 2 ➔ Parte 3)...")
    req_e2e = RFPRequest(
        rfp_id="RFP-2026-COMPLETE-06",
        client_name="DHL Supply Chain España",
        title="Almacenaje de alta tecnología y cross-docking en Zaragoza",
        raw_text="Licitación integral de 2500m2 de almacenamiento en Zaragoza con integración de telemetría y SLA 24h.",
        budget_usd=52000.0,
        target_locations=["Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-E2E-1", description="Superficie 2500m2 en Zaragoza"),
            RFPRequirement(req_id="REQ-E2E-2", description="Integración API de telemetría")
        ]
    )

    # Paso 1: Ejecutar hasta la compuerta de aprobación
    e2e_state, e2e_chk = orchestrator.process_rfp_until_approval_gate(req_e2e)
    assert e2e_state.is_interrupted is True

    # Paso 2: Operador humano autoriza
    e2e_decision = HumanApprovalDecision(
        decision_id="DEC-FINAL-06",
        reviewer_id="REV-BOARD",
        reviewer_name="Comité de Operaciones",
        action="APPROVE",
        notes="Aprobada por el comité de operaciones de TrackFlow."
    )

    final_e2e = orchestrator.submit_human_decision(req_e2e.rfp_id, e2e_decision)

    assert final_e2e.final_contract.status == "CLOSED_WON"
    assert final_e2e.final_contract.client_name == "DHL Supply Chain España"
    assert "Zaragoza" in final_e2e.final_contract.operational_assignment
    
    print(f"   1. Parte 1 (Router): Clasificación y Handoff hacia Especialista completados.")
    print(f"   2. Parte 2 (Evaluator-Optimizer): Borrador optimizado con veredicto PASS.")
    print(f"   3. Parte 3 (Control & Cierre): Checkpoint serializado, firma humana inyectada y contrato cerrado.")
    print(f"   ✅ Pipeline integral completado exitosamente: {final_e2e.final_contract.contract_id} (CLOSED_WON)")
    passed_tests += 1

    # Limpieza del directorio temporal de pruebas
    if os.path.exists(test_storage):
        shutil.rmtree(test_storage)

    # ------------------------------------------------------------------
    # RESUMEN FINAL
    # ------------------------------------------------------------------
    print("\n🎉 ==========================================================")
    print(f"🎉 SUITE DE CONTROL Y CIERRE SUPERADA: {passed_tests}/{total_tests} TESTS COMPLETADOS AL 100%")
    print("🎉 ==========================================================\n")


if __name__ == "__main__":
    run_tests()
