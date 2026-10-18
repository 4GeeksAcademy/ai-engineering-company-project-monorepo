"""
schemas.py — Modelos de Datos, Clasificación Tipada y Contratos de Handoff Estructurado
Hito: Flujo Agéntico de RFPs: Recepción y Enrutamiento (Parte 1 de 3)

Principios arquitectónicos clave:
1. Typed Output: El enrutador produce un Literal tipado, no texto libre.
2. Structured Handoff: Traspaso explícito con tarea, inputs acotados y schema esperado.
3. Scoped Context: Cada agente especialista recibe únicamente su subconjunto de datos.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


# =====================================================================
# 1. MODELOS DE INGESTA DE LA RFP (Request for Proposal)
# =====================================================================

class RFPRequirement(BaseModel):
    """Requisito individual extraído de la solicitud RFP."""
    model_config = ConfigDict(extra="forbid")

    req_id: str = Field(description="Identificador del requisito (ej. REQ-01)")
    description: str = Field(description="Detalle técnico del requisito")
    mandatory: bool = Field(default=True, description="Si es imprescindible para cotizar")


class RFPRequest(BaseModel):
    """Documento de RFP normalizado tras la recepción e ingesta."""
    model_config = ConfigDict(extra="forbid")

    rfp_id: str = Field(description="Identificador unívoco de la RFP (ej. RFP-2026-001)")
    client_name: str = Field(description="Nombre de la empresa u organización solicitante")
    title: str = Field(description="Título descriptivo del proyecto o licitación")
    raw_text: str = Field(description="Texto original completo de la solicitud")
    budget_usd: Optional[float] = Field(default=None, description="Presupuesto estimado en USD si fue provisto")
    submission_deadline: Optional[str] = Field(default=None, description="Fecha límite de entrega de propuesta (YYYY-MM-DD)")
    target_locations: List[str] = Field(default_factory=list, description="Ubicaciones geográficas involucradas (ej. Zaragoza, Los Angeles)")
    requirements: List[RFPRequirement] = Field(default_factory=list, description="Lista de requerimientos estructurados")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadatos auxiliares de recepción")


# =====================================================================
# 2. ESQUEMA DE CLASIFICACIÓN Y DECISIÓN DE ENRUTAMIENTO (Router)
# =====================================================================

RFPCategory = Literal[
    "warehouse_fulfillment",    # Almacenamiento, preparación de pedidos, stock y layout
    "freight_transport",        # Rutas de transporte terrestre/aéreo, fletes y flotas
    "api_integration",          # Integración de software, conectores ERP, webhooks y telemetría
    "procurement_suppliers",    # Suministros industriales, embalajes y compras de insumos
    "out_of_scope"              # Solicitudes no logísticas, spam o fuera de los servicios de TrackFlow
]

RFPPriority = Literal["low", "medium", "high", "critical"]


class RFPClassification(BaseModel):
    """Resultado estructurado emitido por el nodo Enrutador (Router)."""
    model_config = ConfigDict(extra="forbid")

    category: RFPCategory = Field(description="Categoría operativa a la que pertenece la RFP")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Nivel de certeza de la clasificación (0.0 a 1.0)")
    reasoning: str = Field(description="Justificación técnica de por qué se asignó a este especialista")
    assigned_agent: str = Field(description="Nombre del agente especialista destino")
    priority: RFPPriority = Field(default="medium", description="Prioridad operativa calculada")
    requires_human_review: bool = Field(default=False, description="Flag si la confianza es baja o el presupuesto es crítico")


# =====================================================================
# 3. CONTRATO DE HANDOFF ESTRUCTURADO (Structured Handoff Protocol)
# =====================================================================

class RFPTaskHandoff(BaseModel):
    """
    Contrato formal de transferencia entre el Enrutador y el Especialista.
    Evita la transmisión del historial completo (Scoped Context).
    """
    model_config = ConfigDict(extra="forbid")

    handoff_id: str = Field(description="Identificador unívoco del handoff")
    rfp_id: str = Field(description="ID de la RFP origen")
    source_node: str = Field(default="rfp_router", description="Nodo que despacha el handoff")
    target_agent: str = Field(description="Agente que debe asumir la tarea")
    task_instruction: str = Field(description="Instrucción precisa para el especialista")
    scoped_inputs: Dict[str, Any] = Field(description="Subconjunto estricto de datos necesarios para el especialista")
    expected_output_schema: str = Field(description="Nombre del esquema que debe devolver el agente especialista")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================================
# 4. ESQUEMAS DE SALIDA DE LOS AGENTES ESPECIALISTAS (Worker Schemas)
# =====================================================================

class WarehouseProposalOutput(BaseModel):
    """Propuesta técnica generada por el especialista en Almacenamiento."""
    warehouse_assigned: str
    allocated_space_sqm: float
    monthly_storage_cost_usd: float
    handling_fee_per_unit_usd: float
    setup_lead_time_days: int
    feasibility: Literal["accepted", "requires_expansion", "rejected"]
    notes: str


class FreightProposalOutput(BaseModel):
    """Propuesta técnica generada por el especialista en Rutas y Transporte."""
    origin_city: str
    destination_city: str
    carrier_assigned: str
    transit_time_hours: float
    estimated_cost_usd: float
    vehicle_type: str
    service_level: Literal["Standard", "Express", "Same-day"]
    feasibility: Literal["accepted", "capacity_constrained", "rejected"]
    notes: str


class TechAPIProposalOutput(BaseModel):
    """Propuesta técnica generada por el especialista en Integraciones de Software."""
    integration_type: Literal["REST_API", "Webhook_Stream", "EDI_Connector"]
    estimated_implementation_weeks: int
    one_time_setup_cost_usd: float
    supported_protocols: List[str]
    compliance_standards: List[str]
    feasibility: Literal["accepted", "custom_development_needed", "rejected"]
    notes: str


class RejectionProposalOutput(BaseModel):
    """Respuesta estructurada para solicitudes fuera de alcance o inviables."""
    rejection_code: str
    reason: str
    recommended_partner: Optional[str] = None
    notified_sales_rep: bool = False


# =====================================================================
# 5. ESTADO GLOBAL DEL WORKFLOW (Blackboard / Scoped Workflow State)
# =====================================================================

class RFPWorkflowState(BaseModel):
    """
    Estado del grafo de enrutamiento y orquestación multiagente.
    Contiene la trazabilidad completa del ciclo de vida de la RFP.
    """
    rfp_id: str
    status: Literal["received", "routed", "in_progress", "completed", "rejected", "failed"] = "received"
    request: Optional[RFPRequest] = None
    classification: Optional[RFPClassification] = None
    handoff: Optional[RFPTaskHandoff] = None
    specialist_result: Optional[Dict[str, Any]] = None
    routing_trail: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    def record_step(self, node_name: str, action: str, details: Optional[Dict[str, Any]] = None):
        """Registra un evento en la pista de auditoría del workflow."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node": node_name,
            "action": action,
            "details": details or {}
        }
        self.routing_trail.append(entry)
