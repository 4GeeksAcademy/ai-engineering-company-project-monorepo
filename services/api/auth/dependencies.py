"""Bearer-token dependencies shared by protected API routes."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import database
from auth.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Resolve a valid bearer token to an active TinyDB user."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = decode_access_token(token)
    except (ValueError, RuntimeError) as exc:
        raise unauthorized from exc

    user = database.get_user(user_id)
    if user is None or not user.get("is_active", False):
        raise unauthorized
    return user


def require_self_or_admin(target_user_id: int, current_user: dict) -> None:
    """Raise 403 unless the caller owns the resource or is an admin."""
    if int(current_user["id"]) != target_user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
