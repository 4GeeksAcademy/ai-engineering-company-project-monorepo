from typing import Annotated

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response, status
from tinydb import TinyDB

from ai_engineering_company_project_monorepo.api.dependencies import get_current_user, get_database
from ai_engineering_company_project_monorepo.api.schemas import (
    ProfileResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from ai_engineering_company_project_monorepo.models.user import User, UserRole
from ai_engineering_company_project_monorepo.services.profile_service import (
    create_profile,
    get_profile_by_user_id,
)
from ai_engineering_company_project_monorepo.services.user_service import (
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    update_user,
)


router = APIRouter(prefix="/users", tags=["users"])
Database = Annotated[TinyDB, Depends(get_database)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _to_response(database: TinyDB, user: User) -> UserResponse:
    profile = get_profile_by_user_id(database, user.id)
    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        role=UserRole(user.role),
        created_at=user.created_at,
        profile=(
            ProfileResponse(**profile.to_document())
            if profile is not None
            else None
        ),
    )


def _require_owner_or_admin(current_user: User, target_user: User) -> None:
    if current_user.id != target_user.id and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's resource",
        )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, database: Database) -> UserResponse:
    email = str(payload.email)
    if get_user_by_email(database, email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = create_user(
        database,
        email=email,
        hashed_password=bcrypt.hashpw(
            payload.password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("ascii"),
    )
    try:
        create_profile(
            database,
            user_id=user.id,
            name=payload.name,
            phone=payload.phone,
            address=payload.address,
        )
    except Exception:
        delete_user(database, user.id)
        raise
    return _to_response(database, user)


@router.get("", response_model=list[UserResponse])
def list_users(database: Database, current_user: CurrentUser) -> list[UserResponse]:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list users",
        )
    users = [User.from_document(record) for record in database.table("users").all()]
    return [_to_response(database, user) for user in users]


@router.get("/{id}", response_model=UserResponse)
def read_user(id: str, database: Database, current_user: CurrentUser) -> UserResponse:
    user = get_user_by_id(database, id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _require_owner_or_admin(current_user, user)
    return _to_response(database, user)


@router.put("/{id}", response_model=UserResponse)
def edit_user(
    id: str,
    payload: UserUpdate,
    database: Database,
    current_user: CurrentUser,
) -> UserResponse:
    user = get_user_by_id(database, id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _require_owner_or_admin(current_user, user)
    is_admin = current_user.role == UserRole.ADMIN.value

    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change roles")

    if "email" in updates:
        updates["email"] = str(updates["email"])
        existing_user = get_user_by_email(database, updates["email"])
        if existing_user is not None and existing_user.id != id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if "password" in updates:
        password = updates.pop("password")
        updates["hashed_password"] = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("ascii")
    if "role" in updates:
        updates["role"] = updates["role"].value

    updated_user = update_user(database, id, **updates)
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_response(database, updated_user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(id: str, database: Database, current_user: CurrentUser) -> Response:
    user = get_user_by_id(database, id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _require_owner_or_admin(current_user, user)
    if not delete_user(database, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)