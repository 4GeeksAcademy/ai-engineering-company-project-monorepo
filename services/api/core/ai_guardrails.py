"""
core/ai_guardrails.py — Módulo Central de Seguridad y Gobernanza de IA
Módulo: Secure AI Applications
Estándares: NIST CSF 2.0 (Govern, Identify, Protect, Detect, Respond, Recover)
            OWASP Top 10 for LLM Applications (2025/2026)

Implementa:
1. PromptInjectionGuard: Detección heurística de inyecciones directas/indirectas y sandboxing de contexto.
2. SensitiveDataRedactor: Anonimización determinista de PII y secretos antes de llamada a modelos externos.
3. HumanInTheLoopGate (HITL): Puerta obligatoria de aprobación humana contra Excessive Agency (LLM06).
4. ModelOutputValidator: Tratamiento de respuestas y tool calls como datos no confiables (LLM09).
5. TokenBudgetRateLimiter: Control de cuota de tokens y circuit breaker de recursión agéntica (LLM10).
6. AIGovernanceRegistry: Inventario y auditoría de sistemas de IA según el EU AI Act.
"""

from __future__ import annotations

import re
import uuid
import time
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Tuple

# Logger estructurado para eventos de seguridad en IA
ai_security_logger = logging.getLogger("ai_security.audit")


# ─────────────────────────────────────────────────────────────
# Enums y Estructuras de Datos
# ─────────────────────────────────────────────────────────────

class ThreatLevel(str, Enum):
    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    CRITICAL = "CRITICAL"


class ActionRiskLevel(str, Enum):
    READ_ONLY = "READ_ONLY"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    CRITICAL_DESTRUCTIVE = "CRITICAL_DESTRUCTIVE"


class EUAIRiskClass(str, Enum):
    MINIMAL_RISK = "MINIMAL_RISK"
    SPECIFIC_TRANSPARENCY = "SPECIFIC_TRANSPARENCY"
    HIGH_RISK = "HIGH_RISK"
    UNACCEPTABLE_RISK = "UNACCEPTABLE_RISK"


@dataclass
class PromptAnalysisResult:
    is_safe: bool
    threat_level: ThreatLevel
    matched_patterns: List[str]
    sanitized_prompt: str
    sandboxed_xml: str
    reasons: List[str] = field(default_factory=list)


@dataclass
class RedactionResult:
    original_text: str
    sanitized_text: str
    redactions_count: int
    redacted_categories: List[str]


@dataclass
class ApprovalTicket:
    ticket_id: str
    tool_name: str
    parameters: Dict[str, Any]
    risk_level: ActionRiskLevel
    initiated_by: str
    reason: str
    created_at: float
    status: str = "PENDING"  # PENDING, APPROVED, REJECTED
    approved_by: Optional[str] = None
    resolved_at: Optional[float] = None


# ─────────────────────────────────────────────────────────────
# 1. PromptInjectionGuard (OWASP LLM01: Prompt Injection)
# ─────────────────────────────────────────────────────────────

