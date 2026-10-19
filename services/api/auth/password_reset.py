import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import resend
from dotenv import load_dotenv
from tinydb import Query

from services.api.auth import storage
from services.api.auth.security import hash_password

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

TOKEN_EXPIRY_MINUTES = 30


def create_reset_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRY_MINUTES
    )

    with storage.open_db() as db:
        table = db.table("password_reset_tokens")
        table.remove(Query().user_id == user_id)
        table.insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires.isoformat(),
        })

    return token


def reset_user_password(token: str, new_password: str) -> bool:
    if not token:
        return False

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    with storage.open_db() as db:
        table = db.table("password_reset_tokens")
        record = table.get(Query().token_hash == token_hash)

        if not record:
            return False

        expires = datetime.fromisoformat(record["expires_at"])
        if datetime.now(timezone.utc) >= expires:
            table.remove(doc_ids=[record.doc_id])
            return False

        users = db.table("users")
        user_id = record["user_id"]

        if not users.contains(doc_id=user_id):
            return False

        users.update(
            {"hashed_password": hash_password(new_password)},
            doc_ids=[user_id],
        )
        table.remove(doc_ids=[record.doc_id])

    return True


def send_reset_email(email: str, token: str):
    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        raise RuntimeError("RESEND_API_KEY no configurada")

    resend.api_key = api_key

    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:3000"
    ).rstrip("/")

    link = (
        f"{frontend_url}/reset-password?"
        f"{urlencode({'token': token})}"
    )

    return resend.Emails.send({
        "from": os.getenv(
            "RESEND_FROM_EMAIL", "onboarding@resend.dev"
        ),
        "to": [email],
        "subject": "Restablecer contraseña - Brasaland",
        "text": (
            "Para restablecer tu contraseña, abre este enlace:\n"
            f"{link}\n\n"
            "El enlace caduca en 30 minutos y solo puede usarse una vez."
        ),
    })
