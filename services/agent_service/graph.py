"""LangGraph agent for TrackFlow knowledge queries.

Models the RAG pipeline as an explicit state graph with single-responsibility
nodes, conditional edges, checkpointing, and structured tracing.
"""

from __future__ import annotations

import uuid
from typing import Any, Literal

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from data.pipelines.rag import generate_answer, retrieve
from services.agent_service.tracing import get_recorder
from services.agent_service.tools import (
    extract_ticket_id,
    extract_product_name,
    get_ticket_by_id,
    get_product_stock,
)


# ── Minimal state ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    """Explicit, minimal state that flows between graph nodes.

    Does NOT include the full conversation history — each node receives only
    the data it needs to do its job.

    ``tool_type`` records which source was used (rag | ticket_tool |
    inventory_tool | None) so the trace and answer can be audited.
    """

    question: str
    context: list[dict[str, Any]]
    answer: str
    error: str | None
    tool_type: str | None


# ── Nodes (single responsibility) ──────────────────────────────────────────

def receive_question(state: AgentState) -> dict[str, Any]:
    """Validate input and detect empty questions."""
    question = state.get("question", "").strip()

    if not question or len(question) < 2:
        return {
            "question": question,
            "error": "La pregunta está vacía o es demasiado corta.",
            "context": [],
            "answer": "",
        }

    return {"question": question, "error": None}


def retrieve_node(state: AgentState) -> dict[str, Any]:
    """Retrieve relevant context from the knowledge base using the existing
    RAG pipeline. Reuses retrieve() from data/pipelines/rag.py without
    duplicating its logic."""
    question = state["question"]

    try:
        docs = retrieve(question)
    except Exception as exc:
        return {"context": [], "error": f"Error al recuperar información: {exc}"}

    return {"context": docs, "error": None}


def generate_answer_node(state: AgentState) -> dict[str, Any]:
    """Generate the final answer from the already-retrieved context.

    Calls generate_answer(question, context) — the separated generation step.
    Does NOT call query() to avoid re-running retrieval inside the node.
    """
    question = state["question"]
    context = state.get("context", [])

    try:
        answer = generate_answer(question, context)
    except Exception as exc:
        return {"answer": "", "error": f"Error al generar respuesta: {exc}"}

    return {"answer": answer, "error": None}


def no_info_node(state: AgentState) -> dict[str, Any]:
    """Honest response when no relevant context was found."""
    return {
        "answer": (
            "No encuentro información suficientemente relevante en la base de "
            "conocimiento de TrackFlow para responder con seguridad. Recomiendo "
            "confirmar el caso con el account manager antes de comprometer una "
            "condición."
        ),
        "error": None,
    }


# ── Tool nodes (single responsibility, requirement #5) ────────────────────

def ticket_tool_node(state: AgentState) -> dict[str, Any]:
    """Query the Centralised Incident Manager for a specific ticket.

    Extracts a numeric ticket ID from the question using
    ``extract_ticket_id()``, then calls ``get_ticket_by_id()``.

    Returns context with the ticket data if successful, or an error.
    """
    question = state["question"]
    ticket_id = extract_ticket_id(question)

    if ticket_id is None:
        return {
            "context": [],
            "error": "No se identificó un número de ticket en la pregunta.",
            "tool_type": "ticket_tool",
        }

    result = get_ticket_by_id(ticket_id)

    if result.error:
        return {
            "context": [],
            "error": result.error,
            "tool_type": "ticket_tool",
        }

    return {
        "context": [{"type": "ticket", "data": result.model_dump()}],
        "error": None,
        "tool_type": "ticket_tool",
    }


def inventory_tool_node(state: AgentState) -> dict[str, Any]:
    """Query the supplier directory for product stock information.

    Extracts a product name from the question using
    ``extract_product_name()``, then calls ``get_product_stock()``.

    Returns context with the product data if successful, or an error.
    """
    question = state["question"]
    product = extract_product_name(question)

    if product is None:
        return {
            "context": [],
            "error": "No se identificó un producto en la pregunta.",
            "tool_type": "inventory_tool",
        }

    result = get_product_stock(product)

    if result.error:
        return {
            "context": [],
            "error": result.error,
            "tool_type": "inventory_tool",
        }

    return {
        "context": [{"type": "inventory", "data": result.model_dump()}],
        "error": None,
        "tool_type": "inventory_tool",
    }


# ── Conditional routing logic ──────────────────────────────────────────────

def route_after_question(
    state: AgentState,
) -> Literal["retrieve", "ticket_tool", "inventory_tool", "__end__"]:
    """Decide which path to take based on the question content.

    Keywords are checked in priority order:
      1. Ticket/incident keywords → ``ticket_tool``
      2. Inventory/supplier keywords → ``inventory_tool``
      3. Default → ``retrieve`` (RAG)
      4. Empty/errored → ``__end__``

    This is a lightweight, deterministic classifier — no LLM call needed
    for routing (requirement #8: automatic routing).
    """
    if state.get("error") or not state.get("question"):
        return END

    question = state["question"].lower()

    # 1. Ticket / incident keywords
    ticket_keywords = [
        "ticket", "incidencia", "caso #",
        "id del", "estado del ticket", "en qué estado",
        "número de caso",
    ]
    if any(kw in question for kw in ticket_keywords) or _has_ticket_number(question):
        return "ticket_tool"

    # 2. Inventory / supplier keywords
    inventory_keywords = [
        "stock", "inventario", "producto", "proveedor",
        "hay de", "tenemos", "disponibilidad",
    ]
    if any(kw in question for kw in inventory_keywords):
        return "inventory_tool"

    # 3. Default: RAG
    return "retrieve"


def _has_ticket_number(question: str) -> bool:
    """Check if the question contains a pattern like '#482' without being
    preceded by ticket/incidencia keywords (those are already caught above)."""
    import re
    return bool(re.search(r"#\d+", question))


def route_after_retrieve(state: AgentState) -> Literal["generate_answer", "no_info"]:
    """If retrieval returned no context above threshold, route to no_info.

    Otherwise proceed to generation with the retrieved context.
    """
    if state.get("error"):
        return "no_info"

    context = state.get("context", [])
    if not context:
        return "no_info"

    return "generate_answer"


def route_after_tool(state: AgentState) -> Literal["generate_answer", "no_info"]:
    """Route after a tool execution.

    If the tool produced data without error → generate_answer.
    If the tool failed (timeout, 404, etc.) → no_info (honest fallback,
    requirement #7).
    """
    if state.get("error"):
        return "no_info"

    context = state.get("context", [])
    if not context:
        return "no_info"

    return "generate_answer"


# ── Build the graph ────────────────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    """Construct, compile, and return the LangGraph agent with external tools.

    Topology::

                        ┌── ticket_tool ──route_after_tool──┐
                        │                                  │
    [receive_question] ──┤── inventory_tool ─route_after_tool─┤──→ [generate_answer] ──→ END
                        │                                  │
                        └── retrieve ────route_after_retrieve─└          │
                             │                   (sin contexto o error)  │
                             └──── no_info ←────────────────────└
                        (pregunta vacía → END)

    The graph is compiled explicitly — structural errors (disconnected nodes,
    bad state types) are caught at build time, not in production.
    """
    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("receive_question", receive_question)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("ticket_tool", ticket_tool_node)
    workflow.add_node("inventory_tool", inventory_tool_node)
    workflow.add_node("generate_answer", generate_answer_node)
    workflow.add_node("no_info", no_info_node)

    # Entry point
    workflow.set_entry_point("receive_question")

    # Conditional edges
    workflow.add_conditional_edges(
        "receive_question",
        route_after_question,
    )
    workflow.add_conditional_edges(
        "retrieve",
        route_after_retrieve,
    )
    workflow.add_conditional_edges(
        "ticket_tool",
        route_after_tool,
    )
    workflow.add_conditional_edges(
        "inventory_tool",
        route_after_tool,
    )

    # Fixed edges
    workflow.add_edge("generate_answer", END)
    workflow.add_edge("no_info", END)

    # Compile with checkpointing — MemorySaver persists state at each step
    # so runs can be inspected or resumed.
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)


# ── Convenience runner ─────────────────────────────────────────────────────

_compiled_graph = build_agent_graph()
_recorder = get_recorder()


def run_agent(question: str) -> dict[str, Any]:
    """Execute the agent graph with the given question.

    Returns the final state dict plus a consultable trace.
    """
    run_id = str(uuid.uuid4())
    thread_id = run_id

    _recorder.start_run(run_id, question)

    initial_state: AgentState = {
        "question": question,
        "context": [],
        "answer": "",
        "error": None,
        "tool_type": None,
    }

    # Stream events for tracing
    for event in _compiled_graph.stream(initial_state, {"configurable": {"thread_id": thread_id}}):
        for node_name, node_output in event.items():
            _recorder.record_step(run_id, node_name, initial_state, node_output)

    # Get final state from checkpoint
    final_state = _compiled_graph.get_state({"configurable": {"thread_id": thread_id}})
    result = dict(final_state.values) if final_state else initial_state

    return {
        "answer": result.get("answer", ""),
        "trace": _recorder.get_trace(run_id),
        "run_id": run_id,
    }


__all__ = ["AgentState", "build_agent_graph", "run_agent"]