class PromptInjectionGuard:
    """
    Detector pre-flight contra ataques de Prompt Injection directos e indirectos.
    Analiza patrones de anulación de instrucciones del sistema, jailbreaks y
    delimitadores maliciosos, envolviendo las entradas en sandboxes delimitados.
    """

    # Patrones críticos de anulación e inyección (EN y ES)
    INJECTION_PATTERNS = [
        # Anulación de instrucciones
        r"(?i)\b(ignore|disregard|forget|bypass|override)\s+(all\s+)?(previous|past|prior|above|system)?\s*(instructions|prompts|rules|commands)",
        r"(?i)\b(ignora|olvida|descarta|salta|anula)\s+(todas\s+las\s+)?(instrucciones|reglas|ordenes|prompts)?\s*(anteriores|previas|del\s+sistema)",
        # Modos jailbreak / suplantación
        r"(?i)\b(system\s*prompt\s*override|modo\s*desarrollador|developer\s*mode|god\s*mode|jailbreak|DAN\s*mode)\b",
        r"(?i)\b(you\s+are\s+now|act\s+as\s+an\s+unrestricted|pretend\s+you\s+have\s+no\s+rules|ahora\s+eres|actua\s+sin\s+restricciones)\b",
        # Extracción de instrucciones del sistema
        r"(?i)\b(reveal|show|print|display|dump|leak)\s+(your\s+)?(system\s+prompt|initial\s+instructions|base\s+prompt|hidden\s+rules)\b",
        r"(?i)\b(revela|muestra|imprime|revela\s+tus)\s+(instrucciones\s+de\s+sistema|prompt\s+inicial|reglas\s+ocultas)\b",
        # Delimitadores de control maliciosos
        r"(?i)(<\s*\/?\s*(system|instructions|admin|prompt)\s*>|\[\s*\/?\s*INST\s*\]|```(?:system|rules))",
    ]

    def __init__(self):
        self._compiled_patterns = [re.compile(p) for p in self.INJECTION_PATTERNS]

    def analyze_prompt(self, user_prompt: str) -> PromptAnalysisResult:
        """
        Analiza el texto del usuario para detectar intentos de inyección y
        retorna un resultado estructurado con el sandbox XML seguro.
        """
        if not user_prompt:
            return PromptAnalysisResult(
                is_safe=True,
                threat_level=ThreatLevel.SAFE,
                matched_patterns=[],
                sanitized_prompt="",
                sandboxed_xml="<user_input></user_input>",
                reasons=[]
            )

        matched_patterns = []
        for pattern in self._compiled_patterns:
            matches = pattern.findall(user_prompt)
            if matches:
                matched_patterns.append(pattern.pattern)

        # Determinar nivel de amenaza
        if len(matched_patterns) >= 2:
            threat_level = ThreatLevel.CRITICAL
            is_safe = False
        elif len(matched_patterns) == 1:
            threat_level = ThreatLevel.SUSPICIOUS
            is_safe = False
        else:
            threat_level = ThreatLevel.SAFE
            is_safe = True

        # Sanitización y delimitación estricta de contexto
        # Neutralizar posibles cierres de etiquetas de sandbox simulados
        neutralized = user_prompt.replace("</user_input>", "[escaped_tag]")
        neutralized = neutralized.replace("<user_input>", "[escaped_tag]")
        sandboxed_xml = f"<user_input>\n{neutralized.strip()}\n</user_input>"

        reasons = []
        if not is_safe:
            reasons.append(f"Detectados {len(matched_patterns)} patrones de posible manipulación de prompt o jailbreak.")
            ai_security_logger.warning(
                f"[AI_SECURITY_ALERT] PROMPT_INJECTION_DETECTED | threat={threat_level.value} | "
                f"patterns_matched={len(matched_patterns)} | preview={user_prompt[:80]}"
            )

        return PromptAnalysisResult(
            is_safe=is_safe,
            threat_level=threat_level,
            matched_patterns=matched_patterns,
            sanitized_prompt=neutralized,
            sandboxed_xml=sandboxed_xml,
            reasons=reasons
        )


# ─────────────────────────────────────────────────────────────
# 2. SensitiveDataRedactor (OWASP LLM02: Sensitive Info Disclosure)
# ─────────────────────────────────────────────────────────────

class SensitiveDataRedactor:
    """
    Filtro de privacidad determinista para anonimizar PII y secretos corporativos
    antes de transmitir prompts a modelos de terceros (OpenAI, Anthropic, etc.).
    """

    PATTERNS: Dict[str, Tuple[re.Pattern, str]] = {
        "CREDIT_CARD": (
            re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
            "[REDACTED_CREDIT_CARD]"
        ),
        "EMAIL": (
            re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b"),
            "[REDACTED_EMAIL]"
        ),
        "PHONE_NUMBER": (
            re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b"),
            "[REDACTED_PHONE]"
        ),
        "NATIONAL_ID_ES": (
            re.compile(r"\b(?:[XYZxyz]\d{7}[A-Za-z]|\d{8}[A-Za-z])\b"),
            "[REDACTED_DNI_NIE]"
        ),
        "API_SECRET_TOKEN": (
            re.compile(r"\b(?:bearer\s+[A-Za-z0-9._~+/-]{20,}|(?:ghp|sk|api|jwt)_[A-Za-z0-9_]{16,})\b", re.IGNORECASE),
            "[REDACTED_SECRET_TOKEN]"
        ),
        "PASSWORD_FIELD": (
            re.compile(r"(?i)\b(?:password|passwd|contrase[ñn]a)\s*[:=]\s*['\"]?(\S+?)['\"]?(?=\s|$|,|;)", re.IGNORECASE),
            "[REDACTED_PASSWORD]"
        ),
    }

    def redact(self, text: str) -> RedactionResult:
        """
        Escanea y reemplaza información sensible por marcas seguras anonimizadas.
        """
        if not text:
            return RedactionResult(original_text="", sanitized_text="", redactions_count=0, redacted_categories=[])

        sanitized = text
        total_redactions = 0
        categories_found = []

        for category, (pattern, placeholder) in self.PATTERNS.items():
            matches = list(pattern.finditer(sanitized))
            if matches:
                total_redactions += len(matches)
                categories_found.append(category)
                sanitized = pattern.sub(placeholder, sanitized)

        if total_redactions > 0:
            ai_security_logger.info(
                f"[AI_PRIVACY_LOG] PII_REDACTED | count={total_redactions} | categories={categories_found}"
            )

        return RedactionResult(
            original_text=text,
            sanitized_text=sanitized,
            redactions_count=total_redactions,
            redacted_categories=categories_found
        )


