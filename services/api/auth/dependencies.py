"""FastAPI dependencies that enforce authentication and roles.

``get_current_user`` is attached at router level to every protected domain, so
a new route there is private by default; ``require_role`` narrows a single
route further (401 = no valid session, 403 = valid session, not allowed).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from . import service
from .schemas import Role, UserOut
from .security import decode_access_token

# tokenUrl only feeds the "Authorize" button in /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_UNAUTHORIZED = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserOut:
    username = decode_access_token(token)
    if username is None:
        raise _UNAUTHORIZED
    user = service.get_user(username)
    if user is None or user.get("disabled"):
        raise _UNAUTHORIZED
    return UserOut(username=user["username"], role=user["role"], disabled=False)


CurrentUser = Annotated[UserOut, Depends(get_current_user)]


def require_role(*allowed: Role):
    """Dependency factory: only users whose role is in ``allowed`` get through."""

    async def checker(user: CurrentUser) -> UserOut:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker
