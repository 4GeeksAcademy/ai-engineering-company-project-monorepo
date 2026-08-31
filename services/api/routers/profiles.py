from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from database import document_to_dict, profiles_table
from models import (
    ProfileResponse,
    ProfileUpdate,
    UserResponse,
)
from security import get_current_user


router = APIRouter(
    prefix="/profiles",
    tags=["Profiles"],
)


@router.get(
    "/me",
    response_model=ProfileResponse,
)
def get_my_profile(
    current_user: UserResponse = Depends(get_current_user),
):
    Profile = Query()

    profile_docs = profiles_table.search(Profile.user_id == current_user.id)

    if not profile_docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return document_to_dict(profile_docs[0])


@router.put(
    "/me",
    response_model=ProfileResponse,
)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    Profile = Query()

    profile_docs = profiles_table.search(Profile.user_id == current_user.id)

    if profile_docs:
        profile_doc = profile_docs[0]
        profile_id = profile_doc.doc_id

        updates = {}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.phone is not None:
            updates["phone"] = payload.phone
        if payload.address is not None:
            updates["address"] = payload.address

        if updates:
            profiles_table.update(updates, doc_ids=[profile_id])

        updated_doc = profiles_table.get(doc_id=profile_id)
        return document_to_dict(updated_doc)
    else:
        profile_data = {
            "user_id": current_user.id,
            "name": payload.name,
            "phone": payload.phone,
            "address": payload.address,
        }
        profile_id = profiles_table.insert(profile_data)
        new_doc = profiles_table.get(doc_id=profile_id)
        return document_to_dict(new_doc)