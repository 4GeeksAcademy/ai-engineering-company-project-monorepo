"""
test_evaluator_optimizer.py — Suite de Pruebas del Patrón Evaluator-Optimizer (Parte 2 de 3)

Valida los principios de Multiagentes de Automejora:
1. Bucle Generate -> Critique -> Revise: Mejora medible entre iteraciones.
2. Feedback estructurado accionable: El evaluador emite rúbricas y requerimientos faltantes explícitos.
3. Condición de parada y resiliencia: Prevención de bucles infinitos con parada en max_iterations.
4. Integración completa: Router (Parte 1) + Evaluator-Optimizer (Parte 2).
5. Trazabilidad e historial de versiones: Preservación de todos los borradores y scores.
"""

import sys
import os

# Asegurar importación del directorio local
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import RFPRequest, RFPRequirement, RFPTaskHandoff
from router import RFPRouterEngine
from evaluator_schemas import (
    RFPProposalDraft,
    EvaluationCriterion,
    EvaluationFeedback,
    ProposalIterationState
)
from evaluator_optimizer import (
    ProposalGenerator,
    ProposalEvaluator,
    ProposalOptimizer,
    RFPEvaluatorOptimizerLoop
)


def run_tests():
    print("🔄 ==========================================================")
    print("🔄 INICIANDO SUITE DE PRUEBAS: PATRÓN EVALUATOR-OPTIMIZER")
    print("🔄 ==========================================================\n")

    passed_tests = 0
    total_tests = 5

    # ------------------------------------------------------------------
    # TEST 1: Ciclo Completo de Automejora (Fail v1 -> Pass v2)
    # ------------------------------------------------------------------
    print("📈 [TEST 1] Ciclo de Automejora Medible (Iteración 1 FAIL ➔ Iteración 2 PASS)...")
    req1 = RFPRequest(
        rfp_id="RFP-2026-VAL-01",
        client_name="Inditex Logistics SL",
        title="Almacenaje de inventario textil y control térmico en Zaragoza",
        raw_text="Requerimos superficie de 2000m2 con control térmico (2°C-6°C) en Zaragoza y SLA competitivo.",
        budget_usd=45000.0,
        target_locations=["Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-01", description="Superficie de 2000m2 para almacenamiento y picking"),
            RFPRequirement(req_id="REQ-02", description="Control de temperatura refrigerada entre 2 y 6 grados")
        ]
    )

    handoff1 = RFPTaskHandoff(
        handoff_id="HO-WH-01",
        rfp_id=req1.rfp_id,
        target_agent="warehouse_specialist",
        task_instruction="Evaluar viabilidad y redactar propuesta técnica.",
        scoped_inputs={"target_locations": ["Zaragoza"], "budget_usd": req1.budget_usd},
        expected_output_schema="WarehouseProposalOutput"
    )

    loop = RFPEvaluatorOptimizerLoop(max_iterations=3)
    state1 = loop.run(handoff1, req1)

    assert len(state1.draft_history) == 2, f"Se esperaban 2 borradores, obtenidos {len(state1.draft_history)}"
    assert len(state1.feedback_history) == 2, f"Se esperaban 2 evaluaciones, obtenidas {len(state1.feedback_history)}"
    
    # Comprobación de iteración 1
    f1 = state1.feedback_history[0]
    assert f1.verdict == "FAIL", f"Esperado FAIL en v1, obtenido {f1.verdict}"
    assert "REQ-02" in f1.missing_requirements
    
    # Comprobación de iteración 2
    f2 = state1.feedback_history[1]
    assert f2.verdict == "PASS", f"Esperado PASS en v2, obtenido {f2.verdict}"
    assert len(f2.missing_requirements) == 0
    assert f2.overall_score > f1.overall_score, "El score no aumentó tras la optimización"
    assert state1.final_status == "APPROVED"
    assert state1.approved_proposal is not None

    print(f"   Iteración 1: Veredicto={f1.verdict} | Puntuación={f1.overall_score}/100 | Faltantes={f1.missing_requirements}")
    print(f"   Iteración 2: Veredicto={f2.verdict} | Puntuación={f2.overall_score}/100 | Faltantes={f2.missing_requirements}")
    print(f"   ✅ Propuesta Aprobada tras automejora (+{round(f2.overall_score - f1.overall_score, 1)} pts).")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 2: Verificación de Feedback Estructurado y Accionable
    # ------------------------------------------------------------------
    print("\n📝 [TEST 2] Verificación de Feedback Estructurado (No texto libre ambiguo)...")
    draft_test = state1.draft_history[0]
    evaluator = ProposalEvaluator()
    feedback = evaluator.evaluate(draft_test, req1)

    assert isinstance(feedback.overall_score, float)
    assert isinstance(feedback.criteria_results, list)
    assert len(feedback.criteria_results) == 4, "La rúbrica debe contener exactamente 4 criterios evaluados"
    assert len(feedback.actionable_instructions) > 20
    assert "REQ-02" in feedback.actionable_instructions

    print(f"   ✅ Desglose de rúbrica:")
    for c in feedback.criteria_results:
        print(f"      - {c.criterion_name}: {c.score}/100 (Peso: {c.weight}) -> Passed={c.passed}")
    print(f"   ✅ Instrucción accionable generada: '{feedback.actionable_instructions.splitlines()[0]}...'")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 3: Condición de Parada por Límite de Seguridad (max_iterations)
    # ------------------------------------------------------------------
    print("\n🛑 [TEST 3] Condición de Parada por Límite de Iteraciones (Sin bucles infinitos)...")
    # Creamos un evaluador estricto que siempre fuerce FAIL para comprobar el tope de parada
    class StrictMockEvaluator(ProposalEvaluator):
        def evaluate(self, draft: RFPProposalDraft, request: RFPRequest) -> EvaluationFeedback:
            fb = super().evaluate(draft, request)
            # Forzar FAIL
            return EvaluationFeedback(
                feedback_id=fb.feedback_id,
                proposal_id=draft.proposal_id,
                iteration=draft.iteration,
                verdict="FAIL",
                overall_score=50.0,
                pass_threshold=80.0,
                criteria_results=fb.criteria_results,
                missing_requirements=["REQ-IMPOSSIBLE"],
                actionable_instructions="Revisión obligatoria adicional requerida."
            )

    strict_loop = RFPEvaluatorOptimizerLoop(max_iterations=2)
    strict_loop.evaluator = StrictMockEvaluator()
    strict_state = strict_loop.run(handoff1, req1)

    assert strict_state.current_iteration == 2, f"Debió detenerse exactamente en 2, iteraciones={strict_state.current_iteration}"
    assert strict_state.final_status == "ESCALATED_HUMAN_REVIEW", f"Esperado ESCALATED_HUMAN_REVIEW, obtenido {strict_state.final_status}"
    assert strict_state.approved_proposal is None, "No debe haber propuesta aprobada en escalado"
    print(f"   ✅ El bucle se detuvo limpiamente tras alcanzar max_iterations ({strict_state.current_iteration}).")
    print(f"   ✅ Estado final de contingencia: '{strict_state.final_status}'.")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 4: Integración Completa End-to-End: Router (Parte 1) + Evaluator-Optimizer (Parte 2)
    # ------------------------------------------------------------------
    print("\n🔗 [TEST 4] Integración End-to-End: Router ➔ Scoped Handoff ➔ Evaluator-Optimizer...")
    router_engine = RFPRouterEngine()
    
    req_transport = RFPRequest(
        rfp_id="RFP-2026-E2E-04",
        client_name="Amazon Hub Distribución",
        title="Contratación de transporte urgente para ruta Zaragoza-Madrid",
        raw_text="Requerimos flota de trailers frigoríficos para ruta de transporte diario express entre Zaragoza y Madrid.",
        budget_usd=60000.0,
        target_locations=["Madrid", "Zaragoza"],
        requirements=[
            RFPRequirement(req_id="REQ-TR-01", description="Flota de trailers con equipo frigorífico", mandatory=True),
            RFPRequirement(req_id="REQ-TR-02", description="SLA de entrega express en menos de 24 horas", mandatory=True)
        ]
    )

    # 1. Enrutamiento mediante Router de la Parte 1
    routed_state = router_engine.process_rfp(req_transport)
    assert routed_state.classification.category == "freight_transport"
    assert routed_state.handoff.target_agent == "freight_specialist"
    print(f"   1. Router despachó a: '{routed_state.handoff.target_agent}' con categoría '{routed_state.classification.category}'")

    # 2. Generación y Automejora mediante Evaluator-Optimizer de la Parte 2
    e2e_loop = RFPEvaluatorOptimizerLoop(max_iterations=3)
    e2e_state = e2e_loop.run(routed_state.handoff, req_transport)

    assert e2e_state.final_status == "APPROVED"
    assert e2e_state.approved_proposal is not None
    assert e2e_state.approved_proposal.total_estimated_cost_usd <= req_transport.budget_usd
    print(f"   2. Evaluator-Optimizer finalizó con estado: '{e2e_state.final_status}'")
    print(f"   3. Propuesta aprobada cotizada en: ${e2e_state.approved_proposal.total_estimated_cost_usd:,.2f} USD")
    passed_tests += 1

    # ------------------------------------------------------------------
    # TEST 5: Trazabilidad e Inmutabilidad de Versiones
    # ------------------------------------------------------------------
    print("\n📚 [TEST 5] Trazabilidad e Historial Inmutable de Versiones...")
    history = state1.draft_history
    assert len(history) >= 2
    assert history[0].iteration == 1
    assert history[1].iteration == 2
    # El borrador v1 no fue sobreescrito ni mutado
    assert len(history[0].addressed_requirements) < len(history[1].addressed_requirements)
    print(f"   ✅ Versión 1 preservada: {len(history[0].addressed_requirements)} requisitos atendidos, SLA {history[0].sla_commitment_hours}h.")
    print(f"   ✅ Versión 2 preservada: {len(history[1].addressed_requirements)} requisitos atendidos, SLA {history[1].sla_commitment_hours}h.")
    passed_tests += 1

    # ------------------------------------------------------------------
    # RESUMEN FINAL
    # ------------------------------------------------------------------
    print("\n🎉 ==========================================================")
    print(f"🎉 SUITE EVALUATOR-OPTIMIZER SUPERADA: {passed_tests}/{total_tests} TESTS COMPLETADOS AL 100%")
    print("🎉 ==========================================================\n")


if __name__ == "__main__":
    run_tests()
