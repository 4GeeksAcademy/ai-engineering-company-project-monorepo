"""
data/pipelines/rfp_intake/state.py
Estado compartido del grafo dedicado `rfp_intake` (separado del grafo CX).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict


class RFPIntakeState(TypedDict, total=False):
    ticket_id: str
    rfp_id: str
    raw_pdf_path: str
    markdown_text: str
    readability_metrics: Dict[str, Any]

    # Triage / Clasificador
    is_valid_rfp: bool
    rfp_format: str
    classification_reason: str

    # Orquestador + Workers aislados
    metadata: Dict[str, Any]
    departments_needed: List[str]
    department_tasks: List[Dict[str, Any]]
    unmapped_departments: List[str]
    worker_results: List[Dict[str, Any]]

    # Synthesizer + Handoff a Parte 2
    synthesizer_summary: str
    handoff_payload: Dict[str, Any]
    status: str  # analizando | descartado | analisis_completo | error
    error_detail: Optional[str]
    execution_trace: List[str]