"""
evaluator_optimizer.py — Motor del Patrón Evaluator-Optimizer para Propuestas de RFPs
Hito: Flujo Agéntico de RFPs: Generación de Respuestas (Parte 2 de 3)

Componentes:
1. ProposalGenerator: Generación del borrador inicial a partir del handoff.
2. ProposalEvaluator: Evaluación con rúbrica objetiva y feedback accionable.
3. ProposalOptimizer: Refinamiento del borrador en base a la crítica recibida.
4. RFPEvaluatorOptimizerLoop: Orquestación del bucle con condición de parada segura.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from schemas import RFPRequest, RFPTaskHandoff
from evaluator_schemas import (
    RFPProposalDraft,
    EvaluationCriterion,
    EvaluationFeedback,
    EvaluationVerdict,
    ProposalIterationState
)


class ProposalGenerator:
    """
    Nodo Generador: Redacta el borrador inicial de la propuesta técnica.
    En una primera pasada, puede omitir detalles sutiles o tener desviaciones menores
    que el evaluador deberá detectar.
    """

    def generate_initial_draft(self, handoff: RFPTaskHandoff, request: RFPRequest) -> RFPProposalDraft:
        proposal_id = f"PROP-{uuid.uuid4().hex[:8].upper()}"
        inputs = handoff.scoped_inputs

        # Determinación de parámetros base según target_agent
        target_agent = handoff.target_agent
        warehouse_loc = inputs.get("target_locations", ["Zaragoza"])[0] if inputs.get("target_locations") else "Zaragoza"
        
        # Simulación de primer borrador: Atiende el primer requerimiento pero puede dejar requerimientos secundarios pendientes
        req_ids = [r.req_id for r in request.requirements]
        initially_addressed = [req_ids[0]] if req_ids else ["REQ-GEN-01"]

        budget = request.budget_usd or 50000.0
        # Inicialmente el generador puede cotizar con un 10% por encima del presupuesto óptimo
        initial_cost = round(budget * 1.08, 2)

        return RFPProposalDraft(
            proposal_id=proposal_id,
            rfp_id=request.rfp_id,
            iteration=1,
            executive_summary=(
                f"Propuesta técnica y comercial para {request.client_name} gestionada por {target_agent}. "
                f"Solución adaptada a las operaciones logísticas en {warehouse_loc}."
            ),
            technical_solution=(
                f"Despliegue operativo estándar en {warehouse_loc}. Cobertura del requerimiento principal "
                f"'{initially_addressed[0]}' con operativas de estanterías y gestión de inventario centralizada."
            ),
            addressed_requirements=initially_addressed,
            warehouse_location=warehouse_loc if "warehouse" in target_agent else None,
            carrier_fleet="TrackFlow Dedicated Fleet" if "freight" in target_agent else None,
            total_estimated_cost_usd=initial_cost,
            sla_commitment_hours=48.0,  # SLA estándar inicial
            assumptions_and_limits=[
                "Tarifas válidas por 60 días",
                "Sujeto a confirmación de volumen mensual"
            ]
        )


class ProposalEvaluator:
    """
    Nodo Evaluador: Somete el borrador a una rúbrica objetiva y estructurada.
    Verifica cobertura de requisitos obligatorios, alineación presupuestaria y factibilidad de SLAs.
    """

    PASS_THRESHOLD = 80.0

    def evaluate(self, draft: RFPProposalDraft, request: RFPRequest) -> EvaluationFeedback:
        feedback_id = f"FB-{uuid.uuid4().hex[:8].upper()}"
        criteria_results: List[EvaluationCriterion] = []
        missing_requirements: List[str] = []
        critique_points: List[str] = []

        # -------------------------------------------------------------
        # Criterio 1: Cobertura de Requisitos Obligatorios (Peso: 0.35)
        # -------------------------------------------------------------
        all_reqs = request.requirements
        mandatory_reqs = [r for r in all_reqs if r.mandatory]
        
        if mandatory_reqs:
            covered_mandatory = [
                r for r in mandatory_reqs if r.req_id in draft.addressed_requirements
            ]
            coverage_pct = len(covered_mandatory) / len(mandatory_reqs)
            c1_score = round(coverage_pct * 100.0, 1)
            
            for r in mandatory_reqs:
                if r.req_id not in draft.addressed_requirements:
                    missing_requirements.append(r.req_id)
                    critique_points.append(f"Falta atender el requisito obligatorio '{r.req_id}': {r.description}")
        else:
            c1_score = 90.0

        c1_passed = c1_score >= 80.0 and len(missing_requirements) == 0
        criteria_results.append(EvaluationCriterion(
            criterion_name="Cobertura de Requerimientos Obligatorios",
            weight=0.35,
            score=c1_score,
            passed=c1_passed,
            critique=(
                "Todos los requisitos obligatorios están cubiertos."
                if c1_passed
                else f"Incompleto: Faltan {len(missing_requirements)} requisitos obligatorios por abordar."
            )
        ))

        # -------------------------------------------------------------
        # Criterio 2: Consistencia Financiera y Presupuesto (Peso: 0.30)
        # -------------------------------------------------------------
        client_budget = request.budget_usd
        budget_deviation = None
        c2_score = 95.0

        if client_budget and client_budget > 0:
            if draft.total_estimated_cost_usd > client_budget:
                diff = draft.total_estimated_cost_usd - client_budget
                budget_deviation = round((diff / client_budget) * 100.0, 2)
                # Penalización progresiva si excede presupuesto
                c2_score = max(40.0, round(90.0 - (budget_deviation * 3), 1))
                critique_points.append(
                    f"El coste cotizado (${draft.total_estimated_cost_usd:,.2f}) supera el presupuesto del cliente "
                    f"(${client_budget:,.2f}) en un {budget_deviation}%."
                )
            else:
                c2_score = 95.0

        c2_passed = c2_score >= 75.0 and (budget_deviation is None or budget_deviation <= 5.0)
        criteria_results.append(EvaluationCriterion(
            criterion_name="Consistencia Financiera y Presupuesto",
            weight=0.30,
            score=c2_score,
            passed=c2_passed,
            critique=(
                "Presupuesto dentro del margen financiero esperado."
                if c2_passed
                else f"Desviación financiera del {budget_deviation}% respecto al límite del cliente."
            )
        ))

        # -------------------------------------------------------------
        # Criterio 3: Factibilidad Operativa y Compromiso de SLAs (Peso: 0.20)
        # -------------------------------------------------------------
        # Para servicios logísticos de TrackFlow, SLAs mayores a 36h requieren optimización
        if draft.sla_commitment_hours > 36.0:
            c3_score = 65.0
            c3_passed = False
            critique_points.append(
                f"SLA comprometido de {draft.sla_commitment_hours}h es demasiado laxo para estándares competitivos de TrackFlow (recomendado <= 24h)."
            )
        else:
            c3_score = 95.0
            c3_passed = True

        criteria_results.append(EvaluationCriterion(
            criterion_name="Factibilidad Operativa y SLAs",
            weight=0.20,
            score=c3_score,
            passed=c3_passed,
            critique=(
                f"SLA de {draft.sla_commitment_hours}h competitivo y operativo."
                if c3_passed
                else f"SLA de {draft.sla_commitment_hours}h no competitivo."
            )
        ))

        # -------------------------------------------------------------
        # Criterio 4: Estructura Comercial y Tono Profesional (Peso: 0.15)
        # -------------------------------------------------------------
        has_summary = len(draft.executive_summary) >= 30
        has_limits = len(draft.assumptions_and_limits) >= 1
        c4_score = 90.0 if (has_summary and has_limits) else 60.0
        c4_passed = c4_score >= 80.0

        criteria_results.append(EvaluationCriterion(
            criterion_name="Estructura Comercial y Tono Profesional",
            weight=0.15,
            score=c4_score,
            passed=c4_passed,
            critique="Estructura formal y cláusulas claras." if c4_passed else "Resumen o asunciones insuficientes."
        ))

        # -------------------------------------------------------------
        # Cálculo de Nota Global Ponderada y Veredicto
        # -------------------------------------------------------------
        overall_score = round(sum(c.weight * c.score for c in criteria_results), 1)
        
        # Para aprobar debe superar el umbral Y no tener requerimientos obligatorios pendientes
        is_pass = overall_score >= self.PASS_THRESHOLD and len(missing_requirements) == 0 and c2_passed
        verdict: EvaluationVerdict = "PASS" if is_pass else "FAIL"

        # Construcción de instrucciones accionables de revisión
        if is_pass:
            instructions = "La propuesta cumple con la totalidad de los criterios de calidad. Aprobada para envío al cliente."
        else:
            instructions = (
                "Revisión requerida:\n" +
                "\n".join([f"- {cp}" for cp in critique_points]) +
                f"\nAjustar el borrador para que la nota global supere los {self.PASS_THRESHOLD} puntos."
            )

        return EvaluationFeedback(
            feedback_id=feedback_id,
            proposal_id=draft.proposal_id,
            iteration=draft.iteration,
            verdict=verdict,
            overall_score=overall_score,
            pass_threshold=self.PASS_THRESHOLD,
            criteria_results=criteria_results,
            missing_requirements=missing_requirements,
            budget_deviation_pct=budget_deviation,
            actionable_instructions=instructions
        )


class ProposalOptimizer:
    """
    Nodo Optimizador / Revisor:
    Toma el borrador anterior y el feedback del evaluador para producir un borrador mejorado.
    """

    def refine_draft(
        self,
        previous_draft: RFPProposalDraft,
        feedback: EvaluationFeedback,
        request: RFPRequest
    ) -> RFPProposalDraft:
        next_iteration = previous_draft.iteration + 1

        # 1. Resolver requerimientos faltantes
        updated_requirements = list(previous_draft.addressed_requirements)
        resolved_details = []
        for req in request.requirements:
            if req.req_id in feedback.missing_requirements:
                updated_requirements.append(req.req_id)
                resolved_details.append(f"Módulo implementado para {req.req_id} ({req.description}).")

        # 2. Ajustar costes si había desviación presupuestaria
        client_budget = request.budget_usd or previous_draft.total_estimated_cost_usd
        if feedback.budget_deviation_pct and feedback.budget_deviation_pct > 0:
            # Reajustar coste dentro del 96% del presupuesto del cliente para garantizar margen y aprobación
            optimized_cost = round(client_budget * 0.96, 2)
        else:
            optimized_cost = min(previous_draft.total_estimated_cost_usd, client_budget)

        # 3. Optimizar SLAs si fueron criticados
        optimized_sla = 24.0 if previous_draft.sla_commitment_hours > 24.0 else previous_draft.sla_commitment_hours

        # 4. Enriquecer la solución técnica y resumen
        extra_technical = " " + " ".join(resolved_details) if resolved_details else ""
        revised_summary = (
            f"{previous_draft.executive_summary} [Revisión v{next_iteration}]: "
            f"Optimizada con cobertura integral de requerimientos y ajuste de SLAs competitivos a {optimized_sla}h."
        )

        revised_assumptions = list(previous_draft.assumptions_and_limits)
        revised_assumptions.append(f"Actualizado en iteración {next_iteration} en respuesta al feedback de auditoría")

        return RFPProposalDraft(
            proposal_id=previous_draft.proposal_id,
            rfp_id=previous_draft.rfp_id,
            iteration=next_iteration,
            executive_summary=revised_summary,
            technical_solution=previous_draft.technical_solution + extra_technical,
            addressed_requirements=list(set(updated_requirements)),
            warehouse_location=previous_draft.warehouse_location,
            carrier_fleet=previous_draft.carrier_fleet,
            total_estimated_cost_usd=optimized_cost,
            sla_commitment_hours=optimized_sla,
            assumptions_and_limits=revised_assumptions
        )


class RFPEvaluatorOptimizerLoop:
    """
    Orquestador del Bucle Evaluator-Optimizer.
    Ejecuta el ciclo:
        Generate ➔ Evaluate ➔ (¿PASS o max_iterations?) ➔ Revise ➔ Re-Evaluate
    """

    def __init__(self, max_iterations: int = 3):
        self.generator = ProposalGenerator()
        self.evaluator = ProposalEvaluator()
        self.optimizer = ProposalOptimizer()
        self.max_iterations = max_iterations

    def run(self, handoff: RFPTaskHandoff, request: RFPRequest) -> ProposalIterationState:
        state = ProposalIterationState(rfp_id=request.rfp_id, max_iterations=self.max_iterations)

        # Paso 1: Generación del borrador inicial (v1)
        current_draft = self.generator.generate_initial_draft(handoff, request)
        state.add_draft(current_draft)

        while True:
            # Paso 2: Evaluación con rúbrica objetiva
            feedback = self.evaluator.evaluate(current_draft, request)
            state.add_feedback(feedback)

            # Condición de parada A: Propuesta Aprobada (PASS)
            if feedback.verdict == "PASS":
                break

            # Condición de parada B: Límite de seguridad alcanzado (Escalado humano)
            if state.current_iteration >= self.max_iterations:
                break

            # Paso 3: Optimización / Revisión en base al feedback estructurado
            current_draft = self.optimizer.refine_draft(current_draft, feedback, request)
            state.add_draft(current_draft)

        return state
