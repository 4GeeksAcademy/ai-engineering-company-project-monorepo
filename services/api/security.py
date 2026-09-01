import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import document_to_dict, reset_tokens_table, users_table
from models import UserResponse


ALGORITHM = "HS256"


def _get_secret_key() -> str:
    key = os.environ.get("SECRET_KEY")
    if not key:
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            "Set it before using authentication features."
        )
    return key


def _get_expire_minutes() -> int:
    raw = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    try:
        return int(raw)
    except (ValueError, TypeError):
        return 30


pwd_context = CryptContext(schemes=["bcrypt"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    secret_key = _get_secret_key()
    expire_minutes = _get_expire_minutes()

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=expire_minutes),
        "iat": now,
    }

    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    secret_key = _get_secret_key()

    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")

    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    user_id = decode_access_token(token)

    user_doc = users_table.get(doc_id=user_id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = document_to_dict(user_doc)

    if not user_data.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserResponse(**user_data)


# ──────────────────────────────────────────────
# Password reset token helpers
# ──────────────────────────────────────────────


def _get_reset_token_expire_minutes() -> int:
    raw = os.environ.get("RESET_TOKEN_EXPIRE_MINUTES", "30")
    try:
        return int(raw)
    except (ValueError, TypeError):
        return 30


def create_reset_token() -> str:
    """Generate a cryptographically secure random token for password reset."""
    return secrets.token_urlsafe(32)


def store_reset_token(user_id: int) -> str:
    """Generate and store a reset token for the given user.

    Returns the token string.
    """
    token = create_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=_get_reset_token_expire_minutes(),
    )

    reset_tokens_table.insert({
        "token": token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "used": False,
    })

    return token


def validate_reset_token(token: str) -> int | None:
    """Validate a reset token and return the user_id if valid, None otherwise.

    A token is valid if:
    - It exists in the database
    - It has not been used
    - It has not expired
    """
    from tinydb import Query

    Token = Query()
    token_docs = reset_tokens_table.search(Token.token == token)

    if not token_docs:
        return None

    token_doc = document_to_dict(token_docs[0])

    if token_doc.get("used", False):
        return None

    expires_at_str = token_doc.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if expires_at < datetime.now(timezone.utc):
            return None

    return token_doc["user_id"]


def mark_reset_token_used(token: str) -> None:
    """Mark a reset token as used (single-use enforcement)."""
    from tinydb import Query

    Token = Query()
    token_docs = reset_tokens_table.search(Token.token == token)

    if token_docs:
        reset_tokens_table.update(
            {"used": True},
            doc_ids=[token_docs[0].doc_id],
        )