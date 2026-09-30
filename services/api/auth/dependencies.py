"""FastAPI dependency that enforces authentication.

``get_current_user`` is attached at router level to every protected domain, so
a new route there is private by default. A valid session for an active user is
all it takes (401 = no valid session); ``role`` is stored but no route checks it yet.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from users import service as users_service
from users.schemas import Role, UserOut

from .security import decode_access_token

# tokenUrl only feeds the "Authorize" button in /docs (its "username" box takes the email).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_UNAUTHORIZED = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserOut:
    user_id = decode_access_token(token)
    if user_id is None:
        raise _UNAUTHORIZED
    doc = users_service.get_doc(user_id)
    if doc is None or not doc["is_active"]:  # deleted or deactivated after the token was issued
        raise _UNAUTHORIZED
    return UserOut.model_validate(doc)


CurrentUser = Annotated[UserOut, Depends(get_current_user)]


def owner_or_admin(user_id: UUID, current: CurrentUser) -> None:
    """Dependency for routes shaped ``/{user_id}``: that user or any admin may pass
    (``403`` for anyone else, before the target is even looked up)."""
    if current.id != user_id and current.role != Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only access your own account")


def owner_only(user_id: UUID, current: CurrentUser) -> None:
    """Dependency for routes shaped ``/{user_id}`` that only the owner may use, not even an admin."""
    if current.id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only change your own profile")


def admin_only(current: CurrentUser) -> None:
    """Dependency for routes that expose everybody's data at once."""
    if current.role != Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admins only")
