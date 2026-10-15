import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.hash import bcrypt

from services.api.auth import storage

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.verify(password, hashed_password)


def get_secret_key() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY no configurada")
    return secret


def create_access_token(user_id: int) -> str:
    minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    if minutes <= 0:
        raise ValueError("La expiracion debe ser positiva")

    expires = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    return jwt.encode(
        {"sub": str(user_id), "exp": expires},
        get_secret_key(),
        algorithm="HS256",
    )


def get_current_user(token: str = Depends(oauth2_scheme)):
    error = HTTPException(
        status_code=401,
        detail="Token invalido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")
        if (
            not isinstance(user_id, str)
            or not user_id.isdecimal()
            or "exp" not in payload
        ):
            raise error
    except JWTError:
        raise error from None

    user = storage.get_user_by_id(int(user_id))

    if not user or not user.get("is_active"):
        raise error

    return user
