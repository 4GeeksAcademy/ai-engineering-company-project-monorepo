"""
routes/ai_security.py — Endpoints de Seguridad y Gobernanza de IA
Módulo: Secure AI Applications
Estándares: NIST CSF 2.0 & OWASP Top 10 for LLM Applications

Rutas:
- POST /api/ai-security/guardrails/analyze  → Análisis pre-flight (Inyección + PII)
- POST /api/ai-security/hitl/evaluate       → Evaluación de tool execution contra Excessive Agency
- POST /api/ai-security/hitl/approve        → Aprobación/Rechazo humano (Admin)
- GET  /api/ai-security/hitl/pending        → Listar tickets pendientes de aprobación (Admin)
- GET  /api/ai-security/governance/inventory→ Inventario y gobernanza NIST / EU AI Act
- POST /api/ai-security/safe-chat           → Pipeline conversacional seguro con guardrails activos
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Request

from dependencies.auth_deps import get_current_user, get_admin_user
from core.ai_guardrails import (
    prompt_injection_guard,
    sensitive_data_redactor,
    hitl_gate,
    model_output_validator,
    token_budget_limiter,
    AIGovernanceRegistry,
    ThreatLevel,
)

router = APIRouter(prefix="/api/ai-security", tags=["ai-security"])


# ─────────────────────────────────────────────────────────────
# Modelos Pydantic para Request / Response
# ─────────────────────────────────────────────────────────────

class PromptAnalyzeRequest(BaseModel):
    prompt: str = Field(..., description="Prompt del usuario a analizar")
    session_id: Optional[str] = Field("default_session", description="ID de sesión para control de cuota")


class ToolEvaluationRequest(BaseModel):
    tool_name: str = Field(..., description="Nombre de la herramienta que el agente desea ejecutar")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Argumentos suministrados por el LLM")
    reason: Optional[str] = Field("Solicitud automática de agente", description="Motivo de la llamada")


class TicketApprovalRequest(BaseModel):
    ticket_id: str = Field(..., description="Identificador del ticket HITL")
    approved: bool = Field(..., description="True para autorizar, False para denegar")


class SafeChatRequest(BaseModel):
    message: str = Field(..., description="Mensaje del usuario")
    session_id: Optional[str] = Field("default_session", description="Identificador de sesión")


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/guardrails/analyze", status_code=200)
def analyze_prompt_guardrails(payload: PromptAnalyzeRequest):
    """
    Capa Pre-Flight: Analiza el prompt en busca de Prompt Injection (OWASP LLM01)
    y anonimiza PII y secretos antes de contactar a un LLM (OWASP LLM02).
    """
    # 1. Detección de Prompt Injection
    injection_res = prompt_injection_guard.analyze_prompt(payload.prompt)

    # 2. Anonimización de datos sensibles
    redaction_res = sensitive_data_redactor.redact(injection_res.sanitized_prompt)

    return {
        "is_safe": injection_res.is_safe,
        "threat_level": injection_res.threat_level.value,
        "matched_patterns_count": len(injection_res.matched_patterns),
        "sanitized_prompt": redaction_res.sanitized_text,
        "sandboxed_xml": injection_res.sandboxed_xml,
        "redactions_count": redaction_res.redactions_count,
        "redacted_categories": redaction_res.redacted_categories,
        "reasons": injection_res.reasons,
    }


@router.post("/hitl/evaluate", status_code=200)
def evaluate_tool_agency(
    payload: ToolEvaluationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Capa de Mitigación de Excessive Agency (OWASP LLM06):
    Evalúa si la herramienta solicitada por el modelo puede ejecutarse inmediatamente
    o si requiere supervisión humana obligatoria (Human-in-the-Loop).
    """
    # Primero validar que los argumentos del modelo no contengan payloads peligrosos
    args_valid, violations = model_output_validator.validate_tool_arguments(
        payload.tool_name, payload.parameters
    )
    if not args_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parámetros del modelo rechazados por seguridad: {violations}"
        )

    can_execute, ticket, message = hitl_gate.evaluate_tool_request(
        tool_name=payload.tool_name,
        parameters=payload.parameters,
        initiated_by=current_user.get("email", "anonymous_user"),
        reason=payload.reason or "Acción solicitada"
    )

    ticket_data = None
    if ticket:
        ticket_data = {
            "ticket_id": ticket.ticket_id,
            "tool_name": ticket.tool_name,
            "risk_level": ticket.risk_level.value,
            "status": ticket.status,
            "created_at": ticket.created_at,
        }

    return {
        "can_execute_immediately": can_execute,
        "message": message,
        "ticket": ticket_data,
    }


