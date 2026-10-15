import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt

from models import User
from user_service import get_user_by_id


load_dotenv(Path(__file__).with_name(".env"), override=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
http_bearer_scheme = HTTPBearer(auto_error=False)
ALGORITHM = "HS256"


def auth_settings() -> tuple[str, int]:
    secret_key = os.environ.get("SECRET_KEY", "")
    try:
        expires_minutes = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    except ValueError as error:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES debe ser un entero positivo.") from error
    if len(secret_key) < 32:
        raise RuntimeError("Configura SECRET_KEY en services/api/.env con al menos 32 caracteres.")
    if expires_minutes < 1:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES debe ser mayor que cero.")
    return secret_key, expires_minutes


def create_access_token(user: User) -> tuple[str, int]:
    secret_key, expires_minutes = auth_settings()
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": str(user.id), "role": user.role.value, "iat": now, "exp": now + timedelta(minutes=expires_minutes)},
        secret_key,
        algorithm=ALGORITHM,
    )
    return token, expires_minutes * 60


def get_current_user(
    request: Request,
    oauth_token: Annotated[str | None, Depends(oauth2_scheme)],
    bearer: Annotated[HTTPAuthorizationCredentials | None, Depends(http_bearer_scheme)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación no válidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = oauth_token or (bearer.credentials if bearer is not None else None)
        if token is None:
            raise unauthorized
        secret_key, _ = auth_settings()
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM], options={"require_sub": True, "require_exp": True})
        user_id = int(payload["sub"])
        with request.app.state.lock:
            user = get_user_by_id(request.app.state.db, user_id)
    except (JWTError, KeyError, TypeError, ValueError, RuntimeError):
        raise unauthorized
    if user is None or not user.is_active:
        raise unauthorized
    return user