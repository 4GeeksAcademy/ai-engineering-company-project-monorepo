"""User management endpoints backed by TinyDB services."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.models.profile import Profile
from src.models.user import TinyDBId, User, UserRole
from src.services.auth_service import get_current_user
from src.services.profile_service import get_profile_by_user_id
from src.services.user_service import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)

users_router = APIRouter(prefix="/users", tags=["users"])


class UserCreateRequest(BaseModel):
    email: str
    password: str
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class UserUpdateRequest(BaseModel):
    email: str | None = None
    role: UserRole | None = None


class UserResponse(BaseModel):
    id: TinyDBId
    email: str
    is_active: bool
    role: UserRole
    created_at: datetime


class UserWithProfileResponse(BaseModel):
    user: UserResponse
    profile: Profile | None


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


def _can_update_target_user(current_user: User, target_user_id: str) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    return str(current_user.id) == target_user_id


@users_router.post("", response_model=UserWithProfileResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreateRequest) -> UserWithProfileResponse:
    try:
        user = create_user(
            email=payload.email,
            password=payload.password,
            name=payload.name,
            phone=payload.phone,
            address=payload.address,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    profile = get_profile_by_user_id(user.id)
    return UserWithProfileResponse(user=_to_user_response(user), profile=profile)


@users_router.get("", response_model=list[UserResponse])
def get_users(_current_user: User = Depends(get_current_user)) -> list[UserResponse]:
    users = list_users()
    return [_to_user_response(user) for user in users]


@users_router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, _current_user: User = Depends(get_current_user)) -> UserResponse:
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_user_response(user)


@users_router.put("/{user_id}", response_model=UserResponse)
def put_user(
    user_id: str,
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if not _can_update_target_user(current_user, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    updates = payload.model_dump(exclude_none=True)
    try:
        user = update_user(user_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_user_response(user)


@users_router.delete("/{user_id}")
def remove_user(user_id: str, _current_user: User = Depends(get_current_user)) -> dict[str, str]:
    deleted = delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"message": "User deleted"}
