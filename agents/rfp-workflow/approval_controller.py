"""
approval_controller.py — Motor de Checkpointing, Interrupción y Reanudación (HITL)
Hito: Flujo Agéntico de RFPs: Aprobación y Cierre (Parte 3 de 3)

Componentes:
1. FileCheckpointer: Persistencia local serializable de checkpoints en disco.
2. ApprovalGateNode: Interrupción del flujo antes del envío formal.
3. WorkflowResumeEngine: Reanudación a partir del checkpoint con inyección de decisión humana.
4. EndToEndRFPOrchestrator: Orquestación completa de las 3 partes (Router + Evaluator-Optimizer + HITL).
"""

import os
import json
import uuid
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from schemas import RFPRequest, RFPTaskHandoff
from router import RFPRouterEngine
from evaluator_schemas import RFPProposalDraft, ProposalIterationState
from evaluator_optimizer import RFPEvaluatorOptimizerLoop, ProposalOptimizer, ProposalEvaluator
from approval_schemas import (
    HumanApprovalDecision,
    WorkflowCheckpoint,
    FinalRFPContract,
    ApprovalWorkflowState
)


class FileCheckpointer:
    """
    Gestor de persistencia en disco para checkpoints del flujo de trabajo.
    Permite serializar el estado del grafo para pausar la ejecución y reanudarla posteriormente.
    """

    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.storage_dir = os.path.join(base_dir, ".checkpoints")
        else:
            self.storage_dir = storage_dir
        
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_path(self, thread_id: str) -> str:
        safe_id = "".join(c for c in thread_id if c.isalnum() or c in ("-", "_"))
        return os.path.join(self.storage_dir, f"checkpoint_{safe_id}.json")

    def save_checkpoint(self, checkpoint: WorkflowCheckpoint) -> str:
        path = self._get_path(checkpoint.thread_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(checkpoint.model_dump(), f, indent=2, ensure_ascii=False)
        return path

    def load_checkpoint(self, thread_id: str) -> Optional[WorkflowCheckpoint]:
        path = self._get_path(thread_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return WorkflowCheckpoint(**data)

    def delete_checkpoint(self, thread_id: str) -> bool:
        path = self._get_path(thread_id)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False


class ApprovalGateNode:
    """
    Nodo de Interrupción y Compuerta de Supervisión Humana:
    Detiene la ejecución del grafo antes de formalizar la propuesta legal.
    """

    def __init__(self, checkpointer: FileCheckpointer):
        self.checkpointer = checkpointer

    def pause_for_approval(
        self,
        request: RFPRequest,
        approved_draft: RFPProposalDraft
    ) -> Tuple[ApprovalWorkflowState, WorkflowCheckpoint]:
        checkpoint_id = f"CHK-{uuid.uuid4().hex[:8].upper()}"
        
        state_snapshot = {
            "rfp_id": request.rfp_id,
            "client_name": request.client_name,
            "budget_usd": request.budget_usd,
            "proposal": approved_draft.model_dump(),
            "target_locations": request.target_locations,
            "requirements": [r.model_dump() for r in request.requirements]
        }

        checkpoint = WorkflowCheckpoint(
            checkpoint_id=checkpoint_id,
            thread_id=request.rfp_id,
            step_name="awaiting_human_approval",
            state_snapshot=state_snapshot,
            is_paused=True
        )

        self.checkpointer.save_checkpoint(checkpoint)

        state = ApprovalWorkflowState(
            thread_id=request.rfp_id,
            rfp_id=request.rfp_id,
            current_step="awaiting_human_approval",
            is_interrupted=True,
            active_checkpoint_id=checkpoint_id
        )
        state.record_event("workflow_interrupted", {
            "checkpoint_id": checkpoint_id,
            "proposal_id": approved_draft.proposal_id,
            "cost_usd": approved_draft.total_estimated_cost_usd,
            "sla_hours": approved_draft.sla_commitment_hours
        })

        return state, checkpoint


class WorkflowResumeEngine:
    """
    Motor de Reanudación:
    Carga el checkpoint persistido e inyecta la decisión humana para concluir o reabrir el flujo.
    """

    def __init__(self, checkpointer: FileCheckpointer):
        self.checkpointer = checkpointer
        self.optimizer = ProposalOptimizer()
        self.evaluator = ProposalEvaluator()

    @staticmethod
    def _calculate_signature_hash(contract_data: Dict[str, Any]) -> str:
        raw_bytes = json.dumps(contract_data, sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw_bytes).hexdigest()

    def resume(
        self,
        thread_id: str,
        decision: HumanApprovalDecision
    ) -> ApprovalWorkflowState:
        checkpoint = self.checkpointer.load_checkpoint(thread_id)
        if not checkpoint:
            raise ValueError(f"No se encontró ningún checkpoint activo para el hilo '{thread_id}'.")

        snapshot = checkpoint.state_snapshot
        draft_data = snapshot["proposal"]
        proposal = RFPProposalDraft(**draft_data)

        state = ApprovalWorkflowState(
            thread_id=thread_id,
            rfp_id=snapshot["rfp_id"],
            current_step="resumed",
            is_interrupted=False,
            active_checkpoint_id=checkpoint.checkpoint_id,
            human_decision=decision
        )

        state.record_event("workflow_resumed", {
            "decision": decision.action,
            "reviewer": decision.reviewer_name,
            "notes": decision.notes
        })

        # =============================================================
        # CASO 1: APROBACIÓN HUMANA (APPROVE ➔ CLOSED_WON)
        # =============================================================
        if decision.action == "APPROVE":
            contract_id = f"CTR-{uuid.uuid4().hex[:8].upper()}"
            final_cost = decision.approved_budget_cap or proposal.total_estimated_cost_usd
            
            op_assignment = (
                f"Almacén Central {proposal.warehouse_location}"
                if proposal.warehouse_location
                else (proposal.carrier_fleet or "Flota de Transporte TrackFlow")
            )

            signature_payload = {
                "contract_id": contract_id,
                "rfp_id": snapshot["rfp_id"],
                "reviewer": decision.reviewer_id,
                "cost_usd": final_cost,
                "timestamp": decision.decided_at
            }
            sig_hash = self._calculate_signature_hash(signature_payload)

            contract = FinalRFPContract(
                contract_id=contract_id,
                rfp_id=snapshot["rfp_id"],
                client_name=snapshot["client_name"],
                status="CLOSED_WON",
                approved_proposal_id=proposal.proposal_id,
                total_cost_usd=final_cost,
                sla_commitment_hours=proposal.sla_commitment_hours,
                operational_assignment=op_assignment,
                digital_signature_hash=sig_hash,
                valid_until="2026-12-31"
            )

            state.final_contract = contract
            state.current_step = "contract_closed_won"
            state.record_event("contract_formalized", {
                "contract_id": contract_id,
                "status": "CLOSED_WON",
                "cost_usd": final_cost
            })

            # Checkpoint completado: se retira de la lista activa
            self.checkpointer.delete_checkpoint(thread_id)

        # =============================================================
        # CASO 2: SOLICITUD DE CAMBIOS (REQUEST_CHANGES ➔ REOPTIMIZAR)
        # =============================================================
        elif decision.action == "REQUEST_CHANGES":
            state.current_step = "reopened_for_changes"
            
            # Construcción de requerimiento adaptado a las notas del humano
            adjusted_cost = decision.approved_budget_cap or proposal.total_estimated_cost_usd
            
            revised_summary = (
                f"{proposal.executive_summary} [Revisión Solicitada por Humano - {decision.reviewer_name}]: "
                f"Instrucción: {decision.notes}"
            )
            
            revised_draft = RFPProposalDraft(
                proposal_id=proposal.proposal_id,
                rfp_id=proposal.rfp_id,
                iteration=proposal.iteration + 1,
                executive_summary=revised_summary,
                technical_solution=proposal.technical_solution + f" Modificación incorporada según directiva: {decision.notes}.",
                addressed_requirements=proposal.addressed_requirements,
                warehouse_location=proposal.warehouse_location,
                carrier_fleet=proposal.carrier_fleet,
                total_estimated_cost_usd=adjusted_cost,
                sla_commitment_hours=min(proposal.sla_commitment_hours, 18.0), # Ajuste según nota típica
                assumptions_and_limits=proposal.assumptions_and_limits + [f"Enmienda humana por {decision.reviewer_name}"]
            )

            # Actualizar snapshot del checkpoint con el nuevo borrador
            snapshot["proposal"] = revised_draft.model_dump()
            checkpoint.state_snapshot = snapshot
            checkpoint.step_name = "awaiting_human_approval_revision"
            self.checkpointer.save_checkpoint(checkpoint)

            state.is_interrupted = True
            state.record_event("proposal_revised_by_human_directive", {
                "new_iteration": revised_draft.iteration,
                "adjusted_cost": adjusted_cost
            })

        # =============================================================
        # CASO 3: RECHAZO HUMANO (REJECT ➔ CLOSED_REJECTED)
        # =============================================================
        else:
            contract_id = f"REJ-{uuid.uuid4().hex[:8].upper()}"
            contract = FinalRFPContract(
                contract_id=contract_id,
                rfp_id=snapshot["rfp_id"],
                client_name=snapshot["client_name"],
                status="CLOSED_REJECTED",
                approved_proposal_id=None,
                total_cost_usd=0.0,
                sla_commitment_hours=0.0,
                operational_assignment="No asignado (Operación cancelada por revisor humano)",
                digital_signature_hash="REJECTED_BY_SUPERVISOR",
                valid_until="2026-12-31"
            )
            state.final_contract = contract
            state.current_step = "contract_closed_rejected"
            state.record_event("rfp_rejected_by_human", {"reason": decision.notes})
            self.checkpointer.delete_checkpoint(thread_id)

        return state


class EndToEndRFPOrchestrator:
    """
    Orquestador Integral Multiagente de RFPs:
    Unifica las 3 Partes:
    - Parte 1: Ingesta, Clasificación y Enrutamiento estructurado.
    - Parte 2: Generación y Automejora con Evaluator-Optimizer.
    - Parte 3: Checkpointing, Interrupción HITL y Aprobación/Cierre.
    """

    def __init__(self, checkpointer: Optional[FileCheckpointer] = None):
        self.checkpointer = checkpointer or FileCheckpointer()
        self.router_engine = RFPRouterEngine()
        self.optimizer_loop = RFPEvaluatorOptimizerLoop(max_iterations=3)
        self.gate = ApprovalGateNode(self.checkpointer)
        self.resume_engine = WorkflowResumeEngine(self.checkpointer)

    def process_rfp_until_approval_gate(
        self,
        request: RFPRequest
    ) -> Tuple[ApprovalWorkflowState, WorkflowCheckpoint]:
        """
        Ejecuta las Fases 1 y 2, y se interrumpe en la compuerta de aprobación (Fase 3).
        """
        # Parte 1: Router
        router_state = self.router_engine.process_rfp(request)
        if router_state.status == "rejected" or not router_state.handoff:
            raise ValueError(f"RFP {request.rfp_id} fuera de alcance o rechazada en el enrutamiento.")

        # Parte 2: Evaluator-Optimizer
        iteration_state = self.optimizer_loop.run(router_state.handoff, request)
        if iteration_state.final_status != "APPROVED" or not iteration_state.approved_proposal:
            raise ValueError(f"RFP {request.rfp_id} no pudo alcanzar la aprobación del evaluador.")

        # Parte 3: Interrupción y Checkpointing
        return self.gate.pause_for_approval(request, iteration_state.approved_proposal)

    def submit_human_decision(
        self,
        thread_id: str,
        decision: HumanApprovalDecision
    ) -> ApprovalWorkflowState:
        """
        Reanuda el flujo inyectando la decisión humana.
        """
        return self.resume_engine.resume(thread_id, decision)
