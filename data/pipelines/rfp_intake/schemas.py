"""
data/pipelines/rfp_intake/schemas.py
Contratos Pydantic y catálogo oficial de departamentos de Nexova Solutions.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

DepartmentId = Literal["seleccion", "capacitacion", "soporte"]

NEXOVA_DEPARTMENTS: Dict[str, Dict[str, str]] = {
    "seleccion": {
        "department_name": "Talent Selection Operations",
        "owner_name": "Javier Almeida",
        "focus": "Roles a cubrir, tiempo estimado de cierre (min. 15 días hábiles), horas de consultoría necesarias",
    },
    "capacitacion": {
        "department_name": "Corporate Training",
        "owner_name": "Elena Vargas",
        "focus": "Programas de formación aplicables, duración, modalidad",
    },
    "soporte": {
        "department_name": "Customer Support (outsourcing)",
        "owner_name": "Roberto Díaz",
        "focus": "Dotación de agentes, turnos, SLA de respuesta comprometido (24h obligatorio)",
    },
}


class ClassifierOutput(BaseModel):
    """Salida estructurada del Agente Clasificador (Triage)."""
    is_valid_rfp: bool
    rfp_format: Literal["formal", "informal", "invalid"]
    reason: str


class RFPMetadata(BaseModel):
    """Metadatos estructurados extraídos de la RFP (§2.2 y §2.3)."""
    client_name: str = "Cliente no especificado"
    client_hq: Literal["España", "Miami", "No especificado"] = "No especificado"
    currency: Literal["EUR", "USD"] = "EUR"
    services_requested: List[str] = Field(default_factory=list)
    scope: str = ""
    deadline: Optional[str] = None
    budget_range: Optional[str] = None


class DepartmentTask(BaseModel):
    """Subtarea aislada que el Orquestador asigna a un Worker."""
    department_id: DepartmentId
    relevant_excerpts: List[str] = Field(default_factory=list)


class OrchestratorOutput(BaseModel):
    """Salida del Orquestador: metadatos + únicamente los departamentos que aplican."""
    metadata: RFPMetadata
    departments_needed: List[DepartmentId] = Field(default_factory=list)
    tasks: List[DepartmentTask] = Field(default_factory=list)
    unmapped_departments: List[str] = Field(default_factory=list)


class WorkerOutput(BaseModel):
    """Salida de un Worker aislado por departamento (nunca inventa cifras faltantes)."""
    department_id: DepartmentId
    department_name: str
    owner_name: str
    key_aspects: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)


class SynthesizerOutput(BaseModel):
    """Consolidación final para Ventas (Marcos Ibáñez) + contrato handoff a Parte 2."""
    sales_summary: str
    conflicts_or_warnings: List[str] = Field(default_factory=list)
    handoff_payload: Dict[str, object] = Field(default_factory=dict)

# --- Modelos de Evaluación y Borradores (Hito 9 · Parte 2) ---

class ReadabilityEvaluation(BaseModel):
    """Evaluación objetiva de legibilidad mediante métricas Flesch."""
    passed: bool
    flesch_reading_ease: float = 0.0
    flesch_kincaid_grade: float = 0.0
    feedback: Optional[str] = None


class RelevanceEvaluation(BaseModel):
    """Evaluación de pertinencia frente al alcance y aspectos clave de la RFP."""
    passed: bool
    covered_aspects: List[str] = Field(default_factory=list)
    missing_aspects: List[str] = Field(default_factory=list)
    feedback: Optional[str] = None


class ComplianceEvaluation(BaseModel):
    """Evaluación de cumplimiento estricto contra lineamientos de Nexova (§5)."""
    passed: bool
    rule_ids_checked: List[str] = Field(default_factory=list)
    violations: List[str] = Field(default_factory=list)
    feedback: Optional[str] = None


class EvaluationResult(BaseModel):
    """Resultado consolidado del ciclo evaluador para una sección departamental."""
    department_id: DepartmentId
    readability: ReadabilityEvaluation
    relevance: RelevanceEvaluation
    compliance: ComplianceEvaluation
    overall_pass: bool
    feedback_for_generator: str = ""
    iteration: int = 1


class DepartmentDraft(BaseModel):
    """Borrador de la propuesta económica generado por el especialista del departamento."""
    department_id: DepartmentId
    department_name: str
    owner_name: str
    draft_content: str
    iteration: int = 1
    evaluation: Optional[EvaluationResult] = None
    status: Literal["borrador_generado", "aprobado_evaluacion", "needs_human_review"] = "borrador_generado"


# --- Modelos de Aprobación Humana, Arbitraje y Cierre (Hito 9 · Parte 3) ---

ApprovalDecision = Literal["approve", "reject", "request_changes"]
ConflictTriggerId = Literal["ttc-vs-training-window", "support-sla-missing", "currency-mismatch"]


class ApprovalAction(BaseModel):
    """Respuesta humana validada al reanudar un punto de interrupción (HITL)."""
    department_id: DepartmentId
    decision: ApprovalDecision
    approver_name: str
    comments: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConflictTriggerResult(BaseModel):
    """Resultado determinista de un trigger de conflicto evaluado por el árbitro fijo (§7)."""
    trigger_id: ConflictTriggerId
    detected: bool
    arbitrator: str
    resolution_rule: str
    applied_action: str
    details: str = ""


class ExecutionTraceEntry(BaseModel):
    """Registro estructurado de trazabilidad para cada nodo ejecutado."""
    node: str
    agent: str
    input_summary: str
    output_summary: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FinalProposalDocument(BaseModel):
    """Documento final consolidado tras la aprobación de todos los departamentos activos."""
    ticket_id: str
    rfp_id: str
    client_name: str
    client_hq: str
    currency: str
    sections: List[Dict[str, Any]] = Field(default_factory=list)
    arbitration_results: List[ConflictTriggerResult] = Field(default_factory=list)
    markdown_content: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())