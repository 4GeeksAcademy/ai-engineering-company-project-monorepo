"""
auth_service.py — Servicios de autenticación

Responsabilidades:
- Hashing de contraseñas con passlib[bcrypt]
- Verificación de contraseña contra hash
- Creación de tokens JWT firmados
- Decodificación y validación de tokens JWT

Configuración desde .env:
- SECRET_KEY: clave de firma (NUNCA hardcodeada)
- ACCESS_TOKEN_EXPIRE_MINUTES: minutos hasta expiración

Importante:
- NUNCA almacenar o comparar contraseñas en texto plano
- El token JWT lleva: sub=user_id, exp=expiry, role=user_role
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

import logging
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuración de passlib con bcrypt
# ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Convierte una contraseña en texto plano a su hash bcrypt.
    Ejemplo: "mi_password_seguro" → "$2b$12$LJ3m... (hash de 60 chars)"
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara una contraseña en texto plano contra su hash almacenado.
    Retorna True si coinciden, False si no.
    bcrypt se encarga de extraer el salt del hash almacenado.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Crea un token JWT firmado.

    Args:
        data: Diccionario con los claims del token (sub, role, etc.)
        expires_minutes: Minutos hasta expiración. Default: de .env o 30.

    Retorna:
        String con el token JWT codificado.

    El token incluye:
    - sub: user_id (identificador del usuario)
    - role: rol del usuario (admin, manager, user)
    - exp: timestamp de expiración (Unix UTC)
    - iat: timestamp de creación (Unix UTC)
    """
    secret_key = os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")
    algorithm = "HS256"

    to_encode = data.copy()

    expire_minutes = expires_minutes or int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })

    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


def decode_access_token(
    token: str,
    secret_key: Optional[str] = None,
) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.

    Args:
        token: Token JWT a decodificar.
        secret_key: Clave secreta. Default: de .env.

    Retorna:
        Diccionario con los claims si el token es válido.
        None si el token expiró, es inválido o está mal formado.

    No lanza excepciones — siempre retorna dict o None.
    El caller (auth_deps.py) decide cómo manejar cada caso.
    """
    secret = secret_key or os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


# ════════════════════════════════════════════════════════════════
# TOKENS DE RESTABLECIMIENTO DE CONTRASEÑA (AUTH-03)
# ════════════════════════════════════════════════════════════════

# Variable de entorno para expiración del token de reset
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))


def create_reset_token(user_id: int) -> str:
    """
    Genera un token JWT firmado para restablecimiento de contraseña.

    El token incluye sub=user_id, type="password_reset" y exp.
    La expiración se configura via RESET_TOKEN_EXPIRE_MINUTES.

    Args:
        user_id: ID del usuario

    Returns:
        String con token JWT firmado
    """
    secret_key = os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")
    algorithm = "HS256"

    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def verify_reset_token(token: str) -> int | None:
    """
    Verifica y decodifica un token de restablecimiento.

    Valida: firma, expiración, y que type sea "password_reset".

    Args:
        token: Token JWT a verificar

    Returns:
        int: user_id si es válido
        None: si expiró, firma inválida, o type incorrecto
    """
    secret_key = os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")
    algorithm = "HS256"
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        if payload.get("type") != "password_reset":
            logger.warning("Token de reset inválido: type incorrecto")
            return None
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except jwt.ExpiredSignatureError:
        logger.warning("Token de reset expirado")
        return None
    except jwt.JWTError as e:
        logger.warning(f"Token de reset inválido: {e}")
        return None


# Conjunto en memoria para tokens de reset usados
_invalidated_tokens: set[str] = set()


def invalidate_reset_token(token: str) -> None:
    """Marca un token de reset como usado para evitar reutilización."""
    token_id = _get_token_id(token)
    _invalidated_tokens.add(token_id)


def is_token_invalidated(token: str) -> bool:
    """Verifica si un token de reset ya fue usado."""
    token_id = _get_token_id(token)
    return token_id in _invalidated_tokens


def _get_token_id(token: str) -> str:
    """Obtiene un identificador único del token (jti o hash)."""
    secret_key = os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")
    algorithm = "HS256"
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm],
                             options={"verify_exp": False})
        return payload.get("jti", hashlib.sha256(token.encode()).hexdigest())
    except jwt.JWTError:
        return hashlib.sha256(token.encode()).hexdigest()