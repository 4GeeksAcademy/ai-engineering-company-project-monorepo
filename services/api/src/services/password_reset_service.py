"""Password reset helpers for token generation and email delivery."""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse, urlunparse

from jose import ExpiredSignatureError, JWTError, jwt
from python_http_client.exceptions import HTTPError
from python_http_client.exceptions import ForbiddenError

from src.database import get_users_table
from src.models.user import TinyDBId, User
from src.services.user_service import get_user_by_id, update_user_password

logger = logging.getLogger(__name__)


class PasswordResetTokenError(ValueError):
    """Raised when a password reset token is invalid or expired."""


def _normalize_user_id(user_id: TinyDBId) -> int | None:
    if isinstance(user_id, int) and user_id > 0:
        return user_id
    if isinstance(user_id, str) and user_id.isdigit():
        normalized = int(user_id)
        if normalized > 0:
            return normalized
    return None


def _get_reset_expire_minutes() -> int:
    raw_value = os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30")
    try:
        value = int(raw_value)
    except ValueError:
        logger.warning("Invalid PASSWORD_RESET_EXPIRE_MINUTES value %r; using 30.", raw_value)
        return 30

    if value < 15 or value > 60:
        logger.warning("PASSWORD_RESET_EXPIRE_MINUTES out of range (%s); using 30.", value)
        return 30
    return value


def _get_reset_base_url() -> str:
    configured_url = (os.getenv("PASSWORD_RESET_URL") or "").strip()
    if configured_url:
        parsed_url = urlparse(configured_url)
        # Guard against legacy configs like https://host/ that would route to a protected page.
        if parsed_url.path in ("", "/"):
            return urlunparse(parsed_url._replace(path="/reset-password"))
        return configured_url

    # In GitHub Codespaces, default to forwarded port 3000 instead of localhost.
    codespace_name = os.getenv("CODESPACE_NAME")
    forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
    if codespace_name and forwarding_domain:
        return f"https://{codespace_name}-3000.{forwarding_domain}/reset-password"

    return "http://localhost:3000/reset-password"


def _get_secret_key() -> str:
    secret_key = os.getenv("SECRET_KEY")
    if secret_key:
        return secret_key
    return "trackflow-dev-secret-key"


def _get_algorithm() -> str:
    return os.getenv("ALGORITHM", "HS256")


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _clear_reset_token(user_id: TinyDBId) -> None:
    normalized_id = _normalize_user_id(user_id)
    if normalized_id is None:
        return

    users_table = get_users_table()
    users_table.update(
        {
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
            "password_reset_requested_at": None,
        },
        doc_ids=[normalized_id],
    )


def _parse_iso_datetime(raw_value: str | None) -> datetime | None:
    if not raw_value:
        return None

    try:
        parsed = datetime.fromisoformat(raw_value)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _validate_reset_token(raw_token: str) -> User:
    if not raw_token:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    try:
        payload = jwt.decode(raw_token, _get_secret_key(), algorithms=[_get_algorithm()])
    except (ExpiredSignatureError, JWTError) as exc:
        raise PasswordResetTokenError("Invalid or expired reset token.") from exc

    token_type = payload.get("type")
    subject = payload.get("sub")
    if token_type != "password_reset" or subject is None:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    user = get_user_by_id(subject)
    if user is None:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    normalized_id = _normalize_user_id(user.id)
    if normalized_id is None:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    users_table = get_users_table()
    document = users_table.get(doc_id=normalized_id)
    if document is None:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    stored_hash = str(document.get("password_reset_token_hash") or "")
    if not stored_hash or not secrets.compare_digest(stored_hash, _hash_token(raw_token)):
        raise PasswordResetTokenError("Invalid or expired reset token.")

    expires_at = _parse_iso_datetime(document.get("password_reset_expires_at"))
    if expires_at is None or expires_at < datetime.now(timezone.utc):
        raise PasswordResetTokenError("Invalid or expired reset token.")

    return user


