
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)


def send_password_reset_email(email: str, token: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM")
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    )

    if not api_key or not email_from:
        raise RuntimeError(
            "Falta configurar RESEND_API_KEY o EMAIL_FROM en .env"
        )

    reset_url = f"{frontend_url}/reset-password?token={token}"

    payload = {
        "from": email_from,
        "to": [email],
        "subject": "Restablece tu contraseña",
        "html": (
            "<p>Hemos recibido una solicitud para restablecer "
            "tu contraseña.</p>"
            f'<p><a href="{reset_url}">Restablecer contraseña</a></p>'
            "<p>Este enlace caduca en 30 minutos. "
            "Si no solicitaste el cambio, ignora este correo.</p>"
        ),
    }

    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ai-engineering-company/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status not in (200, 201, 202):
                raise RuntimeError(
                    f"Resend devolvió HTTP {response.status}"
                )

    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Error de Resend: HTTP {exc.code}: {detail}")
        raise RuntimeError(
            "No se pudo enviar el correo de recuperación"
        ) from exc

    except (URLError, TimeoutError) as exc:
        print(f"Error de conexión con Resend: {exc}")
        raise RuntimeError(
            "No se pudo enviar el correo de recuperación"
        ) from exc
