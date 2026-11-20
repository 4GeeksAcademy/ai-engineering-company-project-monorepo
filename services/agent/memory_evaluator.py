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


_HEDGE_OR_NEGATION_RE = re.compile(
    r"\b("
    r"pero|aunque|sin embargo|no estoy seguro|no estoy segura|no s[eé]|duda|dudo|"
    r"quiz[aá]s?|tal vez|a lo mejor|puede ser|depende|espera|mejor no|luego|despu[eé]s|"
    r"not sure|unsure|maybe|perhaps|but|however|although|wait|never\s*mind|don'?t|do not|nope|no"
    r")\b",
    re.IGNORECASE,
)

_UNEQUIVOCAL_APPROVE_EXACT = {
    "si", "sí", "ok", "okay", "vale", "claro", "adelante", "aprobado",
    "recuerdalo", "recuérdalo", "guardalo", "guárdalo", "confirmo", "confirmado",
    "de acuerdo", "por supuesto", "sin duda", "perfecto",
    "yes", "yep", "yeah", "sure", "approve", "approved", "save it", "confirm", "confirmed", "go ahead",
}

_APPROVE_PREFIXES = {"si", "sí", "ok", "okay", "vale", "claro", "yes", "yep", "sure"}
_APPROVE_SUFFIXES = {
    "recuerdalo", "recuérdalo", "guardalo", "guárdalo", "adelante", "aprobado",
    "confirmo", "confirmado", "por favor", "de acuerdo",
    "save it", "approve", "approved", "go ahead", "please", "confirm",
}

_EXPLICIT_REJECT_EXACT = {
    "no", "nop", "nope", "rechazar", "rechazado", "descarta", "descartar", "descartalo", "descártalo",
    "cancelar", "cancela", "cancel", "reject", "rejected", "don't", "do not", "no gracias", "no, gracias",
    "mejor no", "no, mejor no", "no lo guardes", "no guardes", "olvidalo", "olvídalo",
}


def _normalize_clause(text: str) -> str:
    cleaned = re.sub(r"^[¡¿\s]+|[.!?\s]+$", "", (text or "").strip().lower())
    cleaned = re.sub(r"[,;:]+\s*", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _is_unequivocal_approve(clause: str) -> bool:
    if not clause or "?" in clause or _HEDGE_OR_NEGATION_RE.search(clause):
        return False
    norm = _normalize_clause(clause)
    if norm in _UNEQUIVOCAL_APPROVE_EXACT:
        return True
    parts = norm.split(maxsplit=1)
    return len(parts) == 2 and parts[0] in _APPROVE_PREFIXES and parts[1] in _APPROVE_SUFFIXES


def _is_explicit_reject(clause: str) -> bool:
    if not clause or "?" in clause:
        return False
    norm = _normalize_clause(clause)
    if norm in _EXPLICIT_REJECT_EXACT:
        return True
    # Rechazo explícito que empieza por 'no' sin contradicción afirmativa ('sí, pero no' es ambiguo)
    tokens = norm.split()
    return bool(tokens and tokens[0] in {"no", "nope", "cancelar", "reject", "descartar", "descarta"})


def classify_pending_decision(message: str, pending_fact: str) -> ProposalClassification:
    """
    Clasifica explícitamente la intención del usuario respecto a una propuesta pendiente.
    Regla: ambigüedad, duda o cambio de tema -> 'ambiguous_or_unrelated' (rechazo por defecto).
    Exige aprobación inequívoca para devolver 'approve'.
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
                "- 'approve': aprueba de forma inequívoca guardar la propuesta (sin dudas ni contradicciones en ninguna oración).\n"
                "- 'reject': rechaza explícitamente guardarla.\n"
                "- 'edit': pide modificar el texto propuesto (devuelve el texto corregido en edited_fact).\n"
                "- 'ambiguous_or_unrelated': cambia de tema, hace otra pregunta sin responder, duda o se contradice después "
                "(ej. 'Sí, pero no', 'Sí. Pero no', 'Sí. No estoy seguro', 'Claro. Aunque mejor no').\n"
                "- Si además de responder incluye una nueva pregunta válida, extráela en remaining_question."
            )
            return structured_llm.invoke(prompt)
        except Exception as exc:
            logger.debug(f"Fallback determinista en clasificador de memoria: {exc}")

    # Clasificador determinista estricto sobre el mensaje completo (default-deny ante contradicción o duda)
    lower = cleaned.lower()
    clauses = [c.strip() for c in re.split(r"(?<=[.!?\n])\s*", lower) if c.strip()]
    first_sentence = clauses[0] if clauses else lower
    trailing_text = " ".join(clauses[1:]) if len(clauses) > 1 else ""
    remaining = _split_remaining_question(cleaned)

    edit_match = re.match(r"^(?:edita|editar|cambia|cambiar|mejor guarda|edit|change)\s*[:\-]?\s*(.+)$", cleaned, re.IGNORECASE)
    if edit_match and len(edit_match.group(1).strip()) >= 12:
        return ProposalClassification(
            decision="edit",
            edited_fact=edit_match.group(1).strip(),
            remaining_question=remaining,
        )

    # Si cualquier oración posterior introduce duda, contradicción o negación -> default-deny
    if trailing_text and _HEDGE_OR_NEGATION_RE.search(trailing_text):
        return ProposalClassification(decision="ambiguous_or_unrelated", remaining_question=None)

    if _is_unequivocal_approve(first_sentence) and not _HEDGE_OR_NEGATION_RE.search(lower):
        return ProposalClassification(decision="approve", remaining_question=remaining)

    if _is_explicit_reject(first_sentence):
        return ProposalClassification(decision="reject", remaining_question=remaining)

    # Ambigüedad, duda ('Sí, pero no', 'Sí, pero no estoy seguro') o cambio de tema -> rechazo por defecto
    has_followup_question = "?" in cleaned or remaining is not None
    looks_like_hedged_reply = bool(
        re.match(r"^(?:s[ií]|ok|okay|vale|claro|yes|sure|tal vez|quiz[aá]s?|no s[eé]|depende)\b", lower)
    )
    next_question = remaining if (looks_like_hedged_reply and not ("?" in cleaned and remaining is None)) else (
        cleaned if (has_followup_question or not looks_like_hedged_reply) else None
    )
    return ProposalClassification(decision="ambiguous_or_unrelated", remaining_question=next_question)

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