# ─────────────────────────────────────────────────────────────
# 3. HumanInTheLoopGate (OWASP LLM06: Excessive Agency)
# ─────────────────────────────────────────────────────────────

class HumanInTheLoopGate:
    """
    Control de supervisión humana (HITL) para acciones agénticas críticas o irreversibles.
    Previene que agentes autónomos ejecuten mutaciones destructivas sin consentimiento explícito.
    """

    # Herramientas que requieren confirmación humana obligatoria
    HIGH_RISK_TOOLS: Dict[str, ActionRiskLevel] = {
        "delete_supplier": ActionRiskLevel.CRITICAL_DESTRUCTIVE,
        "purge_inventory": ActionRiskLevel.CRITICAL_DESTRUCTIVE,
        "update_user_role": ActionRiskLevel.CRITICAL_DESTRUCTIVE,
        "transfer_funds": ActionRiskLevel.CRITICAL_DESTRUCTIVE,
        "execute_sql_mutation": ActionRiskLevel.CRITICAL_DESTRUCTIVE,
        "send_mass_notifications": ActionRiskLevel.MEDIUM,
    }

    # Herramientas de solo lectura seguras
    SAFE_READONLY_TOOLS: Set[str] = {
        "get_stock",
        "list_suppliers",
        "get_supplier_detail",
        "search_incidents",
        "get_incident_summary",
        "calculate_shipping_rates",
    }

    def __init__(self):
        # Almacenamiento en memoria de solicitudes de aprobación pendientes
        self._tickets: Dict[str, ApprovalTicket] = {}

    def evaluate_tool_request(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        initiated_by: str,
        reason: str = "Solicitud agéntica"
    ) -> Tuple[bool, Optional[ApprovalTicket], str]:
        """
        Evalúa si la herramienta puede ejecutarse automáticamente o si requiere
        aprobación humana.
        Retorna (can_execute_immediately, ticket, message).
        """
        normalized_tool = tool_name.lower().strip()

        # Si la herramienta es de solo lectura segura
        if normalized_tool in self.SAFE_READONLY_TOOLS:
            return True, None, "Ejecución directa autorizada (Herramienta de solo lectura)"

        # Si la herramienta está categorizada como de alto riesgo
        if normalized_tool in self.HIGH_RISK_TOOLS:
            ticket_id = f"HITL-{uuid.uuid4().hex[:8].upper()}"
            ticket = ApprovalTicket(
                ticket_id=ticket_id,
                tool_name=normalized_tool,
                parameters=parameters,
                risk_level=self.HIGH_RISK_TOOLS[normalized_tool],
                initiated_by=initiated_by,
                reason=reason,
                created_at=time.time(),
                status="PENDING"
            )
            self._tickets[ticket_id] = ticket

            ai_security_logger.warning(
                f"[AI_HITL_ALERT] ACTION_HELD_FOR_APPROVAL | ticket={ticket_id} | "
                f"tool={normalized_tool} | initiated_by={initiated_by}"
            )
            return False, ticket, f"Acción '{normalized_tool}' requiere aprobación humana (Ticket {ticket_id})"

        # Si es una herramienta desconocida, aplicar política de Mínimo Privilegio (Fail Closed)
        ticket_id = f"HITL-{uuid.uuid4().hex[:8].upper()}"
        ticket = ApprovalTicket(
            ticket_id=ticket_id,
            tool_name=normalized_tool,
            parameters=parameters,
            risk_level=ActionRiskLevel.MEDIUM,
            initiated_by=initiated_by,
            reason="Herramienta no clasificada (principio de menor privilegio)",
            created_at=time.time(),
            status="PENDING"
        )
        self._tickets[ticket_id] = ticket
        return False, ticket, f"Herramienta no categorizada retenida por seguridad (Ticket {ticket_id})"

    def approve_ticket(self, ticket_id: str, approved_by: str, decision: bool) -> ApprovalTicket:
        """
        Aprueba o rechaza un ticket de confirmación humana pendiente.
        """
        if ticket_id not in self._tickets:
            raise KeyError(f"Ticket '{ticket_id}' no encontrado.")

        ticket = self._tickets[ticket_id]
        if ticket.status != "PENDING":
            raise ValueError(f"El ticket '{ticket_id}' ya fue procesado con estado {ticket.status}.")

        ticket.status = "APPROVED" if decision else "REJECTED"
        ticket.approved_by = approved_by
        ticket.resolved_at = time.time()

        ai_security_logger.info(
            f"[AI_HITL_RESOLUTION] TICKET_{ticket.status} | ticket={ticket_id} | "
            f"resolved_by={approved_by} | tool={ticket.tool_name}"
        )
        return ticket

    def get_pending_tickets(self) -> List[ApprovalTicket]:
        """Retorna todos los tickets en espera de revisión humana."""
        return [t for t in self._tickets.values() if t.status == "PENDING"]


