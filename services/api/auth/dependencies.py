"""FastAPI dependency that enforces authentication.

``get_current_user`` is attached at router level to every protected domain, so
a new route there is private by default. There are no roles: a valid session is
all it takes (401 = no valid session).
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from users import service as users_service
from users.schemas import UserOut

from .security import decode_access_token

# tokenUrl only feeds the "Authorize" button in /docs (its "username" box takes the email).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_UNAUTHORIZED = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserOut:
    user_uuid = decode_access_token(token)
    if user_uuid is None:
        raise _UNAUTHORIZED
    doc = users_service.get_doc(user_uuid)
    if doc is None:  # account deleted after the token was issued
        raise _UNAUTHORIZED
    return UserOut(user_uuid=doc["user_uuid"], email=doc["email"])


CurrentUser = Annotated[UserOut, Depends(get_current_user)]


def only_owner(user_uuid: UUID, current: CurrentUser) -> None:
    """Dependency for routes shaped ``/{user_uuid}``: only that user may pass."""
    if current.user_uuid != user_uuid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only change your own account")
