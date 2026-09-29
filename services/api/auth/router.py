"""Routes for the auth domain: login (OAuth2 password flow), the current
session's user, and admin-only user creation.

Mounted twice in ``main.py``: at ``/auth`` (documented) and at ``/api/auth``
(what the backoffice calls through the Vite proxy).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from . import service
from .dependencies import CurrentUser, require_role
from .schemas import Role, Token, UserCreate, UserOut
from .security import create_access_token

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    user = service.authenticate(form.username, form.password)
    if user is None:
        # Same answer for unknown user, wrong password and disabled account.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user["username"]))


@router.get("/me", response_model=UserOut)
async def read_me(user: CurrentUser) -> UserOut:
    return user


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
async def create_user(payload: UserCreate) -> UserOut:
    try:
        doc = service.create_user(payload)
    except service.UsernameTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserOut(**doc)
