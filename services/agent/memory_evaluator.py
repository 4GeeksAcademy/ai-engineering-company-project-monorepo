"""
services/agent/memory_evaluator.py
Clasificación explícita de decisiones sobre propuestas pendientes y
auto-evaluación estructurada de memoria en una sola llamada.
"""
from __future__ import annotations

import logging
import os
import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from services.agent.memory import (
    BusinessLine,
    MemoryCategory,
    ProposalDecision,
    validate_memory_candidate,
)

logger = logging.getLogger("nexova.memory_evaluator")


class ProposalClassification(BaseModel):
    """Clasificación explícita del mensaje del usuario frente a una propuesta pendiente."""
    decision: ProposalDecision
    edited_fact: Optional[str] = None
    remaining_question: Optional[str] = None


class StructuredAnswerWithMemory(BaseModel):
    """Salida estructurada en una sola llamada: respuesta al usuario + propuesta opcional."""
    answer: str
    should_propose_memory: bool = False
    proposed_fact: Optional[str] = None
    business_line: BusinessLine = "outsourcing"
    category: MemoryCategory = "incident_pattern"
    reason: Optional[str] = None


def detect_language(text: str) -> Literal["es", "en"]:
    """Detección ligera de idioma (ES/EN) para la operación España–Miami."""
    lower = (text or "").lower()
    en_markers = ("please", "remember", "ticket", "urgent", "client", "thanks", "how ", "what ", "always ")
    es_markers = ("hola", "gracias", "ticket", "cliente", "siempre", "ahora", "urgente", "recuerda", "cómo", "qué")
    en_score = sum(1 for m in en_markers if m in lower)
    es_score = sum(1 for m in es_markers if m in lower)
    return "en" if en_score > es_score else "es"


def format_proposal_question(fact: str, lang: Literal["es", "en"]) -> str:
    if lang == "en":
        return (
            f"\n\n💾 **Memory proposal:** Would you like me to remember this for future conversations?\n"
            f"> *\"{fact}\"*\n"
            f"(Reply **yes**, **no**, or tell me how you'd like to **edit** it.)"
        )
    return (
        f"\n\n💾 **Propuesta de memoria:** ¿Quieres que recuerde esto para próximas conversaciones?\n"
        f"> *\"{fact}\"*\n"
        f"(Responde **sí**, **no**, o dime cómo prefieres **editarlo**.)"
    )


def _split_remaining_question(message: str) -> Optional[str]:
    """Extrae una segunda pregunta si el usuario respondió a la propuesta y preguntó otra cosa."""
    parts = re.split(r"(?<=[.!?])\s+|\s+(?=por cierto|además|y otra cosa|also|by the way)", message.strip(), maxsplit=1, flags=re.IGNORECASE)
    if len(parts) < 2:
        return None
    tail = parts[1].strip()
    return tail if len(tail) > 5 else None


def classify_pending_decision(message: str, pending_fact: str) -> ProposalClassification:
    """
    Clasifica explícitamente la intención del usuario respecto a una propuesta pendiente.
    Regla: ambigüedad o cambio de tema -> 'ambiguous_or_unrelated' (rechazo por defecto).
    """
    cleaned = (message or "").strip()
    if not cleaned:
        return ProposalClassification(decision="ambiguous_or_unrelated")

    # Intento con LLM estructurado si hay API key configurada
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
            structured_llm = llm.with_structured_output(ProposalClassification)
            prompt = (
                "Clasifica la intención del usuario frente a esta propuesta de memoria pendiente:\n"
                f"Propuesta pendiente: {pending_fact}\n"
                f"Mensaje del usuario: {cleaned}\n\n"
                "Reglas estrictas:\n"
                "- 'approve': aprueba explícitamente guardar la propuesta.\n"
                "- 'reject': rechaza explícitamente guardarla.\n"
                "- 'edit': pide modificar el texto propuesto (devuelve el texto corregido en edited_fact).\n"
                "- 'ambiguous_or_unrelated': cambia de tema, hace otra pregunta sin responder o es ambiguo.\n"
                "- Si además de responder incluye una nueva pregunta, extráela en remaining_question."
            )
            return structured_llm.invoke(prompt)
        except Exception as exc:
            logger.debug(f"Fallback determinista en clasificador de memoria: {exc}")

    # Clasificador determinista explícito (sin '"sí" in mensaje' ingenuo)
    lower = cleaned.lower()
    first_clause = re.split(r"[.!?,\n]", lower, maxsplit=1)[0].strip()
    remaining = _split_remaining_question(cleaned)

    edit_match = re.match(r"^(?:edita|editar|cambia|cambiar|mejor guarda|edit|change)\s*[:\-]?\s*(.+)$", cleaned, re.IGNORECASE)
    if edit_match and len(edit_match.group(1).strip()) >= 12:
        return ProposalClassification(
            decision="edit",
            edited_fact=edit_match.group(1).strip(),
            remaining_question=remaining,
        )

    approve_exact = {"si", "sí", "ok", "vale", "claro", "adelante", "aprobado", "recuerdalo", "recuérdalo", "yes", "yep", "sure", "approve", "save it"}
    reject_exact = {"no", "nop", "nope", "rechazar", "descarta", "descartar", "cancelar", "cancel", "reject", "don't", "no gracias"}

    tokens = first_clause.split()
    if first_clause in approve_exact or (tokens and tokens[0] in {"sí", "si", "yes", "ok", "vale", "claro"} and "?" not in first_clause):
        return ProposalClassification(decision="approve", remaining_question=remaining)

    if first_clause in reject_exact or (tokens and tokens[0] in {"no", "nope", "cancelar", "reject"} and "?" not in first_clause):
        return ProposalClassification(decision="reject", remaining_question=remaining)

    # Cambio de tema / pregunta nueva sin confirmación explícita -> rechazo por defecto
    return ProposalClassification(decision="ambiguous_or_unrelated", remaining_question=cleaned)


