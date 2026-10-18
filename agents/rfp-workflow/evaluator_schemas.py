"""
evaluator_schemas.py — Modelos de Datos, Rúbricas y Contratos para el Patrón Evaluator-Optimizer
Hito: Flujo Agéntico de RFPs: Generación de Respuestas (Parte 2 de 3)

Principios arquitectónicos clave:
1. Desacoplamiento Evaluador-Generador: El evaluador no genera, solo califica con rúbrica objetiva.
2. Feedback Estructurado y Accionable: El evaluador emite dictamen PASS/FAIL y guía de revisión concreta.
3. Trazabilidad de Iteraciones: Historial de versiones y métricas de mejora en cada ciclo.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


# =====================================================================
# 1. BORRADOR DE PROPUESTA TÉCNICA (Proposal Draft)
# =====================================================================

class RFPProposalDraft(BaseModel):
    """
    Borrador de la propuesta técnica y económica redactado por el Generador / Optimizador.
    """
    model_config = ConfigDict(extra="forbid")

    proposal_id: str = Field(description="Identificador unívoco de la propuesta (ej. PROP-WH-01)")
    rfp_id: str = Field(description="Identificador de la RFP asociada")
    iteration: int = Field(ge=1, description="Número de iteración del borrador (1 para borrador inicial)")
    executive_summary: str = Field(description="Resumen ejecutivo de la propuesta comercial")
    technical_solution: str = Field(description="Detalle de la arquitectura y operativa propuesta")
    addressed_requirements: List[str] = Field(
        default_factory=list,
        description="IDs de los requerimientos cubiertos explícitamente (ej. ['REQ-01', 'REQ-02'])"
    )
    warehouse_location: Optional[str] = Field(default=None, description="Almacén de TrackFlow asignado si aplica")
    carrier_fleet: Optional[str] = Field(default=None, description="Tipo de flota o transportista asignado si aplica")
    total_estimated_cost_usd: float = Field(ge=0.0, description="Coste total estimado cotizado en USD")
    sla_commitment_hours: float = Field(ge=0.0, description="SLA de entrega o preparación comprometido en horas")
    assumptions_and_limits: List[str] = Field(
        default_factory=list,
        description="Condiciones de contorno, límites de responsabilidad y asunciones operativas"
    )
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 2. RÚBRICA Y FEEDBACK ESTRUCTURADO (Evaluator Feedback)
# =====================================================================

class EvaluationCriterion(BaseModel):
    """Calificación individual para un criterio de la rúbrica."""
    model_config = ConfigDict(extra="forbid")

    criterion_name: str = Field(description="Nombre del criterio evaluado (ej. Cobertura de Requisitos)")
    weight: float = Field(ge=0.0, le=1.0, description="Ponderación del criterio en la nota global (0.0 a 1.0)")
    score: float = Field(ge=0.0, le=100.0, description="Puntuación obtenida en el criterio (0 a 100)")
    passed: bool = Field(description="Si el criterio supera el estándar mínimo")
    critique: str = Field(description="Comentario analítico sobre lo observado en el borrador")


EvaluationVerdict = Literal["PASS", "FAIL"]


class EvaluationFeedback(BaseModel):
    """
    Dictamen formal emitido por el nodo Evaluador.
    Proporciona al Optimizador la crítica accionable para corregir el borrador.
    """
    model_config = ConfigDict(extra="forbid")

    feedback_id: str = Field(description="Identificador unívoco del feedback")
    proposal_id: str = Field(description="ID de la propuesta evaluada")
    iteration: int = Field(ge=1, description="Iteración que fue evaluada")
    verdict: EvaluationVerdict = Field(description="Dictamen de aprobación: PASS o FAIL")
    overall_score: float = Field(ge=0.0, le=100.0, description="Puntuación ponderada global (0 a 100)")
    pass_threshold: float = Field(default=80.0, description="Nota de corte para ser aprobada")
    criteria_results: List[EvaluationCriterion] = Field(
        default_factory=list,
        description="Desglose por criterio de la rúbrica"
    )
    missing_requirements: List[str] = Field(
        default_factory=list,
        description="Requerimientos obligatorios de la RFP que no fueron cubiertos"
    )
    budget_deviation_pct: Optional[float] = Field(
        default=None,
        description="Porcentaje de desviación respecto al presupuesto del cliente si excede"
    )
    actionable_instructions: str = Field(
        description="Instrucciones precisas y directas para que el Optimizador corrija el borrador"
    )
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 3. ESTADO DE ITERACIÓN DEL BUCLE (Loop Trajectory State)
# =====================================================================

LoopFinalStatus = Literal["IN_PROGRESS", "APPROVED", "ESCALATED_HUMAN_REVIEW", "FAILED"]


class ProposalIterationState(BaseModel):
    """
    Mantiene el estado y la memoria de todas las iteraciones en el bucle Evaluator-Optimizer.
    """
    rfp_id: str
    current_iteration: int = 0
    max_iterations: int = 3
    final_status: LoopFinalStatus = "IN_PROGRESS"
    draft_history: List[RFPProposalDraft] = Field(default_factory=list)
    feedback_history: List[EvaluationFeedback] = Field(default_factory=list)
    approved_proposal: Optional[RFPProposalDraft] = None

    def add_draft(self, draft: RFPProposalDraft):
        self.draft_history.append(draft)
        self.current_iteration = draft.iteration

    def add_feedback(self, feedback: EvaluationFeedback):
        self.feedback_history.append(feedback)
        if feedback.verdict == "PASS":
            self.final_status = "APPROVED"
            self.approved_proposal = self.draft_history[-1]
        elif self.current_iteration >= self.max_iterations:
            self.final_status = "ESCALATED_HUMAN_REVIEW"
