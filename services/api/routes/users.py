"""User and profile management routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status

import database
from auth.dependencies import get_current_user, require_self_or_admin
from auth.security import hash_password
from models_auth import (
    ProfileResponse,
    ProfileUpdate,
    UserRegistration,
    UserResponse,
    UserUpdate,
)

users_router = APIRouter(prefix="/users", tags=["users"])
profiles_router = APIRouter(prefix="/profiles", tags=["profiles"])


def _user_response(user: dict) -> UserResponse:
    return UserResponse.model_validate(user)


def _profile_response(profile: dict | None) -> ProfileResponse | None:
    return ProfileResponse.model_validate(profile) if profile is not None else None


def _require_user(user_id: int) -> dict:
    user = database.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@users_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegistration) -> UserResponse:
    normalized_email = str(payload.email).strip().lower()
    if database.get_user_by_email(normalized_email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    values = payload.model_dump()
    profile_values = {key: values.pop(key) for key in ("name", "phone", "address")}
    values["email"] = normalized_email
    values["hashed_password"] = hash_password(values.pop("password"))
    values["is_active"] = True
    values["role"] = "user"
    values["created_at"] = datetime.now(timezone.utc).isoformat()
    try:
        user = database.create_user(values)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from exc
    if any(value is not None for value in profile_values.values()):
        database.create_profile({"user_id": user["id"], **profile_values})
    return _user_response(user)


@users_router.get("", response_model=list[UserResponse])
def list_users(current_user: dict = Depends(get_current_user)) -> list[UserResponse]:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins may list users")
    del current_user
    return [_user_response(user) for user in database.list_users()]


@users_router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)) -> UserResponse:
    require_self_or_admin(user_id, current_user)
    return _user_response(_require_user(user_id))


@users_router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
) -> UserResponse:
    require_self_or_admin(user_id, current_user)
    changes = payload.model_dump(exclude_unset=True)
    if "role" in changes and changes["role"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Role cannot be null")
    if "is_active" in changes and changes["is_active"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Account status cannot be null")
    if "password" in changes and changes["password"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password cannot be null")
    if not changes:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one field must be updated")
    is_admin = current_user.get("role") == "admin"
    if "role" in changes and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins may change roles")
    if "is_active" in changes and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins may change account status")
    target = _require_user(user_id)
    if "email" in changes and changes["email"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email cannot be null")
    if "email" in changes:
        email_value = changes["email"]
        email = str(email_value).strip().lower()
        duplicate = database.get_user_by_email(email)
        if duplicate is not None and duplicate["id"] != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        changes["email"] = email
    if "password" in changes:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password changes must use the password recovery flow",
            )
        changes["hashed_password"] = hash_password(changes.pop("password"))
    if not changes:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one mutable field must be updated")
    updated = database.update_user(user_id, changes)
    return _user_response(updated or target)


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: dict = Depends(get_current_user)) -> Response:
    require_self_or_admin(user_id, current_user)
    _require_user(user_id)
    database.delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@profiles_router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)) -> ProfileResponse:
    profile = database.get_profile_by_user_id(int(current_user["id"]))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ProfileResponse.model_validate(profile)


@profiles_router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
) -> ProfileResponse:
    profile = database.update_profile(int(current_user["id"]), payload.model_dump())
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ProfileResponse.model_validate(profile)