def evaluate_turn_for_memory(
    user_message: str,
    base_answer: str,
    memory_context: List[str],
    has_pending_proposal: bool,
) -> StructuredAnswerWithMemory:
    """
    Auto-evaluación en una sola llamada lógica:
    Determina si la interacción contiene una regla operativa reutilizable para Nexova
    y enriquece la respuesta con la propuesta (nunca escribe directo a memoria).
    """
    if has_pending_proposal:
        return StructuredAnswerWithMemory(answer=base_answer, should_propose_memory=False)

    cleaned = (user_message or "").strip()
    if not cleaned:
        return StructuredAnswerWithMemory(answer=base_answer, should_propose_memory=False)

    # Evitar proponer en consultas simples, agradecimientos o tareas one-shot
    lower = cleaned.lower()
    non_memorable_prefixes = ("¿cuántos", "cuántos", "resume ", "resumen ", "gracias", "perfecto", "hola", "buenos días")
    if lower.startswith(non_memorable_prefixes) or len(cleaned) < 25:
        return StructuredAnswerWithMemory(answer=base_answer, should_propose_memory=False)

    # Validar antes contra reglas de privacidad de Nexova
    allowed, _ = validate_memory_candidate(cleaned)
    if not allowed:
        return StructuredAnswerWithMemory(answer=base_answer, should_propose_memory=False)

    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
            structured_llm = llm.with_structured_output(StructuredAnswerWithMemory)
            prompt = (
                "Eres el asistente interno de Nexova Solutions (soporte a outsourcing, headhunting y formación).\n"
                f"Memoria ya consolidada: {memory_context}\n"
                f"Mensaje del usuario: {cleaned}\n"
                f"Respuesta base generada: {base_answer}\n\n"
                "Reglas estrictas:\n"
                "- Mantén la respuesta útil en `answer`.\n"
                "- Solo pon `should_propose_memory=True` si el usuario aporta una regla operativa repetible: "
                "cambio de SLA/escalación, preferencia de cliente B2B recurrente o patrón de helpdesk.\n"
                "- NUNCA propongas datos de candidatos/CVs/entrevistas, salarios de headhunting, "
                "consultas puntuales, saludos o tareas de un solo uso.\n"
                "- Si ya está en memoria consolidada exactamente igual, pon `should_propose_memory=False`."
            )
            result = structured_llm.invoke(prompt)
            if result.should_propose_memory and result.proposed_fact:
                ok, _ = validate_memory_candidate(result.proposed_fact)
                if not ok:
                    result.should_propose_memory = False
                    result.proposed_fact = None
            return result
        except Exception as exc:
            logger.debug(f"Fallback determinista en auto-evaluación de memoria: {exc}")

    # Heurística determinista para pruebas offline/mockeadas:
    rule_triggers = (
        "en realidad", "ahora se resuelven", "siempre pide", "deben ir directo",
        "cambió este mes", "nuevo sla", "escalar directo", "prefers email", "always ", "now resolved in",
    )
    if any(trigger in lower for trigger in rule_triggers):
        category: MemoryCategory = "client_preference" if ("cliente" in lower or "email" in lower or "client" in lower) else (
            "escalation" if ("sla" in lower or "horas" in lower or "urgente" in lower or "escal" in lower) else "incident_pattern"
        )
        return StructuredAnswerWithMemory(
            answer=base_answer,
            should_propose_memory=True,
            proposed_fact=cleaned,
            business_line="outsourcing",
            category=category,
            reason="Corrección o regla operativa recurrente detectada en la interacción.",
        )

    return StructuredAnswerWithMemory(answer=base_answer, should_propose_memory=False)