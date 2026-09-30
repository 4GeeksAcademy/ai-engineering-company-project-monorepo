"""Routes for the users domain: CRUD over internal accounts (email + password).

Every route needs a valid session (``401`` otherwise) except ``POST /users``,
the registration: anyone can sign up (with an optional initial profile, created
in the same operation) and always gets the ``user`` role. Reading, changing or
deleting an account is for the account's owner or an admin (``403`` otherwise),
and listing every user is for admins only (``/directory`` is the exception:
any session gets the names of the active users, and nothing else); only an admin can change a ``role`` or
``is_active``, and only the owner can change their own password — nobody can
reset someone else's. Sign-ups are active straight away (they can log in at once);
an admin can switch an account off with ``is_active``. Display name and contact data are not stored here: see ``profiles``.

Two routers, both mounted at ``/users`` in ``main.py``: ``router`` is private by
default, so a route added to it is protected; ``public_router`` holds the only
exception and is the one to keep an eye on.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import CurrentUser, admin_only, get_current_user, owner_or_admin

from . import service
from .schemas import DirectoryEntry, Role, SignUpOut, UserCreate, UserOut, UserUpdate

SIGN_UP_MESSAGE = "Account created. You can sign in now."

router = APIRouter(tags=["users"], dependencies=[Depends(get_current_user)])
public_router = APIRouter(tags=["users"])


@router.get("", response_model=list[UserOut], dependencies=[Depends(admin_only)])
async def list_users() -> list[UserOut]:
    return service.list_users()


# Declared before "/{user_id}" so "directory" is never parsed as an id.
@router.get("/directory", response_model=list[DirectoryEntry])
async def user_directory() -> list[DirectoryEntry]:
    """Who is who, for any session: ``user_id`` and ``name`` of the active users, nothing else."""
    return service.list_directory()


@public_router.post("", response_model=SignUpOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> SignUpOut:
    """Public sign-up. The new user is always a ``user`` (``role`` is not accepted) and
    active: it can sign in straight away."""
    try:
        user = service.create_user(payload)
        return SignUpOut(**user.model_dump(), message=SIGN_UP_MESSAGE)
    except service.EmailTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(owner_or_admin)])
async def get_user(user_id: UUID) -> UserOut:
    try:
        return service.get_user(user_id)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(owner_or_admin)])
async def update_user(user_id: UUID, payload: UserUpdate, current: CurrentUser) -> UserOut:
    is_owner = current.id == user_id
    if (payload.role is not None or payload.is_active is not None) and current.role != Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only an admin can change a role or activate accounts")
    if payload.password is not None and not is_owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the owner can change their password")
    try:
        return service.update_user(user_id, payload, check_password=is_owner)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.CurrentPasswordRequiredError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except service.WrongPasswordError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (service.EmailTakenError, service.LastAdminError) as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(owner_or_admin)])
async def delete_user(user_id: UUID) -> None:
    """Also deletes the user's linked profile."""
    try:
        service.delete_user(user_id)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (service.LastUserError, service.LastAdminError) as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
