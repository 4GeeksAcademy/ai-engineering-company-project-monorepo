"""
services/agent/nodes.py

Nodos con responsabilidad única para el grafo de LangGraph.
Incluye nodos RAG, Tools externas (MCP) y Memoria Persistente con confirmación explícita.
"""

import re
import logging
from typing import Dict, Any, List
from services.agent.state import AgentState
from services.agent.tools import query_incident_via_mcp, get_incident_ticket
from services.agent.memory import memory_store, MemoryProposal
from services.agent.memory_evaluator import (
    classify_pending_decision,
    detect_language,
    evaluate_turn_for_memory,
    format_proposal_question,
)
from services.agent.guardrails import (
    check_input_security,
    classify_input_scope,
    isolate_external_chunks,
    sanitize_external_text,
    validate_output,
)
from data.pipelines.rag import retrieve, generate_answer

logger = logging.getLogger(__name__)


def _build_decision_message(decision: str, final_fact: str | None, lang: str) -> str:
    if decision in ("approve", "edit") and final_fact:
        if lang == "en":
            return f"✅ Memory updated and audited: *\"{final_fact}\"*."
        return f"✅ Memoria actualizada y auditada: *\"{final_fact}\"*."
    if decision == "ambiguous_or_unrelated":
        if lang == "en":
            return "ℹ️ Previous memory proposal was discarded by default (no explicit confirmation)."
        return "ℹ️ La propuesta de memoria anterior se descartó por defecto al no haber confirmación explícita."
    if lang == "en":
        return "🗑️ Memory proposal rejected and logged. Memory remains unchanged."
    return "🗑️ Propuesta de memoria rechazada y registrada. La memoria permanece sin cambios."


def _maybe_propose_memory(
    state: AgentState,
    user_message: str,
    base_answer: str,
    allow_override_refusal: bool = False,
) -> tuple[str, Dict[str, Any] | None]:
    """Evalúa en una sola llamada lógica si proponer memoria y respeta el límite de 1 pendiente."""
    thread_id = state.get("thread_id") or "default-thread"
    has_pending = memory_store.get_pending_proposal(thread_id) is not None
    memory_context = state.get("memory_context", [])

    evaluation = evaluate_turn_for_memory(
        user_message=user_message,
        base_answer=base_answer,
        memory_context=memory_context,
        has_pending_proposal=has_pending,
    )

    if not evaluation.should_propose_memory or not evaluation.proposed_fact:
        return evaluation.answer, None

    proposal = MemoryProposal(
        thread_id=thread_id,
        business_line=evaluation.business_line,
        category=evaluation.category,
        fact=evaluation.proposed_fact,
        reason=evaluation.reason or "Regla operativa reutilizable detectada.",
        source_message=user_message,
    )
    saved, _ = memory_store.save_pending_proposal(proposal)
    if not saved:
        return evaluation.answer, None

    lang = detect_language(user_message)
    if allow_override_refusal:
        intro = (
            "He registrado tu indicación como posible aprendizaje operativo para Nexova."
            if lang == "es"
            else "I have noted this operational rule for Nexova."
        )
        answer_text = intro + format_proposal_question(proposal.fact, lang)
    else:
        answer_text = evaluation.answer + format_proposal_question(proposal.fact, lang)

    return answer_text, proposal.model_dump()