def _store_reset_token(user_id: TinyDBId, token_hash: str, expires_at: datetime) -> bool:
    normalized_id = _normalize_user_id(user_id)
    if normalized_id is None:
        return False

    users_table = get_users_table()
    users_table.update(
        {
            "password_reset_token_hash": token_hash,
            "password_reset_expires_at": expires_at.isoformat(),
            "password_reset_requested_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[normalized_id],
    )
    return True


def _build_reset_link(raw_token: str) -> str:
    query = urlencode({"token": raw_token})
    return f"{_get_reset_base_url()}?{query}"


def _build_reset_email_html(reset_link: str, expire_minutes: int) -> str:
    return f"""
<!doctype html>
<html lang="es">
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                        <tr>
                            <td style="background:#0369a1;padding:18px 24px;">
                                <p style="margin:0;font-size:12px;letter-spacing:1px;font-weight:700;color:#bae6fd;">TRACKFLOW BACKOFFICE</p>
                                <h1 style="margin:6px 0 0 0;font-size:22px;line-height:30px;color:#ffffff;">Restablecimiento de contrasena</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:24px;">
                                <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;color:#334155;">
                                    Recibimos una solicitud para cambiar la contrasena de tu cuenta en TrackFlow.
                                </p>
                                <p style="margin:0 0 20px 0;font-size:15px;line-height:24px;color:#334155;">
                                    Por seguridad, este enlace vence en <strong>{expire_minutes} minutos</strong> y solo puede usarse una vez.
                                </p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
                                    <tr>
                                        <td style="border-radius:8px;background:#0369a1;">
                                            <a href="{reset_link}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                                                Restablecer contrasena
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin:0 0 8px 0;font-size:13px;color:#475569;">Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
                                <p style="margin:0;font-size:13px;line-height:20px;word-break:break-word;color:#0c4a6e;">
                                    <a href="{reset_link}" style="color:#0c4a6e;">{reset_link}</a>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                                <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">
                                    Si no solicitaste este cambio, puedes ignorar este correo.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
""".strip()


def _build_reset_email_text(reset_link: str, expire_minutes: int) -> str:
    return (
        "TrackFlow Backoffice - Restablecimiento de contrasena\n\n"
        "Recibimos una solicitud para cambiar la contrasena de tu cuenta.\n"
        f"Este enlace vence en {expire_minutes} minutos y solo puede usarse una vez.\n\n"
        f"Restablecer contrasena: {reset_link}\n\n"
        "Si no solicitaste este cambio, ignora este correo."
    )


def _send_reset_email(email: str, reset_link: str, expire_minutes: int) -> None:
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
    except ModuleNotFoundError as exc:
        raise RuntimeError("Missing sendgrid dependency. Install with: uv add sendgrid") from exc

    api_key = os.getenv("SENDGRID_KEY")
    from_email = os.getenv("SENDGRID_FROM_EMAIL")

    if not api_key:
        raise RuntimeError("Missing SENDGRID_KEY environment variable.")
    if not from_email:
        raise RuntimeError(
            "Missing SENDGRID_FROM_EMAIL environment variable. Use a verified sender in SendGrid."
        )

    message = Mail(
        from_email=from_email,
        to_emails=email,
        subject="TrackFlow | Restablece tu contrasena",
        html_content=_build_reset_email_html(reset_link, expire_minutes),
        plain_text_content=_build_reset_email_text(reset_link, expire_minutes),
    )

    client = SendGridAPIClient(api_key=api_key)
    try:
        response = client.send(message)
    except ForbiddenError as exc:
        raise RuntimeError(
            "SendGrid rejected the request (403). Verify the API key has 'Mail Send' permission and SENDGRID_FROM_EMAIL is a verified sender/domain."
        ) from exc
    except (HTTPError, OSError, TimeoutError) as exc:
        raise RuntimeError("Failed to communicate with the email provider.") from exc

    if response.status_code >= 400:
        raise RuntimeError("The email provider returned an unexpected error.")


def issue_password_reset(user: User) -> None:
    """Create and store a reset token for an existing user and send reset email."""

    expire_minutes = _get_reset_expire_minutes()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(user.id),
        "type": "password_reset",
        "exp": expires_at,
    }
    raw_token = jwt.encode(payload, _get_secret_key(), algorithm=_get_algorithm())
    token_hash = _hash_token(raw_token)

    if not _store_reset_token(user.id, token_hash, expires_at):
        logger.warning("Skipping password reset for invalid user id: %r", user.id)
        return

    reset_link = _build_reset_link(raw_token)

    try:
        _send_reset_email(user.email, reset_link, expire_minutes)
    except RuntimeError:
        logger.warning("Password reset email delivery failed for user_id=%s", user.id)


def reset_password_with_token(token: str, new_password: str) -> None:
    """Reset user password using a valid password-reset token."""

    user = _validate_reset_token(token)
    updated_user = update_user_password(user.id, new_password)
    if updated_user is None:
        raise PasswordResetTokenError("Invalid or expired reset token.")

    _clear_reset_token(user.id)