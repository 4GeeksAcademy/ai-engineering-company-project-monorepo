"""
data/pipelines/rfp_intake/state.py
Estado compartido del grafo dedicado `rfp_intake` (Partes 1 y 2).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict


class RFPIntakeState(TypedDict, total=False):
    ticket_id: str
    rfp_id: str
    raw_pdf_path: str
    markdown_text: str
    readability_metrics: Dict[str, Any]

    # --- Parte 1: Triage y Asignación Departamental ---
    is_valid_rfp: bool
    rfp_format: str
    classification_reason: str
    metadata: Dict[str, Any]
    departments_needed: List[str]
    department_tasks: List[Dict[str, Any]]
    unmapped_departments: List[str]
    worker_results: List[Dict[str, Any]]
    synthesizer_summary: str
    handoff_payload: Dict[str, Any]

    # --- Parte 2: Generación, Evaluación y Ciclo de Reintentos ---
    department_drafts: Dict[str, Dict[str, Any]]      # {dept_id: DepartmentDraft.dict()}
    evaluation_results: Dict[str, Dict[str, Any]]     # {dept_id: EvaluationResult.dict()}
    iteration_counts: Dict[str, int]                  # {dept_id: iter_num}
    department_statuses: Dict[str, str]               # {dept_id: status}

    # Estado global del ticket
    # analizando | descartado | analisis_completo | generando_borrador | en_evaluacion | needs_human_review | listo_para_aprobacion | error
    status: str
    error_detail: Optional[str]
    execution_trace: List[str]