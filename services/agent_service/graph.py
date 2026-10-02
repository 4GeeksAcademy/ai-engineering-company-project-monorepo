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


# ── Minimal state ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    """Explicit, minimal state that flows between graph nodes.

    Does NOT include the full conversation history — each node receives only
    the data it needs to do its job.
    """

    question: str
    context: list[dict[str, Any]]
    answer: str
    error: str | None


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


# ── Conditional routing logic ──────────────────────────────────────────────

def route_after_question(state: AgentState) -> Literal["retrieve", "__end__"]:
    """If the question is empty or errored, end the graph immediately."""
    if state.get("error") or not state.get("question"):
        return END
    return "retrieve"


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


# ── Build the graph ────────────────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    """Construct, compile, and return the LangGraph agent.

    The graph is compiled explicitly — structural errors (disconnected nodes,
    bad state types) are caught at build time, not in production.
    """
    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("receive_question", receive_question)
    workflow.add_node("retrieve", retrieve_node)
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
    }

    # Stream events for tracing
    events = []
    for event in _compiled_graph.stream(initial_state, {"configurable": {"thread_id": thread_id}}):
        events.append(event)
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