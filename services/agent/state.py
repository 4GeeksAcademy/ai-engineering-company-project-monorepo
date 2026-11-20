"""
Define el esquema del estado mínimo y explícito que viaja entre los nodos de LangGraph.
Incluye soporte para memoria persistente, propuesta pendiente y registro auditable.
"""
from typing import TypedDict, List, Dict, Any, Optional


class AgentState(TypedDict, total=False):
    """
    Estado del grafo del agente.

    Campos base:
    - question: La pregunta o mensaje formulado por el usuario.
    - thread_id: Identificador de sesión/hilo para aislar propuestas pendientes.
    - intent: Intención clasificada autónomamente ("rag" | "incident_tool" | "memory_only" | "unknown").
    - context: Lista de fragmentos (chunks) recuperados por el nodo retrieve (RAG).
    - tool_data: Datos devueltos por la herramienta externa de incidentes.
    - answer: La respuesta final generada, resultado de la tool o mensaje de fallback.
    - error: Detalle de error si la pregunta es inválida o vacía.
    - execution_trace: Registro secuencial de nodos recorridos para auditoría y evals.

    Campos de Memoria y Auto-mejora (Hito 8):
    - memory_context: Lista de hechos operativos leídos explícitamente del MemoryStore.
    - pending_proposal: Propuesta pendiente previa al turno actual (máximo 1).
    - memory_proposal: Nueva propuesta generada en este turno (si aplica).
    - memory_decision: Resultado de clasificar la decisión del usuario ("approve" | "reject" | "edit" | "ambiguous_or_unrelated").
    - memory_audit: Registro auditable de la última decisión de memoria.
    - memory_only_response: Mensaje de confirmación cuando el turno solo resolvía la propuesta pendiente.
    """
    question: str
    thread_id: str
    intent: Optional[str]
    context: List[Dict[str, Any]]
    tool_data: Optional[Dict[str, Any]]
    answer: str
    error: Optional[str]
    execution_trace: List[str]

    memory_context: List[str]
    pending_proposal: Optional[Dict[str, Any]]
    memory_proposal: Optional[Dict[str, Any]]
    memory_decision: Optional[str]
    memory_audit: Optional[Dict[str, Any]]
    memory_only_response: Optional[str]

    tenant_id: Optional[str]
    guardrail_triggered: bool
    guardrail_failure_type: Optional[str]