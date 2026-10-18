"""
core/security.py — Módulo Central de Hardening y Seguridad OWASP
Módulo: Secure AI Applications

Implementa:
1. Sanitización estricta contra Cross-Site Scripting (XSS / A03).
2. Prevención de inyección de fórmulas CSV (CWE-1236 / A03).
3. Limitador de peticiones en memoria con ventana deslizante (Anti-Brute Force / A04).
4. Middleware ASGI para inyección de cabeceras HTTP de seguridad (A05).
5. Registro estructurado de auditoría de seguridad (A09).
"""

import re
import html
import time
import logging
from collections import defaultdict
from typing import Dict, List, Any, Optional
from fastapi import Request, HTTPException, status
from starlette.types import ASGIApp, Scope, Receive, Send

# Logger estructurado para eventos de seguridad
security_logger = logging.getLogger("security.audit")


# ─────────────────────────────────────────────────────────────
# 1. Sanitización de Entradas contra XSS e Inyecciones (A03)
# ─────────────────────────────────────────────────────────────

def sanitize_html(text: Optional[str]) -> str:
    """
    Sanitiza una cadena de texto para neutralizar ataques XSS e inyecciones HTML.
    Escapa caracteres peligrosos (<, >, &, ", ') y normaliza espacios.
    """
    if text is None:
        return ""
    # Escapar entidades HTML especiales
    escaped = html.escape(text.strip())
    # Eliminar posibles secuencias javascript: o data: en atributos
    escaped = re.sub(r"(?i)javascript\s*:", "", escaped)
    escaped = re.sub(r"(?i)data\s*:\s*text\/html", "", escaped)
    return escaped


def sanitize_csv_cell(value: Any) -> str:
    """
    Neutraliza la inyección de fórmulas CSV (Formula / CSV Injection, CWE-1236).
    Si el valor comienza con '=', '+', '-', '@', '\t' o '\r', antepone una
    comilla simple (') para forzar que sea interpretado como texto plano en hojas de cálculo.
    """
    if value is None:
        return ""
    val_str = str(value)
    if val_str.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{val_str}"
    return val_str


# ─────────────────────────────────────────────────────────────
# 2. Limitador de Tasa en Memoria contra Fuerza Bruta (A04)
# ─────────────────────────────────────────────────────────────

class InMemoryRateLimiter:
    """
    Limitador de tasa basado en ventana deslizante (Sliding Window Counter).
    Almacena marcas de tiempo de solicitudes por clave (ej: IP + endpoint).
    """

    def __init__(self):
        # Mapeo: key -> lista de timestamps
        self._records: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, int]:
        """
        Verifica si la clave ha excedido el límite en la ventana actual.
        Retorna (is_limited, retry_after_seconds).
        """
        now = time.time()
        window_start = now - window_seconds

        # Limpiar registros antiguos fuera de la ventana
        timestamps = self._records[key]
        self._records[key] = [t for t in timestamps if t > window_start]

        if len(self._records[key]) >= max_requests:
            oldest = self._records[key][0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return True, retry_after

        # Registrar solicitud actual
        self._records[key].append(now)
        return False, 0

    def reset(self, key: Optional[str] = None):
        """Reinicia el historial para pruebas o desbloqueos."""
        if key:
            self._records.pop(key, None)
        else:
            self._records.clear()


rate_limiter = InMemoryRateLimiter()


def check_rate_limit(
    request: Request,
    key_prefix: str,
    max_requests: int = 5,
    window_seconds: int = 60
):
    """
    Helper para validar límite de tasa en endpoints sensibles.
    Lanza HTTP 429 Too Many Requests si se sobrepasa la cuota.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"{key_prefix}:{client_ip}"

    is_limited, retry_after = rate_limiter.is_rate_limited(
        key=rate_key,
        max_requests=max_requests,
        window_seconds=window_seconds
    )

    if is_limited:
        log_security_event(
            event_type="RATE_LIMIT_EXCEEDED",
            client_ip=client_ip,
            details=f"Cuota excedida para {key_prefix} ({max_requests} req / {window_seconds}s)",
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Por favor, reintente en {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)}
        )


# ─────────────────────────────────────────────────────────────
# 3. Middleware de Cabeceras de Seguridad HTTP (A05)
# ─────────────────────────────────────────────────────────────

class SecurityHeadersMiddleware:
    """
    Middleware ASGI que inyecta cabeceras HTTP de seguridad recomendadas por OWASP
    en todas las respuestas de la aplicación.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message: Dict[str, Any]):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))

                security_headers = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
                    (b"content-security-policy", b"default-src 'self'; frame-ancestors 'none';"),
                    (b"strict-transport-security", b"max-age=31536000; includeSubDomains")
                ]

                # Reemplazar o añadir cabeceras seguras
                existing_names = {h[0].lower() for h in headers}
                for sec_name, sec_val in security_headers:
                    if sec_name not in existing_names:
                        headers.append((sec_name, sec_val))

                message["headers"] = headers

            await send(message)

        await self.app(scope, receive, send_with_security_headers)


# ─────────────────────────────────────────────────────────────
# 4. Auditoría y Trazabilidad de Eventos de Seguridad (A09)
# ─────────────────────────────────────────────────────────────

def log_security_event(
    event_type: str,
    client_ip: str,
    details: str,
    user_identifier: Optional[str] = None,
    success: bool = True
):
    """
    Registra de forma estructurada un evento relevante para auditoría de seguridad.
    """
    status_str = "SUCCESS" if success else "ALERT/FAILURE"
    user_str = user_identifier or "anonymous"
    security_logger.warning(
        f"[SECURITY_AUDIT] [{status_str}] event={event_type} | user={user_str} | ip={client_ip} | {details}"
    )
