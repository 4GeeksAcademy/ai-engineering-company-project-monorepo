"""
harness.py — Arnés de Ejecución de Agentes (Harness Engineering)

Fórmula de Producción: Agente = Modelo + Harness

El Harness envuelve la ejecución del modelo y aplica 5 capas defensivas:
1. Orquestación y Lista Blanca de Herramientas (Tool Whitelist).
2. Límite estricto de iteraciones (Prevención de bucle infinito y sobrecoste).
3. Fallback defensivo ante fallos de herramientas.
4. Puerta Human-in-the-Loop (HITL) para acciones irreversibles.
5. Observabilidad y registro de incidentes de seguridad.
"""

from datetime import datetime, timezone
from enum import Enum
import json
import traceback
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field

from guardrails import (
    FailureType,
    GuardrailResult,
    GuardrailStatus,
    PrivacyGuardrail,
    SecurityInputGuardrail,
    StructuralOutputGuardrail,
)


class ToolRiskLevel(str, Enum):
    SAFE = "safe"                      # Consultas de lectura, inventario, catálogos
    IRREVERSIBLE = "irreversible"      # Eliminación, transferencias, cancelaciones, compras > $500


class ToolDefinition(BaseModel):
    """Definición tipada de una herramienta registrada en la lista blanca del arnés."""
    name: str = Field(..., description="Nombre de la herramienta")
    description: str = Field(..., description="Descripción del propósito")
    risk_level: ToolRiskLevel = Field(default=ToolRiskLevel.SAFE)


class SecurityEvent(BaseModel):
    """Evento de observabilidad registrado por el arnés."""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str
    details: str
    severity: str = "INFO"  # INFO, WARNING, CRITICAL


class HarnessExecutionResult(BaseModel):
    """Resultado final devuelto por el arnés de ejecución."""
    success: bool
    response: str
    iterations: int
    fallback_applied: bool = False
    hitl_pending: bool = False
    security_events: List[SecurityEvent] = Field(default_factory=list)


