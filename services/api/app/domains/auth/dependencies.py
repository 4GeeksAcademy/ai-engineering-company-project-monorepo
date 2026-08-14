"""
dependencies.py — Brasaland · FastAPI dependency for current user authentication
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.database import users_table

from .service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency that:
    1. Extracts the Bearer token from the Authorization header.
    2. Decodes and validates the JWT.
    3. Looks up the user in TinyDB by the 'sub' claim (user doc_id).
    4. Returns the user document or raises 401.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_doc = users_table.get(doc_id=int(user_id))
    except (ValueError, TypeError):
        raise credentials_exception

    if user_doc is None:
        raise credentials_exception

    if not user_doc.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user_doc
