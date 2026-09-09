import logging
import os

import resend
from resend import RequestsClient
from resend.exceptions import (
    InvalidApiKeyError,
    MissingApiKeyError,
    RateLimitError,
    ResendError,
    ValidationError,
)


logger = logging.getLogger("api.email")

RESEND_API_KEY_ENV = "RESEND_API_KEY"
RESEND_FROM_ENV = "RESEND_FROM"
RESEND_FROM_DEFAULT = "TrackFlow <noreply@trackflow.app>"


class EmailServiceError(Exception):
    """Raised when the email service is not available."""


class EmailConfigurationError(Exception):
    """Raised when the email service is not configured."""


_EMAIL_TIMEOUT_SECONDS = 15

# Configure a shared HTTP client with a reasonable timeout.
_http_client = RequestsClient(timeout=_EMAIL_TIMEOUT_SECONDS)
resend.default_http_client = _http_client


def _get_resend_api_key() -> str:
    key = os.environ.get(RESEND_API_KEY_ENV)
    if not key:
        logger.error("RESEND_API_KEY environment variable is not set")
        raise EmailConfigurationError(
            "Email service is not configured."
        )
    return key


def _get_resend_from() -> str:
    return os.environ.get(RESEND_FROM_ENV, RESEND_FROM_DEFAULT)


def send_password_reset_email(email: str, token: str) -> None:
    """Send a password reset email with the given token via Resend."""
    api_key = _get_resend_api_key()
    from_addr = _get_resend_from()

    resend.api_key = api_key

    frontend_url = os.environ.get(
        "FRONTEND_URL",
        "http://localhost:5173",
    )

    reset_link = f"{frontend_url}/reset-password?token={token}"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a2e;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #e0e0e0;
        }}
        .header h1 {{
            font-size: 24px;
            color: #1a1a2e;
            margin: 0;
        }}
        .content {{
            padding: 30px 0;
        }}
        .button {{
            display: inline-block;
            background-color: #4361ee;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
        }}
        .footer {{
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #6b7280;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>TrackFlow</h1>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>
            We received a request to reset the password for your TrackFlow account.
            Click the button below to set a new password:
        </p>
        <p style="text-align: center;">
            <a href="{reset_link}" class="button">Reset Password</a>
        </p>
        <p>
            If you did not request a password reset, you can safely ignore this email.
            The link will expire in 30 minutes.
        </p>
        <p>
            If the button does not work, copy and paste the following link into your browser:
        </p>
        <p style="word-break: break-all; font-size: 14px; color: #4361ee;">
            {reset_link}
        </p>
    </div>
    <div class="footer">
        <p>TrackFlow Supplier Directory</p>
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>"""

    params = {
        "from": from_addr,
        "to": [email],
        "subject": "Reset your TrackFlow password",
        "html": html_content,
    }

    try:
        resend.Emails.send(params)
    except (InvalidApiKeyError, MissingApiKeyError):
        logger.warning("Resend API key rejected when sending reset email to %s", email)
        raise EmailServiceError("Email service is not configured.")
    except RateLimitError:
        logger.warning("Resend rate limit hit when sending reset email to %s", email)
        raise EmailServiceError(
            "Unable to send the reset email right now. Please try again later."
        )
    except ValidationError as exc:
        logger.warning(
            "Resend validation error for %s: %s", email, exc
        )
        raise EmailServiceError(
            "Unable to send the reset email right now. Please try again later."
        )
    except ResendError as exc:
        logger.error(
            "Resend API error while sending reset email to %s: %s", email, exc
        )
        raise EmailServiceError(
            "Unable to send the reset email right now. Please try again later."
        )