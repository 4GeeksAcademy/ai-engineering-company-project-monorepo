"""
approval_schemas.py — Modelos de Checkpointing, Supervisión Humana (HITL) y Contratos de Cierre
Hito: Flujo Agéntico de RFPs: Aprobación y Cierre (Parte 3 de 3)

Principios arquitectónicos:
1. Interrupción Formal: Pausa antes de la acción irreversible (despacho/compromiso comercial).
2. Checkpoint Serializado: Snapshot completo persistible en disco para reanudar el grafo en cualquier momento.
3. Decisiones Tipadas: APPROVE, REQUEST_CHANGES o REJECT con notas de auditoría.
4. Cierre Formal: Generación del contrato final con hash de firma digital.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


# =====================================================================
# 1. DECISIÓN DEL REVISOR HUMANO (Human-in-the-Loop Input)
# =====================================================================

ApprovalAction = Literal["APPROVE", "REQUEST_CHANGES", "REJECT"]


class HumanApprovalDecision(BaseModel):
    """
    Decisión formal inyectada por un operador humano para reanudar el workflow.
    """
    model_config = ConfigDict(extra="forbid")

    decision_id: str = Field(description="Identificador unívoco de la decisión")
    reviewer_id: str = Field(description="ID del revisor u operador (ej. OP-MGR-01)")
    reviewer_name: str = Field(description="Nombre o cargo del revisor (ej. Director de Operaciones)")
    action: ApprovalAction = Field(description="Acción dictaminada: APPROVE, REQUEST_CHANGES o REJECT")
    notes: str = Field(description="Comentarios, justificación o directivas para el agente")
    approved_budget_cap: Optional[float] = Field(default=None, description="Límite presupuestario autorizado si difiere")
    decided_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 2. PUNTO DE CONTROL PERSISTIBLE (Workflow Checkpoint)
# =====================================================================

class WorkflowCheckpoint(BaseModel):
    """
    Snapshot inmutable del estado del grafo para persistencia en disco y reanudación asíncrona.
    """
    model_config = ConfigDict(extra="forbid")

    checkpoint_id: str = Field(description="Identificador único del punto de control")
    thread_id: str = Field(description="ID del hilo de ejecución (normalmente el rfp_id)")
    step_name: str = Field(description="Nodo o etapa en la que se realizó la pausa (ej. awaiting_human_approval)")
    state_snapshot: Dict[str, Any] = Field(description="Datos serializados del estado del grafo")
    is_paused: bool = Field(default=True, description="Indica si el grafo está detenido esperando reanudación")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 3. CONTRATO FORMAL DE CIERRE (Final RFP Contract)
# =====================================================================

ContractStatus = Literal["CLOSED_WON", "CLOSED_REJECTED", "PENDING_MODIFICATION"]


class FinalRFPContract(BaseModel):
    """
    Documento final formalizado tras la aprobación humana y cierre del flujo.
    """
    model_config = ConfigDict(extra="forbid")

    contract_id: str = Field(description="Identificador legal del contrato (ej. CTR-2026-001)")
    rfp_id: str = Field(description="ID de la RFP correspondiente")
    client_name: str = Field(description="Nombre de la empresa cliente")
    status: ContractStatus = Field(description="Estado final del acuerdo comercial")
    approved_proposal_id: Optional[str] = Field(default=None, description="ID del borrador técnico aprobado")
    total_cost_usd: float = Field(ge=0.0, description="Coste final formalizado")
    sla_commitment_hours: float = Field(ge=0.0, description="SLA legal comprometido en horas")
    operational_assignment: str = Field(description="Almacén o flota asignada (ej. Almacén Central Zaragoza)")
    digital_signature_hash: str = Field(description="Hash criptográfico SHA-256 de la aprobación y cierre")
    valid_until: str = Field(description="Fecha de caducidad de la cotización (YYYY-MM-DD)")
    dispatched_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 4. ESTADO GLOBAL DE CONTROL Y APROBACIÓN (Approval Workflow State)
# =====================================================================

class ApprovalWorkflowState(BaseModel):
    """
    Estado del grafo para la etapa de control, interrupciones y reanudación.
    """
    thread_id: str
    rfp_id: str
    current_step: str = "initialized"
    is_interrupted: bool = False
    active_checkpoint_id: Optional[str] = None
    human_decision: Optional[HumanApprovalDecision] = None
    final_contract: Optional[FinalRFPContract] = None
    audit_events: List[Dict[str, Any]] = Field(default_factory=list)

    def record_event(self, event_type: str, details: Dict[str, Any]):
        self.audit_events.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "details": details
        })
