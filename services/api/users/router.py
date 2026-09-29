"""Routes for the users domain: CRUD over internal accounts (email + password).

Every route needs a valid session. Anyone logged in can list and read users
and create a teammate's account, but only the owner can change or delete an
account (``403`` otherwise) — there are no roles, so nobody can reset someone
else's password.

Mounted twice in ``main.py``: at ``/users`` (documented) and at ``/api/users``
(the backoffice's Vite-proxy path).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import CurrentUser, get_current_user

from . import service
from .schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(tags=["users"], dependencies=[Depends(get_current_user)])


def _only_owner(user_uuid: UUID, current: CurrentUser) -> None:
    if current.user_uuid != user_uuid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only change your own account")


@router.get("", response_model=list[UserOut])
async def list_users() -> list[UserOut]:
    return service.list_users()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> UserOut:
    try:
        return service.create_user(payload)
    except service.EmailTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{user_uuid}", response_model=UserOut)
async def get_user(user_uuid: UUID) -> UserOut:
    try:
        return service.get_user(user_uuid)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{user_uuid}", response_model=UserOut, dependencies=[Depends(_only_owner)])
async def update_user(user_uuid: UUID, payload: UserUpdate) -> UserOut:
    try:
        return service.update_user(user_uuid, payload)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.WrongPasswordError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except service.EmailTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{user_uuid}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(_only_owner)])
async def delete_user(user_uuid: UUID) -> None:
    try:
        service.delete_user(user_uuid)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.LastUserError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