class AgentHarness:
    """
    Arnés de Producción para Agentes de IA.
    Impone seguridad programática alrededor del modelo.
    """

    def __init__(
        self,
        name: str = "TrackFlow-Secured-Harness",
        max_iterations: int = 3,
    ):
        self.name = name
        self.max_iterations = max_iterations

        # Inicialización de Guardrails
        self.input_guardrail = SecurityInputGuardrail()
        self.privacy_guardrail = PrivacyGuardrail()
        self.output_guardrail = StructuralOutputGuardrail()

        # Lista blanca de herramientas autorizadas (Tool Whitelist)
        self.tools: Dict[str, TupleTool] = {}

        # Registro de observabilidad / auditoría en memoria
        self.audit_log: List[SecurityEvent] = []

    def register_tool(
        self,
        name: str,
        description: str,
        handler: Callable[..., Any],
        risk_level: ToolRiskLevel = ToolRiskLevel.SAFE,
    ) -> None:
        """Registra una herramienta en la lista blanca del arnés."""
        self.tools[name] = TupleTool(
            meta=ToolDefinition(name=name, description=description, risk_level=risk_level),
            handler=handler,
        )

    # ─────────────────────────────────────────────────────────────
    # MOTOR DE EJECUCIÓN DEL ARNÉS (THE HARNESS LOOP)
    # ─────────────────────────────────────────────────────────────

    def execute(
        self,
        user_prompt: str,
        human_approved: bool = False,
        simulated_tool_call: Optional[Dict[str, Any]] = None,
    ) -> HarnessExecutionResult:
        """
        Ejecuta el ciclo de vida seguro del agente:
        Capa 1: Input Guardrail (Anti-inyección).
        Capa 2: Privacy Sanitizer (Ofuscación de PII entrante).
        Capa 3: Control de iteraciones del bucle (Anti-loop infinito).
        Capa 4: Tool Whitelist + Fallback defensivo + Puerta HITL.
        Capa 5: Output Guardrail y Sanitizador de salida.
        """
        events: List[SecurityEvent] = []

        # ── CAPA 1: INSPECCIÓN DE ENTRADA (SECURITY GUARDRAIL) ────
        input_eval = self.input_guardrail.evaluate(user_prompt)
        if input_eval.status == GuardrailStatus.BLOCKED:
            sec_event = SecurityEvent(
                event_type="PROMPT_INJECTION_BLOCKED",
                details=input_eval.warning or "Ataque interceptado",
                severity="CRITICAL",
            )
            self.audit_log.append(sec_event)
            events.append(sec_event)

            return HarnessExecutionResult(
                success=False,
                response="🛡️ [Harness Security]: Tu mensaje ha sido bloqueado por violar las directivas de seguridad de TrackFlow.",
                iterations=0,
                security_events=events,
            )

        # ── CAPA 2: SANITIZACIÓN DE PRIVACIDAD (PII ENTRADA) ──────
        pii_eval = self.privacy_guardrail.sanitize(user_prompt)
        clean_prompt = pii_eval.clean_text
        if pii_eval.status == GuardrailStatus.SANITIZED:
            sec_event = SecurityEvent(
                event_type="PII_SANITIZED_INPUT",
                details=pii_eval.warning or "PII enmascarado",
                severity="WARNING",
            )
            self.audit_log.append(sec_event)
            events.append(sec_event)

        # ── CAPAS 3 Y 4: BUCLE DE ORQUESTACIÓN CON LÍMITE Y TOOLS ─
        iterations = 0
        fallback_applied = False
        hitl_pending = False
        final_answer = ""

        while iterations < self.max_iterations:
            iterations += 1

            # Si el agente solicita ejecutar una herramienta
            if simulated_tool_call:
                tool_name = simulated_tool_call.get("name")
                tool_args = simulated_tool_call.get("arguments", {})

                # 4.1 Verificación de Lista Blanca (Tool Whitelist)
                if tool_name not in self.tools:
                    sec_event = SecurityEvent(
                        event_type="UNAUTHORIZED_TOOL_CALL",
                        details=f"Intento de invocar herramienta no autorizada: '{tool_name}'",
                        severity="CRITICAL",
                    )
                    self.audit_log.append(sec_event)
                    events.append(sec_event)

                    final_answer = f"Error de seguridad: La herramienta '{tool_name}' no está en la lista blanca autorizada."
                    break

                tool_entry = self.tools[tool_name]

                # 4.2 Puerta Human-in-the-Loop (Acciones Irreversibles)
                if tool_entry.meta.risk_level == ToolRiskLevel.IRREVERSIBLE and not human_approved:
                    hitl_pending = True
                    sec_event = SecurityEvent(
                        event_type="HITL_GATE_TRIGGERED",
                        details=f"Acción irreversible '{tool_name}' requiere aprobación humana.",
                        severity="WARNING",
                    )
                    self.audit_log.append(sec_event)
                    events.append(sec_event)

                    final_answer = (
                        f"🛑 [Human-in-the-Loop]: La acción '{tool_name}' es irreversible "
                        f"(argumentos: {json.dumps(tool_args)}). "
                        "Se requiere confirmación humana explícita (human_approved=True) antes de proceder."
                    )
                    break

                # 4.3 Ejecución con Fallback defensivo
                try:
                    tool_output = tool_entry.handler(**tool_args)
                    final_answer = f"Acción '{tool_name}' completada con éxito. Resultado: {tool_output}"
                except Exception as err:
                    # En vez de crashear el sistema o filtrar stack traces, activamos Fallback
                    fallback_applied = True
                    sec_event = SecurityEvent(
                        event_type="TOOL_FALLBACK_TRIGGERED",
                        details=f"Fallo en herramienta '{tool_name}': {str(err)}",
                        severity="WARNING",
                    )
                    self.audit_log.append(sec_event)
                    events.append(sec_event)

                    final_answer = (
                        f"⚠️ [Fallback Activado]: No se pudo completar la operación en '{tool_name}' en este momento. "
                        "El sistema ha registrado el incidente y continúa operando de forma segura."
                    )
                break
            else:
                # Flujo normal sin herramientas (respuesta directa)
                final_answer = f"TrackFlow OpsBot procesó tu solicitud de forma segura: '{clean_prompt}'."
                break

        # Si se superó el límite de iteraciones (prevención de bucle infinito)
        if iterations >= self.max_iterations and not final_answer:
            fallback_applied = True
            sec_event = SecurityEvent(
                event_type="MAX_ITERATIONS_EXCEEDED",
                details=f"Se alcanzó el límite de seguridad de {self.max_iterations} iteraciones.",
                severity="WARNING",
            )
            self.audit_log.append(sec_event)
            events.append(sec_event)

            final_answer = "⚠️ [Límite de Bucle Alcanzado]: El agente se detuvo para prevenir un bucle infinito de ejecución."

        # ── CAPA 5: INSPECCIÓN DE SALIDA (OUTPUT Y PII SALIDA) ─────
        output_pii = self.privacy_guardrail.sanitize(final_answer)
        if output_pii.status == GuardrailStatus.SANITIZED:
            sec_event = SecurityEvent(
                event_type="PII_SANITIZED_OUTPUT",
                details=output_pii.warning or "PII enmascarado en salida",
                severity="WARNING",
            )
            self.audit_log.append(sec_event)
            events.append(sec_event)

        clean_output = output_pii.clean_text
        struct_eval = self.output_guardrail.validate(clean_output)

        return HarnessExecutionResult(
            success=not hitl_pending,
            response=struct_eval.clean_text,
            iterations=iterations,
            fallback_applied=fallback_applied,
            hitl_pending=hitl_pending,
            security_events=events,
        )


class TupleTool:
    """Contenedor de metadatos y función ejecutable de herramienta."""
    def __init__(self, meta: ToolDefinition, handler: Callable[..., Any]):
        self.meta = meta
        self.handler = handler
