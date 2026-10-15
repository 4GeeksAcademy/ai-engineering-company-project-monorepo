"""Routes for the auth domain: login and the current session's user (with its profile).

``POST /login`` follows the OAuth2 password flow: the form's ``username`` field
carries the email. User management lives in the ``users`` domain.

Mounted once in ``main.py``, at ``/auth``.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from core.config import get_access_token_expire_minutes
from profiles import service as profiles_service

from . import service
from .dependencies import CurrentUser
from .schemas import MeOut, Token
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
    return Token(
        access_token=create_access_token(user.id),
        expires_in=get_access_token_expire_minutes() * 60,
    )


@router.get("/me", response_model=MeOut)
async def read_me(user: CurrentUser) -> MeOut:
    profile = profiles_service.ensure_profile(user.id, user.email)  # self-heals a missing profile
    return MeOut(**user.model_dump(), profile=profile)
