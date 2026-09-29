"""FastAPI dependency that enforces authentication.

``get_current_user`` is attached at router level to every protected domain, so
a new route there is private by default. There are no roles: a valid session is
all it takes (401 = no valid session).
"""

from __future__ import annotations

from typing import Annotated

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
    data = decode_access_token(token)
    if data is None:
        raise _UNAUTHORIZED
    doc = users_service.get_doc(data.user_uuid)
    if doc is None:  # account deleted after the token was issued
        raise _UNAUTHORIZED
    # A password change revokes every token issued before it.
    if data.issued_at < doc.get("password_changed_at", 0):
        raise _UNAUTHORIZED
    return UserOut(user_uuid=doc["user_uuid"], email=doc["email"])


CurrentUser = Annotated[UserOut, Depends(get_current_user)]
