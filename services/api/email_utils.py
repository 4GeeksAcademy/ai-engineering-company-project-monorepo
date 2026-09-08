import os
import resend

# La clave de API debería estar configurada en variables de entorno.
# STRATEGY.md requiere cargar desde variables de entorno.
# En un entorno real, python-dotenv podría usarse, o simplemente leer de os.environ
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
resend.api_key = RESEND_API_KEY

def send_reset_email(to_email: str, reset_token: str):
    """
    Envía un correo electrónico de restablecimiento de contraseña usando Resend.
    """
    if not RESEND_API_KEY:
        print(f"⚠️  ADVERTENCIA: RESEND_API_KEY no configurado. El email no se envió realmente a {to_email}.")
        print(f"Token de restablecimiento simulado: {reset_token}")
        return False

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    try:
        r = resend.Emails.send({
            "from": "Acme <onboarding@resend.dev>",
            "to": to_email,
            "subject": "Restablecimiento de Contraseña",
            "html": f"<p>Has solicitado restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para crear una nueva:</p><p><a href='{reset_link}'>Restablecer Contraseña</a></p><p>Si no fuiste tú, ignora este correo.</p>"
        })
        print(f"Email de restablecimiento enviado a {to_email}")
        return True
    except Exception:
        import sys
        print("Error al enviar email: La API de Resend rechazó la petición o hubo un problema de red.", file=sys.stderr)
        return False
