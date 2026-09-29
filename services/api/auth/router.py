"""Routes for the auth domain: login (OAuth2 password flow, the form's ``username`` field carries the email) and the current
session's user. User management lives in the ``users`` domain.

Mounted twice in ``main.py``: at ``/auth`` (documented) and at ``/api/auth``
(what the backoffice calls through the Vite proxy).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from users.schemas import UserOut

from . import service
from .dependencies import CurrentUser
from .schemas import Token
from .security import create_access_token

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    user = service.authenticate(form.username, form.password)  # username = email
    if user is None:
        # Same answer for an unknown email and a wrong password.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.user_uuid))


@router.get("/me", response_model=UserOut)
async def read_me(user: CurrentUser) -> UserOut:
    return user
