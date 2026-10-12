
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from tinydb import Query

from .db import get_db

RESET_TOKEN_EXPIRE_MINUTES = 30


def create_password_reset_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    ).isoformat()

    db = get_db()
    reset_table = db.table("password_reset_tokens")

    # Invalidate previous tokens for this user.
    reset_table.update(
        {"used": True},
        Query().user_id == user_id,
    )

    reset_table.insert(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": False,
        }
    )

    db.close()
    return token


def consume_password_reset_token(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db = get_db()
    reset_table = db.table("password_reset_tokens")

    record = reset_table.get(
        (Query().token_hash == token_hash)
        & (Query().used == False)
    )

    if not record:
        db.close()
        return None

    expires_at = datetime.fromisoformat(record["expires_at"])

    if expires_at <= datetime.now(timezone.utc):
        reset_table.update(
            {"used": True},
            doc_ids=[record.doc_id],
        )
        db.close()
        return None

    reset_table.update(
        {"used": True},
        doc_ids=[record.doc_id],
    )

    user_id = record["user_id"]
    db.close()

    return user_id
