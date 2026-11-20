"""
services/agent/graph.py
Construcción, enrutamiento condicional y compilación del grafo del agente de soporte con LangGraph.
Orquesta RAG (solo lectura), herramientas externas (MCP) y Memoria Persistente con confirmación explícita.
"""

from typing import Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from services.agent.state import AgentState
from services.agent.nodes import (
    validate_input_node,
    input_guardrail_node,
    resolve_memory_node,
    classify_intent_node,
    incident_tool_node,
    format_tool_answer_node,
    tool_fallback_node,
    retrieve_node,
    honest_refusal_node,
    generate_answer_node,
    memory_only_reply_node,
)


def route_after_validation(state: AgentState) -> str:
    """
    Arista condicional 1:
    - Si hay error de validación (pregunta vacía), enruta a honest_refusal.
    - Si no, pasa OBLIGATORIAMENTE por input_guardrail antes de tocar memoria.
    """
    if state.get("error"):
        return "honest_refusal"
    return "input_guardrail"


def route_after_input_guardrail(state: AgentState) -> str:
    """
    Arista condicional 1B (Harness):
    Si un guardrail bloqueó o redirigió la entrada, termina el turno sin resolver memoria ni usar RAG/MCP.
    """
    if state.get("guardrail_triggered"):
        return END
    return "resolve_memory"


def route_after_resolve_memory(state: AgentState) -> str:
    """
    Arista condicional 1C (Memoria Parte 1):
    Si el turno solo resolvía una propuesta pendiente, termina en memory_only_reply; si no, clasifica intención.
    """
    if state.get("intent") == "memory_only":
        return "memory_only_reply"
    return "classify_intent"


def route_after_intent(state: AgentState) -> str:
    """
    Arista condicional 2 (Enrutamiento autónomo):
    Si la pregunta es sobre tickets/incidencias, enruta a la tool externa.
    Si es sobre políticas/procedimientos, enruta al RAG.
    """
    if state.get("intent") == "incident_tool":
        return "incident_tool"
    return "retrieve"


def route_after_tool(state: AgentState) -> str:
    """
    Arista condicional 3 (Resiliencia de Tool):
    Si la tool recuperó datos reales del incidente, formatea la respuesta.
    Si la tool falló, agotó el timeout o el ticket no existe, activa la ruta de fallback.
    """
    if state.get("tool_data") is not None:
        return "format_tool_answer"
    return "tool_fallback"


def route_after_retrieval(state: AgentState) -> str:
    """
    Arista condicional 4 (RAG):
    Si se encontraron documentos relevantes sobre el umbral (o hay memoria consolidada), genera respuesta.
    Si no hay contexto suficiente, enruta al rechazo honesto (que también evalúa propuestas de memoria).
    """
    context = state.get("context", [])
    memory_context = state.get("memory_context", [])
    if (context and len(context) > 0) or (memory_context and len(memory_context) > 0):
        return "generate_answer"
    return "honest_refusal"


def create_agent_graph(checkpointer: Optional[MemorySaver] = None):
    """
    Crea, conecta y compila el StateGraph del agente con RAG, Tools externas y Memoria.
    """
    workflow = StateGraph(AgentState)

    # 1. Registrar nodos con responsabilidad única
    workflow.add_node("validate_input", validate_input_node)
    workflow.add_node("input_guardrail", input_guardrail_node)
    workflow.add_node("resolve_memory", resolve_memory_node)
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("incident_tool", incident_tool_node)
    workflow.add_node("format_tool_answer", format_tool_answer_node)
    workflow.add_node("tool_fallback", tool_fallback_node)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("honest_refusal", honest_refusal_node)
    workflow.add_node("generate_answer", generate_answer_node)
    workflow.add_node("memory_only_reply", memory_only_reply_node)
    

    # 2. Conectar punto de entrada
    workflow.add_edge(START, "validate_input")

    # 3. Aristas condicionales de enrutamiento
    workflow.add_conditional_edges(
    "validate_input",
    route_after_validation,
    {
        "input_guardrail": "input_guardrail",
        "honest_refusal": "honest_refusal",
    },
    )
    workflow.add_conditional_edges(
        "input_guardrail",
        route_after_input_guardrail,
        {
            "resolve_memory": "resolve_memory",
            END: END,
        },
    )
    workflow.add_conditional_edges(
        "resolve_memory",
        route_after_resolve_memory,
        {
            "memory_only_reply": "memory_only_reply",
            "classify_intent": "classify_intent",
        },
    )
    workflow.add_conditional_edges(
        "classify_intent",
        route_after_intent,
        {
            "incident_tool": "incident_tool",
            "retrieve": "retrieve",
        },
    )
    workflow.add_conditional_edges(
        "incident_tool",
        route_after_tool,
        {
            "format_tool_answer": "format_tool_answer",
            "tool_fallback": "tool_fallback",
        },
    )
    workflow.add_conditional_edges(
        "retrieve",
        route_after_retrieval,
        {
            "generate_answer": "generate_answer",
            "honest_refusal": "honest_refusal",
        },
    )

    # 4. Conectar salidas hacia el final
    workflow.add_edge("honest_refusal", END)
    workflow.add_edge("generate_answer", END)
    workflow.add_edge("format_tool_answer", END)
    workflow.add_edge("tool_fallback", END)
    workflow.add_edge("memory_only_reply", END)

    # 5. Compilar con checkpointer para persistencia y auditoría de estados
    active_checkpointer = checkpointer if checkpointer is not None else MemorySaver()
    return workflow.compile(checkpointer=active_checkpointer)


# Instancia compilada por defecto
default_checkpointer = MemorySaver()
agent_app = create_agent_graph(checkpointer=default_checkpointer)


def run_agent(question: str, thread_id: str = "default-thread") -> AgentState:
    """
    Función de ejecución conveniente para correr una pregunta contra el grafo.
    Devuelve el estado final con su respuesta, trazas y estado de memoria.
    """
    initial_state: AgentState = {
        "question": question,
        "thread_id": thread_id,
        "intent": None,
        "context": [],
        "tool_data": None,
        "answer": "",
        "error": None,
        "execution_trace": [],
        "memory_context": [],
        "pending_proposal": None,
        "memory_proposal": None,
        "memory_decision": None,
        "memory_audit": None,
        "memory_only_response": None,
    }
    config = {"configurable": {"thread_id": thread_id}}
    return agent_app.invoke(initial_state, config=config)