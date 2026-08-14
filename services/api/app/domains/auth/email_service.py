"""
email_service.py - Brasaland - Email sending via Resend API
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded before reading env vars

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "noreply@example.com")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

RESET_EMAIL_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablece tu contrasena</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h1 style="color:#333;font-size:20px;margin-bottom:8px;">Brasaland</h1>
    <p style="color:#555;font-size:14px;line-height:1.6;">Recibimos una solicitud para restablecer tu contrasena.</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Haz clic en el boton de abajo para crear una nueva contrasena. Este enlace expira en 30 minutos.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{reset_link}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#2dd6a4,#4a8cff);color:#03121f;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none;">Restablecer contrasena</a>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#999;font-size:12px;">Este enlace expirara en 30 minutos por motivos de seguridad.</p>
  </div>
</body>
</html>"""

RESET_EMAIL_TEXT = """Restablece tu contrasena - Brasaland

Recibimos una solicitud para restablecer tu contrasena.
Copia y pega este enlace en tu navegador: {reset_link}

Este enlace expira en 30 minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura."""


@dataclass(frozen=True)
class EmailDeliveryResult:
    sent: bool
    reset_link: str
    provider_status: int | None = None
    error: str | None = None


def build_reset_link(token: str) -> str:
    """Build the password reset link sent to the user."""
    return f"{FRONTEND_URL}/reset-password?token={token}"


async def send_reset_email(to_email: str, token: str) -> EmailDeliveryResult:
    """Send password reset email via Resend API."""
    reset_link = build_reset_link(token)

    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - email not sent to %s", to_email)
        return EmailDeliveryResult(
            sent=False,
            reset_link=reset_link,
            error="RESEND_API_KEY not configured",
        )

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Restablece tu contrasena - Brasaland",
        "html": RESET_EMAIL_HTML.format(reset_link=reset_link),
        "text": RESET_EMAIL_TEXT.format(reset_link=reset_link),
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                timeout=10.0,
            )
            if 200 <= response.status_code < 300:
                return EmailDeliveryResult(
                    sent=True,
                    reset_link=reset_link,
                    provider_status=response.status_code,
                )

            error_text = response.text.strip() or "Resend rejected the email"
            logger.warning(
                "Resend API returned status %s for %s: %s",
                response.status_code,
                to_email,
                error_text,
            )
            return EmailDeliveryResult(
                sent=False,
                reset_link=reset_link,
                provider_status=response.status_code,
                error=error_text,
            )
    except Exception as exc:
        logger.warning("Failed to send reset email to %s: %s", to_email, type(exc).__name__)
        return EmailDeliveryResult(
            sent=False,
            reset_link=reset_link,
            error=str(exc),
        )
