from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from database import document_to_dict, profiles_table, users_table
from models import (
    UserCreate,
    UserResponse,
    UserUpdate,
)
from security import get_current_user, hash_password


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(payload: UserCreate):
    User = Query()

    existing = users_table.search(User.email == payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    if payload.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="New users can only be created with role 'user'",
        )

    hashed_password = hash_password(payload.password)

    user_data = {
        "email": payload.email,
        "hashed_password": hashed_password,
        "is_active": True,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    user_id = users_table.insert(user_data)

    if payload.name is not None or payload.phone is not None or payload.address is not None:
        profile_data = {
            "user_id": user_id,
            "name": payload.name,
            "phone": payload.phone,
            "address": payload.address,
        }
        profiles_table.insert(profile_data)

    user_doc = users_table.get(doc_id=user_id)

    return document_to_dict(user_doc)


@router.get(
    "",
    response_model=list[UserResponse],
)
def list_users(
    current_user: UserResponse = Depends(get_current_user),
):
    documents = users_table.all()

    return [
        document_to_dict(document)
        for document in documents
    ]


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
def get_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own user resource",
        )

    user_doc = users_table.get(doc_id=user_id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return document_to_dict(user_doc)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own user resource",
        )

    if payload.role is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change your role",
        )

    if payload.is_active is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change your active status",
        )

    user_doc = users_table.get(doc_id=user_id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    updates = {}

    if payload.email is not None:
        User = Query()
        existing = users_table.search(
            (User.email == payload.email) & (User.email != user_doc.get("email"))
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        updates["email"] = payload.email

    if payload.password is not None:
        updates["hashed_password"] = hash_password(payload.password)

    if updates:
        users_table.update(updates, doc_ids=[user_id])

    updated_doc = users_table.get(doc_id=user_id)

    return document_to_dict(updated_doc)


@router.delete(
    "/{user_id}",
)
def delete_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own user resource",
        )

    user_doc = users_table.get(doc_id=user_id)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    Profile = Query()
    profiles_table.remove(Profile.user_id == user_id)

    users_table.remove(doc_ids=[user_id])

    return {"detail": "User deleted successfully"}