@router.post("/hitl/approve", status_code=200)
def approve_hitl_ticket(
    payload: TicketApprovalRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Resolución Humana: Un administrador autoriza o rechaza una acción de alto impacto.
    """
    try:
        ticket = hitl_gate.approve_ticket(
            ticket_id=payload.ticket_id,
            approved_by=admin_user.get("email", "admin"),
            decision=payload.approved
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status,
        "tool_name": ticket.tool_name,
        "approved_by": ticket.approved_by,
        "resolved_at": ticket.resolved_at,
    }


@router.get("/hitl/pending", status_code=200)
def list_pending_hitl_tickets(admin_user: dict = Depends(get_admin_user)):
    """Lista las acciones agénticas retenidas que aguardan confirmación humana."""
    tickets = hitl_gate.get_pending_tickets()
    return [
        {
            "ticket_id": t.ticket_id,
            "tool_name": t.tool_name,
            "risk_level": t.risk_level.value,
            "initiated_by": t.initiated_by,
            "reason": t.reason,
            "parameters": t.parameters,
            "created_at": t.created_at,
        }
        for t in tickets
    ]


@router.get("/governance/inventory", status_code=200)
def get_ai_governance_inventory():
    """
    Retorna el inventario de sistemas de IA, clasificación de riesgo (EU AI Act)
    y mapeo de controles bajo NIST CSF 2.0.
    """
    return AIGovernanceRegistry.get_inventory()


@router.post("/safe-chat", status_code=200)
def safe_ai_chat(
    payload: SafeChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Pipeline conversacional completo con defensa en profundidad:
    1. Verifica cuota de tokens y límite de iteraciones.
    2. Detecta inyección de prompts (OWASP LLM01).
    3. Anonimiza PII (OWASP LLM02).
    4. Provee aviso de transparencia (EU AI Act Art. 50).
    """
    # 1. Control de recursos
    session_id = f"{current_user.get('id', 'anon')}_{payload.session_id}"
    allowed_iter, current_iter = token_budget_limiter.step_agent_iteration(session_id)
    if not allowed_iter:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Circuit breaker activado: Límite de iteraciones agénticas excedido."
        )

    # 2. Detección de Prompt Injection
    injection_res = prompt_injection_guard.analyze_prompt(payload.message)
    if injection_res.threat_level == ThreatLevel.CRITICAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entrada bloqueada por violación de seguridad: Intento de Prompt Injection / Jailbreak detectado."
        )

    # 3. Anonimización de datos sensibles
    redaction_res = sensitive_data_redactor.redact(injection_res.sanitized_prompt)

    # 4. Simulación de respuesta segura de IA delimitada con aviso de transparencia
    ai_response = (
        f"Hola {current_user.get('email', 'usuario')}. He procesado tu solicitud de forma segura. "
        f"Tu mensaje fue delimitado y saneado con {redaction_res.redactions_count} reemplazos de privacidad."
    )

    return {
        "response": ai_response,
        "is_ai_generated": True,
        "transparency_notice": "Respuesta generada por el Asistente de IA de TrackFlow (EU AI Act Art. 50 compliant).",
        "threat_level": injection_res.threat_level.value,
        "redactions_applied": redaction_res.redactions_count,
        "current_iteration": current_iter,
    }