# ─────────────────────────────────────────────────────────────
# 4. ModelOutputValidator (OWASP LLM09: Misinformation & Untrusted Output)
# ─────────────────────────────────────────────────────────────

class ModelOutputValidator:
    """
    Trata las salidas del LLM como datos no confiables. Valida que los tool calls
    y las respuestas estructuradas no contengan inyecciones de código o parámetros malformados.
    """

    DANGEROUS_PAYLOADS = [
        re.compile(r"(?i)(;|&&|\|\|)\s*(rm\s+-rf|del\s+|shutdown|reboot)"),
        re.compile(r"(?i)(drop\s+table|truncate\s+table|delete\s+from\s+users|update\s+users\s+set)"),
        re.compile(r"(?i)(<script[\s>]|javascript:|onload=|onerror=)"),
        re.compile(r"(?i)(\.\.\/|\.\.\\)"),  # Path traversal
    ]

    def validate_tool_arguments(self, tool_name: str, arguments: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Valida que los argumentos de la herramienta no contengan comandos destructivos o inyecciones.
        """
        violations = []
        for key, val in arguments.items():
            val_str = str(val)
            for pattern in self.DANGEROUS_PAYLOADS:
                if pattern.search(val_str):
                    violations.append(f"Parámetro '{key}' contiene payload peligroso coincidente con {pattern.pattern}")

        if violations:
            ai_security_logger.error(
                f"[AI_SECURITY_ALERT] UNTRUSTED_MODEL_OUTPUT_BLOCKED | tool={tool_name} | violations={violations}"
            )
            return False, violations

        return True, []


# ─────────────────────────────────────────────────────────────
# 5. TokenBudgetRateLimiter (OWASP LLM10: Unbounded Consumption)
# ─────────────────────────────────────────────────────────────

class TokenBudgetRateLimiter:
    """
    Control de cuotas de tokens y circuit breaker contra loops recursivos agénticos.
    """

    def __init__(self, max_tokens_per_session: int = 8000, max_agent_iterations: int = 5):
        self.max_tokens_per_session = max_tokens_per_session
        self.max_agent_iterations = max_agent_iterations
        # Mapeo: session_id -> tokens consumidos
        self._token_usage: Dict[str, int] = {}
        # Mapeo: session_id -> iteraciones agénticas acumuladas
        self._iteration_counts: Dict[str, int] = {}

    def track_tokens(self, session_id: str, tokens: int) -> Tuple[bool, int, str]:
        """
        Registra el consumo de tokens y verifica el presupuesto disponible.
        Retorna (allowed, remaining_budget, message).
        """
        current = self._token_usage.get(session_id, 0)
        new_total = current + tokens

        if new_total > self.max_tokens_per_session:
            ai_security_logger.warning(
                f"[AI_RESOURCE_LIMIT] TOKEN_BUDGET_EXCEEDED | session={session_id} | "
                f"attempted={new_total} | max={self.max_tokens_per_session}"
            )
            return False, max(0, self.max_tokens_per_session - current), "Presupuesto de tokens de sesión superado."

        self._token_usage[session_id] = new_total
        remaining = self.max_tokens_per_session - new_total
        return True, remaining, "Dentro del presupuesto."

    def step_agent_iteration(self, session_id: str) -> Tuple[bool, int]:
        """
        Incrementa el contador de iteraciones agénticas (circuit breaker).
        Retorna (allowed, current_iteration).
        """
        count = self._iteration_counts.get(session_id, 0) + 1
        self._iteration_counts[session_id] = count

        if count > self.max_agent_iterations:
            ai_security_logger.error(
                f"[AI_CIRCUIT_BREAKER] AGENT_LOOP_EXCEEDED | session={session_id} | iterations={count}"
            )
            return False, count

        return True, count

    def reset_session(self, session_id: str):
        """Reinicia el estado de una sesión para pruebas o nuevos ciclos."""
        self._token_usage.pop(session_id, None)
        self._iteration_counts.pop(session_id, None)


# ─────────────────────────────────────────────────────────────
# 6. AIGovernanceRegistry (NIST CSF 2.0: Govern & Identify)
# ─────────────────────────────────────────────────────────────

class AIGovernanceRegistry:
    """
    Registro formal e inventario de sistemas de IA, asignación de responsabilidades
    (RACI) y estado de cumplimiento con el EU AI Act y NIST CSF 2.0.
    """

    AI_SYSTEMS = [
        {
            "id": "SYS-AI-01",
            "name": "Operations Agent",
            "risk_class": EUAIRiskClass.SPECIFIC_TRANSPARENCY.value,
            "provider": "Self-Hosted / Third-Party LLM",
            "least_privilege_scope": ["get_stock", "list_suppliers", "search_incidents"],
            "hitl_gated_tools": ["delete_supplier", "purge_inventory"],
            "owner": "AI Engineering Team",
            "nist_alignment": "Govern, Protect, Detect"
        },
        {
            "id": "SYS-AI-02",
            "name": "RFP Workflow Multi-Agent",
            "risk_class": EUAIRiskClass.SPECIFIC_TRANSPARENCY.value,
            "provider": "OpenAI / Anthropic (Zero-Data-Retention)",
            "least_privilege_scope": ["analyze_rfp", "draft_proposal", "calculate_margin"],
            "hitl_gated_tools": ["approve_contract", "transfer_funds"],
            "owner": "Procurement & AI Team",
            "nist_alignment": "Govern, Protect, Respond"
        },
        {
            "id": "SYS-AI-03",
            "name": "Warehouse Real-Time Assistant",
            "risk_class": EUAIRiskClass.MINIMAL_RISK.value,
            "provider": "WebSocket Streaming Model",
            "least_privilege_scope": ["read_guidelines", "faq_lookup"],
            "hitl_gated_tools": ["update_user_role"],
            "owner": "Logistics Operations",
            "nist_alignment": "Protect, Detect, Recover"
        }
    ]

    @classmethod
    def get_inventory(cls) -> Dict[str, Any]:
        """Retorna el inventario completo y el estado de gobernanza."""
        return {
            "framework": "NIST CSF 2.0 & EU AI Act",
            "total_systems": len(cls.AI_SYSTEMS),
            "governance_status": "ACTIVE_ENFORCEMENT",
            "systems": cls.AI_SYSTEMS,
            "kill_switch_available": True,
        }


# Instancias singleton globales reutilizables
prompt_injection_guard = PromptInjectionGuard()
sensitive_data_redactor = SensitiveDataRedactor()
hitl_gate = HumanInTheLoopGate()
model_output_validator = ModelOutputValidator()
token_budget_limiter = TokenBudgetRateLimiter()