def validate_input_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 1: Valida que la pregunta no esté vacía, lee memoria vigente
    y resuelve cualquier propuesta pendiente antes de continuar el turno.
    """
    question = state.get("question", "").strip()
    thread_id = state.get("thread_id") or "default-thread"
    trace = list(state.get("execution_trace", [])) + ["validate_input"]

    if not question:
        return {
            "question": "",
            "thread_id": thread_id,
            "error": "empty_question",
            "answer": "La consulta no puede estar vacía. Por favor, formula una pregunta válida.",
            "execution_trace": trace,
        }

    pending = memory_store.get_pending_proposal(thread_id)
    audit_dict = None
    decision_str = None
    memory_only_response = None

    if pending is not None:
        classification = classify_pending_decision(question, pending.fact)
        audit = memory_store.resolve_proposal(
            thread_id=thread_id,
            decision=classification.decision,
            source_message=question,
            edited_fact=classification.edited_fact,
        )
        decision_str = audit.decision if audit else classification.decision
        audit_dict = audit.model_dump() if audit else None
        lang = detect_language(question)
        memory_only_response = _build_decision_message(
            decision_str,
            audit.final_fact if audit else None,
            lang,
        )

        # Si el usuario solo respondió a la propuesta sin nueva pregunta, cerramos el turno
        if not classification.remaining_question:
            memory_facts = [e.fact for e in memory_store.read_memory()]
            return {
                "question": question,
                "thread_id": thread_id,
                "intent": "memory_only",
                "error": None,
                "answer": memory_only_response,
                "memory_only_response": memory_only_response,
                "memory_decision": decision_str,
                "memory_audit": audit_dict,
                "memory_context": memory_facts,
                "pending_proposal": None,
                "execution_trace": trace,
            }

        # Si además hizo otra pregunta en el mismo mensaje, continuamos el grafo con ella
        question = classification.remaining_question

    memory_facts = [e.fact for e in memory_store.read_memory()]
    return {
        "question": question,
        "thread_id": thread_id,
        "error": None,
        "memory_context": memory_facts,
        "pending_proposal": None,
        "memory_decision": decision_str,
        "memory_audit": audit_dict,
        "memory_only_response": memory_only_response,
        "execution_trace": trace,
    }

def _apply_output_guard(answer: str) -> tuple[str, bool, str | None]:
    """Valida toda salida del agente contra fugas de contenido o fallos estructurales."""
    checked = validate_output(answer)
    if not checked.allowed and checked.response:
        return checked.response, True, checked.failure_type
    return checked.response or answer, False, None


def input_guardrail_node(state: AgentState) -> Dict[str, Any]:
    """
    Capa de guardrails de entrada (Seguridad + Alcance):
    Bloquea jailbreaks / cruce de cuentas y redirige casual / uso personal
    antes de llegar al RAG, a las tools MCP o a la memoria persistente.
    """
    question = state.get("question", "")
    base_trace = list(state.get("execution_trace", []))

    sec = check_input_security(question)
    if not sec.allowed:
        return {
            "guardrail_triggered": True,
            "guardrail_failure_type": sec.failure_type,
            "answer": sec.response or "",
            "execution_trace": base_trace + ["input_guardrail"],
        }

    scope = classify_input_scope(question)
    if not scope.allowed:
        return {
            "guardrail_triggered": True,
            "guardrail_failure_type": scope.failure_type,
            "answer": scope.response or "",
            "execution_trace": base_trace + ["input_guardrail"],
        }

    return {
        "guardrail_triggered": False,
        "guardrail_failure_type": None,
        "execution_trace": base_trace,
    }


def classify_intent_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 2: Enrutamiento autónomo.
    Determina si la consulta requiere la tool de incidentes o el RAG.
    """
    question = state.get("question", "").lower()
    trace = list(state.get("execution_trace", [])) + ["classify_intent"]

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
    uuid_match = re.search(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", question)
    if uuid_match:
        return uuid_match.group(0)

    match = re.search(r"(?:ticket|incidencia|incidente)\s*#?\s*([a-zA-Z0-9_-]+)", question, re.IGNORECASE)
    if match:
        return match.group(1)

    digits = re.search(r"\b\d+\b", question)
    if digits:
        return digits.group(0)

    return question.strip()


def incident_tool_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 3 (Tool MCP Client): Consulta el gestor de incidentes a través del Servidor MCP.
    """
    question = state["question"]
    trace = list(state.get("execution_trace", [])) + ["incident_tool"]
    ticket_id = extract_ticket_id(question)
    logger.info(f"incident_tool_node (MCP Client): Consultando ticket '{ticket_id}' en Servidor MCP...")
    try:
        if hasattr(get_incident_ticket, "side_effect") and get_incident_ticket.side_effect:
            tool_data = get_incident_ticket(ticket_id, timeout=5.0)
        else:
            tool_data = query_incident_via_mcp(ticket_id, timeout=5.0)
        if isinstance(tool_data, dict):
            for field in ("title", "description"):
                if isinstance(tool_data.get(field), str):
                    tool_data[field] = sanitize_external_text(tool_data[field], source="mcp_tool")
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
    base_answer = (
        f"El ticket '{title}' (ID: {ticket_id}) se encuentra actualmente en estado: **{status}** "
        f"(Categoría: {category}, Origen: {data.get('origin', 'cliente')})."
    )
    final_answer, proposal = _maybe_propose_memory(state, state.get("question", ""), base_answer)
    prefix = state.get("memory_only_response")
    if prefix:
        final_answer = f"{prefix}\n\n{final_answer}"
    safe_answer, og_triggered, og_type = _apply_output_guard(final_answer)
    return {
        "answer": safe_answer,
        "memory_proposal": None if og_triggered else proposal,
        "guardrail_triggered": og_triggered or bool(state.get("guardrail_triggered", False)),
        "guardrail_failure_type": og_type or state.get("guardrail_failure_type"),
        "execution_trace": trace,
    }


def tool_fallback_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo 5 (Fallback): Respuesta honesta si el ticket no existe o la tool agotó el timeout,
    o propuesta de memoria si el usuario aportó una nueva regla operativa de helpdesk.
    """
    trace = list(state.get("execution_trace", [])) + ["tool_fallback"]
    base_answer = "No pude confirmar el estado de ese ticket ahora mismo. Por favor, verifica el identificador o inténtalo más tarde."
    final_answer, proposal = _maybe_propose_memory(
        state, state.get("question", ""), base_answer, allow_override_refusal=True
    )
    prefix = state.get("memory_only_response")
    if prefix:
        final_answer = f"{prefix}\n\n{final_answer}"
    safe_answer, og_triggered, og_type = _apply_output_guard(final_answer)
    return {
        "answer": safe_answer,
        "memory_proposal": None if og_triggered else proposal,
        "guardrail_triggered": og_triggered or bool(state.get("guardrail_triggered", False)),
        "guardrail_failure_type": og_type or state.get("guardrail_failure_type"),
        "execution_trace": trace,
    }

def retrieve_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Ejecuta la recuperación sobre la base de conocimiento vectorial (solo lectura).
    """
    question = state["question"]
    trace = list(state.get("execution_trace", [])) + ["retrieve"]

    try:
        raw_context = retrieve(question, min_score=0.70)
        context = isolate_external_chunks(raw_context) if raw_context else []
    except Exception as exc:
        logger.error(f"Error al ejecutar retrieve en base vectorial: {exc}")
        context = []

    return {
        "context": context,
        "execution_trace": trace,
    }


def honest_refusal_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Respuesta honesta si no hay contexto suficiente, o propuesta de memoria
    si el usuario aportó una nueva regla operativa válida para Nexova.
    """
    trace = list(state.get("execution_trace", [])) + ["honest_refusal"]

    if state.get("error") == "empty_question":
        return {
            "answer": state.get("answer", "La consulta no puede estar vacía."),
            "execution_trace": trace,
        }

    base_answer = "Lo siento, la documentación corporativa actual de Nexova Solutions no contiene información sobre esa consulta."
    question = state.get("question", "")
    final_answer, proposal = _maybe_propose_memory(
        state, question, base_answer, allow_override_refusal=True
    )

    prefix = state.get("memory_only_response")
    if prefix:
        final_answer = f"{prefix}\n\n{final_answer}"

    safe_answer, og_triggered, og_type = _apply_output_guard(final_answer)
    return {
        "answer": safe_answer,
        "memory_proposal": None if og_triggered else proposal,
        "guardrail_triggered": og_triggered or bool(state.get("guardrail_triggered", False)),
        "guardrail_failure_type": og_type or state.get("guardrail_failure_type"),
        "execution_trace": trace,
    }


def generate_answer_node(state: AgentState) -> Dict[str, Any]:
    """
    Nodo RAG: Genera respuesta combinando RAG (solo lectura) + memoria consolidada,
    y evalúa en una sola llamada si proponer un nuevo recuerdo.
    """
    question = state["question"]
    context: List[Dict[str, Any]] = list(state.get("context", []))
    memory_facts = state.get("memory_context", [])
    trace = list(state.get("execution_trace", [])) + ["generate_answer"]

    if memory_facts:
        memory_block = "\n".join(f"- {fact}" for fact in memory_facts)
        context = [
            {
                "text": f"[Memoria Operativa Aprobada de Nexova]\n{memory_block}",
                "source": "agent_memory",
                "score": 1.0,
            }
        ] + context

    base_answer = generate_answer(question, context)
    final_answer, proposal = _maybe_propose_memory(state, question, base_answer)

    prefix = state.get("memory_only_response")
    if prefix:
        final_answer = f"{prefix}\n\n{final_answer}"

    safe_answer, og_triggered, og_type = _apply_output_guard(final_answer)
    return {
        "answer": safe_answer,
        "memory_proposal": None if og_triggered else proposal,
        "guardrail_triggered": og_triggered or bool(state.get("guardrail_triggered", False)),
        "guardrail_failure_type": og_type or state.get("guardrail_failure_type"),
        "execution_trace": trace,
    }


def memory_only_reply_node(state: AgentState) -> Dict[str, Any]:
    """Nodo final cuando el turno únicamente resolvía una propuesta pendiente de memoria."""
    trace = list(state.get("execution_trace", [])) + ["memory_only_reply"]
    safe_answer, og_triggered, og_type = _apply_output_guard(state.get("answer", ""))
    return {
        "answer": safe_answer,
        "guardrail_triggered": og_triggered or bool(state.get("guardrail_triggered", False)),
        "guardrail_failure_type": og_type or state.get("guardrail_failure_type"),
        "execution_trace": trace,
    }