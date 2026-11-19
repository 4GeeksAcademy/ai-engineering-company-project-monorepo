"""
data/pipelines/rfp_intake/schemas.py
Contratos Pydantic y catálogo oficial de departamentos de Nexova Solutions.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional
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