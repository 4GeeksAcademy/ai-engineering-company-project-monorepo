"""Transactional email delivery through Resend."""

import resend

from app.core.config import get_settings


def send_password_reset_email(email: str, reset_url: str) -> None:
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Reset your Brasaland password",
            "html": (
                "<h1>Reset your password</h1>"
                "<p>Use the link below within 15 minutes to set a new password.</p>"
                f'<p><a href="{reset_url}">Reset password</a></p>'
                "<p>If you did not request this, you can ignore this email.</p>"
            ),
        }
    )