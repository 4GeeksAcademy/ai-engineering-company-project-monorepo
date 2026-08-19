"""JWT auth for the Brasaland backoffice API (tickets, SSE stream, knowledge WebSocket)."""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.environ.get("JWT_SECRET", "brasaland-backoffice-dev-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))
TOKEN_QUERY_PARAM = "access_token"

# Local backoffice operators from CONTEXT-company.md. Override password via BACKOFFICE_PASSWORD.
_DEFAULT_PASSWORD = os.environ.get("BACKOFFICE_PASSWORD", "brasaland")
BACKOFFICE_USERS: dict[str, dict[str, str]] = {
    "mariana": {"name": "Mariana", "role": "ceo", "password": _DEFAULT_PASSWORD},
    "felipe": {"name": "Felipe Guerrero", "role": "operations", "password": _DEFAULT_PASSWORD},
    "lucia": {"name": "Lucía Fernández", "role": "procurement", "password": _DEFAULT_PASSWORD},
}

_bearer = HTTPBearer(auto_error=False)
WS_TOKEN_QUERY_PARAMS = ("token", TOKEN_QUERY_PARAM)


class AuthError(Exception):
    """Invalid or missing backoffice JWT (WebSocket-safe; not an HTTPException)."""

    def __init__(self, detail: str = "Not authenticated") -> None:
        self.detail = detail
        super().__init__(detail)


def create_access_token(username: str, extra: dict[str, Any] | None = None) -> str:
    user = BACKOFFICE_USERS[username]
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": username,
        "name": user["name"],
        "role": user["role"],
        "aud": "brasaland-backoffice",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def authenticate_user(username: str, password: str) -> dict[str, str] | None:
    user = BACKOFFICE_USERS.get(username.strip().lower())
    if user is None:
        return None
    if not secrets.compare_digest(password, user["password"]):
        return None
    return {"username": username.strip().lower(), "name": user["name"], "role": user["role"]}


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return claims_from_access_token(token)
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error.detail,
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


def claims_from_access_token(token: str) -> dict[str, Any]:
    """Same JWT as backoffice REST and SSE. Raises AuthError instead of HTTPException."""
    if not token or not str(token).strip():
        raise AuthError("Not authenticated")
    try:
        claims = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="brasaland-backoffice",
        )
    except jwt.PyJWTError as error:
        raise AuthError("Invalid or expired token") from error
    username = claims.get("sub")
    if not username or username not in BACKOFFICE_USERS:
        raise AuthError("Unknown backoffice user")
    return claims


def token_from_websocket(websocket: Any) -> str | None:
    """Browsers cannot set Authorization on the handshake; prefer ?token= or ?access_token=."""
    for key in WS_TOKEN_QUERY_PARAMS:
        value = websocket.query_params.get(key)
        if value:
            return value
    authorization = websocket.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None
    return None


def extract_bearer_or_query_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
    access_token: str | None,
) -> str:
    if credentials and credentials.scheme.lower() == "bearer" and credentials.credentials:
        return credentials.credentials
    if access_token:
        return access_token
    query_token = request.query_params.get(TOKEN_QUERY_PARAM)
    if query_token:
        return query_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_backoffice_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> dict[str, Any]:
    token = extract_bearer_or_query_token(request, credentials, access_token=None)
    return _claims_for_token(token)


def require_backoffice_sse_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
    access_token: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """Same JWT as ticket REST. Prefer Authorization: Bearer; query token is a fallback."""
    token = extract_bearer_or_query_token(request, credentials, access_token)
    return _claims_for_token(token)


def _claims_for_token(token: str) -> dict[str, Any]:
    return decode_access_token(token)
