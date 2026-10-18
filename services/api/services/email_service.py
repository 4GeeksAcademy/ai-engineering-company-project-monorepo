# services/api/services/email_service.py
#
# Servicio de envío de correos transaccionales.
#
# Propósito: Enviar emails de restablecimiento de contraseña
# usando el servicio Resend (https://resend.com).
#
# Variables de entorno requeridas:
#   RESEND_API_KEY — API key del dashboard de Resend
#   FRONTEND_URL  — URL base del frontend (para construir el enlace de reset)
#
# Si se elige SendGrid en lugar de Resend, el agente cambia
# la implementación de send_reset_email() para usar el SDK de SendGrid.

import os
import logging

logger = logging.getLogger(__name__)

# ── Configuración desde variables de entorno ────────────────
EMAIL_SERVICE = os.getenv("EMAIL_SERVICE", "resend").lower()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Envía un correo de restablecimiento de contraseña.

    Construye el enlace de restablecimiento con el token firmado
    y lo envía al email del usuario mediante el servicio configurado.

    Args:
        to_email: Dirección de email del destinatario
        reset_token: Token JWT de restablecimiento (firmado)

    Returns:
        True si el email se envió correctamente, False en caso contrario

    Nota de seguridad:
        Este método se llama DESPUÉS de verificar que el usuario existe.
        El endpoint /auth/forgot-password SIEMPRE devuelve 200,
        independientemente de si se llamó a esta función.
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    # Cuerpo del email en texto plano (legible en móvil)
    text_body = f"""
Has solicitado restablecer tu contraseña en TrackFlow.

Haz clic en el siguiente enlace para establecer una nueva contraseña:

{reset_link}

Este enlace expirará en {os.getenv('RESET_TOKEN_EXPIRE_MINUTES', '30')} minutos.

Si no solicitaste este restablecimiento, ignora este mensaje.

--
TrackFlow — Equipo de soporte
"""

    if EMAIL_SERVICE == "sendgrid":
        return _send_via_sendgrid(to_email, text_body)
    else:
        return _send_via_resend(to_email, text_body)


def _send_via_resend(to_email: str, text_body: str) -> bool:
    """Envía el email usando la API de Resend."""
    try:
        import resend
        resend.api_key = RESEND_API_KEY

        params = {
            "from": "TrackFlow <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Restablece tu contraseña — TrackFlow",
            "text": text_body,
        }

        response = resend.Emails.send(params)
        logger.info(f"Email enviado a {to_email}, id={response.get('id', 'unknown')}")
        return True
    except ImportError:
        logger.error("SDK de Resend no instalado: pip install resend")
        return False
    except Exception as e:
        logger.error(f"Error enviando email a {to_email}: {e}")
        return False


def _send_via_sendgrid(to_email: str, text_body: str) -> bool:
    """Envía el email usando la API de SendGrid."""
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email="noreply@trackflow.com",
            to_emails=to_email,
            subject="Restablece tu contraseña — TrackFlow",
            plain_text_content=text_body,
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email enviado a {to_email}, status={response.status_code}")
        return True
    except ImportError:
        logger.error("SDK de SendGrid no instalado: pip install sendgrid")
        return False
    except Exception as e:
        logger.error(f"Error enviando email a {to_email}: {e}")
        return False