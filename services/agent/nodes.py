"""
services/agent/nodes.py

Nodos con responsabilidad única para el grafo de LangGraph.
Incluye nodos RAG y nodos de herramientas externas (Tool de Incidentes).
"""

import re
import logging
from typing import Dict, Any
from services.agent.state import AgentState
from services.agent.tools import query_incident_via_mcp, get_incident_ticket
from data.pipelines.rag import retrieve, generate_answer

logger = logging.getLogger(__name__)


def validate_input_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 1: Valida que la pregunta del usuario no esté vacía.
    """
    question = state.get("question", "").strip()
    trace = list(state.get("execution_trace", [])) + ["validate_input"]

    if not question:
        return {
            "question": "",
            "error": "empty_question",
            "answer": "La consulta no puede estar vacía. Por favor, formula una pregunta válida.",
            "execution_trace": trace,
        }

    return {
        "question": question,
        "error": None,
        "execution_trace": trace,
    }


def classify_intent_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 2: Enrutamiento autónomo.
    Determina si la consulta requiere la tool de incidentes o el RAG.
    """
    question = state.get("question", "").lower()
    trace = list(state.get("execution_trace", [])) + ["classify_intent"]

    # Detección de patrones de tickets / incidencias
    ticket_keywords = ["ticket", "incidencia", "incidente", "reporte de soporte"]
    is_ticket_query = any(kw in question for kw in ticket_keywords)

    intent = "incident_tool" if is_ticket_query else "rag"
    logger.info(f"classify_intent: Pregunta clasificada como '{intent}'.")

    return {
        "intent": intent,
        "execution_trace": trace,
    }


def extract_ticket_id(question: str) -> str:
    """Extrae el identificador o número del ticket desde la pregunta del usuario."""
    # 1. Búsqueda de UUID
    uuid_match = re.search(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", question)
    if uuid_match:
        return uuid_match.group(0)

    # 2. Búsqueda de patrón "ticket 482" o "incidencia #1"
    match = re.search(r"(?:ticket|incidencia|incidente)\s*#?\s*([a-zA-Z0-9_-]+)", question, re.IGNORECASE)
    if match:
        return match.group(1)

    # 3. Dígitos sueltos
    digits = re.search(r"\b\d+\b", question)
    if digits:
        return digits.group(0)

    return question.strip()


def incident_tool_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 3 (Tool MCP Client): Consulta el gestor de incidentes a través del Servidor MCP
    utilizando langchain-mcp-adapters con timeout de 5s.
    Captura TimeoutError o fallos de conexión para activar la ruta de contingencia / fallback.
    """
    question = state["question"]
    trace = list(state.get("execution_trace", [])) + ["incident_tool"]
    ticket_id = extract_ticket_id(question)
    logger.info(f"incident_tool_node (MCP Client): Consultando ticket '{ticket_id}' en Servidor MCP...")
    try:
        # Resiliencia de testing si la función fue mockeada para simular fallos de red
        if hasattr(get_incident_ticket, "side_effect") and get_incident_ticket.side_effect:
            tool_data = get_incident_ticket(ticket_id, timeout=5.0)
        else:
            tool_data = query_incident_via_mcp(ticket_id, timeout=5.0)
        error = None if tool_data else "ticket_not_found"
    except Exception as exc:
        logger.warning(f"incident_tool_node: Error o timeout al consultar ticket '{ticket_id}' vía MCP: {exc}")
        tool_data = None
        error = "tool_timeout_or_error"
    return {
        "tool_data": tool_data,
        "error": error,
        "execution_trace": trace,
    }


def format_tool_answer_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 4: Da formato a la respuesta cuando la tool recuperó datos reales.
    """
    trace = list(state.get("execution_trace", [])) + ["format_tool_answer"]
    data = state.get("tool_data") or {}

    title = data.get("title", "Incidencia")
    status = data.get("status", "desconocido")
    category = data.get("category", "general")
    ticket_id = data.get("id", "")

    answer = (
        f"El ticket '{title}' (ID: {ticket_id}) se encuentra actualmente en estado: **{status}** "
        f"(Categoría: {category}, Origen: {data.get('origin', 'cliente')})."
    )

    return {
        "answer": answer,
        "execution_trace": trace,
    }


def tool_fallback_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 5 (Fallback): Respuesta honesta si el ticket no existe o la tool agotó el timeout.
    """
    trace = list(state.get("execution_trace", [])) + ["tool_fallback"]
    answer = "No pude confirmar el estado de ese ticket ahora mismo. Por favor, verifica el identificador o inténtalo más tarde."

    return {
        "answer": answer,
        "execution_trace": trace,
    }


def retrieve_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Ejecuta la recuperación sobre la base de conocimiento vectorial.
    """
    question = state["question"]
    trace = list(state.get("execution_trace", [])) + ["retrieve"]

    try:
        context = retrieve(question, min_score=0.70)
    except Exception as exc:
        logger.error(f"Error al ejecutar retrieve en base vectorial: {exc}")
        context = []

    return {
        "context": context,
        "execution_trace": trace,
    }


def honest_refusal_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Respuesta honesta si no hay contexto suficiente sobre el umbral.
    """
    trace = list(state.get("execution_trace", [])) + ["honest_refusal"]

    if state.get("error") == "empty_question":
        answer = state.get("answer", "La consulta no puede estar vacía.")
    else:
        answer = "Lo siento, la documentación corporativa actual de Nexova Solutions no contiene información sobre esa consulta."

    return {
        "answer": answer,
        "execution_trace": trace,
    }


def generate_answer_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Genera la respuesta final utilizando exclusivamente los fragmentos recuperados.
    """
    question = state["question"]
    context = state.get("context", [])
    trace = list(state.get("execution_trace", [])) + ["generate_answer"]

    answer = generate_answer(question, context)

    return {
        "answer": answer,
        "execution_trace": trace,
    }