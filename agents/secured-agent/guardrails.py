"""
guardrails.py — Capas de Defensa y Guardarraíles de Seguridad

Implementa los tres tipos de guardarraíles exigidos en Harness Engineering:
1. Security Guardrail: Detección y bloqueo de Prompt Injection y Jailbreaks.
2. Privacy Guardrail: Detección y ofuscación de PII (emails, teléfonos, tarjetas, credenciales).
3. Structural Guardrail: Validación de tipos, longitud y estructura de salida.
"""

from enum import Enum
import re
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class GuardrailStatus(str, Enum):
    PASSED = "passed"
    BLOCKED = "blocked"
    SANITIZED = "sanitized"


class FailureType(str, Enum):
    NONE = "none"
    SECURITY_INJECTION = "security_injection"
    PRIVACY_PII_LEAK = "privacy_pii_leak"
    STRUCTURAL_ERROR = "structural_error"


class GuardrailResult(BaseModel):
    """Resultado estructurado de la evaluación de un guardarraíl."""
    status: GuardrailStatus
    failure_type: FailureType
    clean_text: str
    warning: Optional[str] = None
    applied_rules: List[str] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────
# 1. SECURITY GUARDRAIL (Anti-Prompt Injection & Jailbreaks)
# ─────────────────────────────────────────────────────────────

INJECTION_PATTERNS = [
    r"ignore (?:all )?(?:previous|above|prior) (?:instructions|rules|prompts)",
    r"ignora (?:todas )?las instrucciones (?:previas|anteriores)",
    r"system override",
    r"anula el sistema",
    r"act as (?:root|admin|dan|jailbreak)",
    r"actúa como (?:root|administrador|hacker)",
    r"reveal (?:your )?(?:system prompt|instructions|secret key)",
    r"revela (?:tu )?(?:prompt de sistema|instrucciones|clave secreta)",
    r"bypass (?:security|guardrails|safety)",
    r"salta (?:los )?(?:guardarrailes|seguridad)",
    r"forget (?:all )?(?:rules|constraints)",
    r"olvida (?:todas )?las reglas",
]

class SecurityInputGuardrail:
    """Inspecciona la entrada antes de ser procesada para bloquear ataques de inyección."""

    def __init__(self, patterns: Optional[List[str]] = None):
        self.compiled_patterns = [
            re.compile(p, re.IGNORECASE) for p in (patterns or INJECTION_PATTERNS)
        ]

    def evaluate(self, user_input: str) -> GuardrailResult:
        for pattern in self.compiled_patterns:
            match = pattern.search(user_input)
            if match:
                detected = match.group(0)
                return GuardrailResult(
                    status=GuardrailStatus.BLOCKED,
                    failure_type=FailureType.SECURITY_INJECTION,
                    clean_text="",
                    warning=f"Ataque de inyección interceptado: patrón no permitido detectado ('{detected}').",
                    applied_rules=["anti_prompt_injection"],
                )

        return GuardrailResult(
            status=GuardrailStatus.PASSED,
            failure_type=FailureType.NONE,
            clean_text=user_input,
            applied_rules=["anti_prompt_injection"],
        )


# ─────────────────────────────────────────────────────────────
# 2. PRIVACY GUARDRAIL (Sanitizador de PII y Datos Sensibles)
# ─────────────────────────────────────────────────────────────

PII_PATTERNS: List[Tuple[str, str, str]] = [
    # Tarjetas de crédito (16 dígitos continuos o separados por guiones/espacios)
    (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[TARJETA_PROTEGIDA]", "credit_card"),
    # Claves secretas / API keys
    (r"\b(?:sk|pk|key|token)[-_a-zA-Z0-9]{16,}\b", "[CREDENCIAL_PROTEGIDA]", "secret_key"),
    # Correos electrónicos
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL_PROTEGIDO]", "email"),
    # Teléfonos internacionales o locales (+34 600 112 233 o 600-000-000)
    (r"(?:\+\d{1,3}[\s-]*)?(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}|\d{2,4}[\s.-]?\d{3}[\s.-]?\d{3,4})\b", "[TELEFONO_PROTEGIDO]", "phone"),
]

class PrivacyGuardrail:
    """Detecta y ofusca datos personales y credenciales tanto en entrada como en salida."""

    def __init__(self, pii_rules: Optional[List[Tuple[str, str, str]]] = None):
        self.rules = [
            (re.compile(pattern, re.IGNORECASE), mask, name)
            for pattern, mask, name in (pii_rules or PII_PATTERNS)
        ]

    def sanitize(self, text: str) -> GuardrailResult:
        sanitized = text
        applied: List[str] = []
        found_pii = False

        for regex, mask, rule_name in self.rules:
            if regex.search(sanitized):
                sanitized = regex.sub(mask, sanitized)
                applied.append(rule_name)
                found_pii = True

        if found_pii:
            return GuardrailResult(
                status=GuardrailStatus.SANITIZED,
                failure_type=FailureType.PRIVACY_PII_LEAK,
                clean_text=sanitized,
                warning=f"Datos confidenciales detectados y enmascarados: {', '.join(applied)}.",
                applied_rules=applied,
            )

        return GuardrailResult(
            status=GuardrailStatus.PASSED,
            failure_type=FailureType.NONE,
            clean_text=text,
            applied_rules=[],
        )


# ─────────────────────────────────────────────────────────────
# 3. STRUCTURAL & OUTPUT GUARDRAIL (Validación Estructural)
# ─────────────────────────────────────────────────────────────

class StructuralOutputGuardrail:
    """Garantiza que la respuesta del agente no esté vacía, no sea excesivamente larga y cumpla estructura."""

    def __init__(self, max_chars: int = 2000):
        self.max_chars = max_chars

    def validate(self, output_text: str) -> GuardrailResult:
        if not output_text or not output_text.strip():
            return GuardrailResult(
                status=GuardrailStatus.BLOCKED,
                failure_type=FailureType.STRUCTURAL_ERROR,
                clean_text="Error operativo: La respuesta del modelo está vacía.",
                warning="Respuesta vacía o nula interceptada por el arnés.",
                applied_rules=["non_empty_validation"],
            )

        if len(output_text) > self.max_chars:
            truncated = output_text[: self.max_chars] + "... [Respuesta truncada por límite de longitud del arnés]"
            return GuardrailResult(
                status=GuardrailStatus.SANITIZED,
                failure_type=FailureType.STRUCTURAL_ERROR,
                clean_text=truncated,
                warning=f"Respuesta excedió límite de longitud ({len(output_text)} > {self.max_chars}).",
                applied_rules=["max_length_bound"],
            )

        return GuardrailResult(
            status=GuardrailStatus.PASSED,
            failure_type=FailureType.NONE,
            clean_text=output_text,
            applied_rules=["structural_ok"],
        )
