"""User endpoints. Sign-up is public; everything else needs a bearer token."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

import user_service
from database import EmailAlreadyRegistered
from dependencies import CurrentUser, UserRepo
from user_models import Role, User, UserCreate, UserListItem, UserPublic, UserRegistered, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

UNAUTHORIZED = {401: {"description": "Missing, malformed or expired token"}}
NOT_FOUND = {404: {"description": "User not found"}}
FORBIDDEN = {403: {"description": "Only the user themselves or an admin may do this"}}
CONFLICT = {409: {"description": "That email is already registered"}}


def _found(user: User | None, user_id: str) -> User:
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return user


def _require_self_or_admin(current: User, user_id: str) -> None:
    if current.id != user_id and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="You can only manage your own account")


@router.post("", response_model=UserRegistered, status_code=status.HTTP_201_CREATED, responses=CONFLICT)
def create_user(payload: UserCreate, repository: UserRepo) -> User:
    try:
        return user_service.create_user(repository, payload)
    except EmailAlreadyRegistered as error:
        raise HTTPException(status_code=409, detail="That email is already registered") from error


@router.get("", response_model=list[UserListItem], responses=UNAUTHORIZED)
def list_users(_: CurrentUser, repository: UserRepo) -> list[User]:
    return user_service.list_users(repository)


@router.get("/{user_id}", response_model=UserPublic, responses={**UNAUTHORIZED, **NOT_FOUND})
def get_user(user_id: str, _: CurrentUser, repository: UserRepo) -> User:
    return _found(user_service.get_user_by_id(repository, user_id), user_id)


@router.put("/{user_id}", response_model=UserPublic, responses={**UNAUTHORIZED, **FORBIDDEN, **NOT_FOUND, **CONFLICT})
def update_user(user_id: str, payload: UserUpdate, current: CurrentUser, repository: UserRepo) -> User:
    _require_self_or_admin(current, user_id)
    if payload.role is not None and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Only an admin can change a role")
    try:
        updated = user_service.update_user(repository, user_id, payload)
    except EmailAlreadyRegistered as error:
        raise HTTPException(status_code=409, detail="That email is already registered") from error
    return _found(updated, user_id)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={**UNAUTHORIZED, **FORBIDDEN, **NOT_FOUND},
)
def delete_user(user_id: str, current: CurrentUser, repository: UserRepo) -> Response:
    _require_self_or_admin(current, user_id)
    if not user_service.delete_user(repository, user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
