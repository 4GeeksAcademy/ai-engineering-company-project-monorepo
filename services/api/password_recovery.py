import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from fastapi import HTTPException
from jose import JWTError, jwt

from security import ALGORITHM, auth_settings
from user_service import get_user_by_email, get_user_by_id, update_user


logger = logging.getLogger(__name__)
RESET_MINUTES = 30
CONFIRMATION = "Si esa dirección está registrada, recibirás un enlace en breve."


def send_reset_email(email: str, link: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("RESEND_FROM_EMAIL", "")
    if not api_key or not sender:
        raise RuntimeError("Configura RESEND_API_KEY y RESEND_FROM_EMAIL.")
    safe_link = escape(link, quote=True)
    payload = {
        "from": sender,
        "to": [email],
        "subject": "TrackFlow - Restablece tu contrasena",
        "text": f"Restablece tu contrasena: {link}\nEl enlace caduca en {RESET_MINUTES} minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.",
        "html": f'<html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;line-height:1.6;padding:20px;max-width:560px;margin:auto"><h1 style="font-size:24px">TrackFlow</h1><p>Has solicitado restablecer tu contrasena.</p><p><a href="{safe_link}" style="display:inline-block;padding:12px 18px;background:#166534;color:white;border-radius:4px">Restablecer contrasena</a></p><p>El enlace caduca en {RESET_MINUTES} minutos y solo puede usarse una vez.</p><p>Si no lo solicitaste, ignora este correo.</p></body></html>',
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "User-Agent": "TrackFlow/1.0"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        response.read()


def request_password_reset(application, email: str) -> None:
    try:
        base_url = os.environ.get("PASSWORD_RESET_URL", "http://localhost:5174/reset-password")
        parsed = urlsplit(base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.query or parsed.fragment:
            raise RuntimeError("PASSWORD_RESET_URL debe ser una URL absoluta sin query ni fragmento.")
        secret_key, _ = auth_settings()
        with application.state.lock:
            user = get_user_by_email(application.state.db, email)
            if user is None or not user.is_active:
                return
            token = jwt.encode(
                {"sub": str(user.id), "purpose": "password_reset", "jti": secrets.token_urlsafe(32),
                 "exp": datetime.now(timezone.utc) + timedelta(minutes=RESET_MINUTES)},
                secret_key, algorithm=ALGORITHM,
            )
            application.state.db.table("users").update(
                {"password_reset_hash": hashlib.sha256(token.encode()).hexdigest()}, doc_ids=[user.id],
            )
        send_reset_email(str(user.email), f"{base_url}?{urlencode({'token': token})}")
    except Exception:
        logger.error("No se pudo procesar el correo de recuperacion; revisa la configuracion y el servicio de correo.")


def reset_password(application, token: str, new_password: str) -> None:
    invalid = HTTPException(status_code=400, detail="El enlace no es valido, ha caducado o ya se ha utilizado. Solicita otro enlace.")
    try:
        secret_key, _ = auth_settings()
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM], options={"require_exp": True, "require_sub": True})
        if payload.get("purpose") != "password_reset":
            raise invalid
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError, TypeError):
        raise invalid
    with application.state.lock:
        user = get_user_by_id(application.state.db, user_id)
        document = application.state.db.table("users").get(doc_id=user_id)
        stored_hash = document.get("password_reset_hash") if document else None
        if user is None or not user.is_active or not stored_hash or not hmac.compare_digest(stored_hash, hashlib.sha256(token.encode()).hexdigest()):
            raise invalid
        update_user(application.state.db, application.state.lock, user_id, {"password": new_password})