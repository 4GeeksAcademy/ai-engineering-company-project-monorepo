from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import TinyDB

from ai_engineering_company_project_monorepo.api.dependencies import get_current_user, get_database
from ai_engineering_company_project_monorepo.api.schemas import ProfileResponse, ProfileUpdate
from ai_engineering_company_project_monorepo.models.user import User
from ai_engineering_company_project_monorepo.services.profile_service import (
    get_profile_by_user_id,
    update_profile,
)


router = APIRouter(prefix="/profiles", tags=["profiles"])
Database = Annotated[TinyDB, Depends(get_database)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=ProfileResponse)
def read_my_profile(database: Database, current_user: CurrentUser) -> ProfileResponse:
    profile = get_profile_by_user_id(database, current_user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ProfileResponse(**profile.to_document())


@router.put("/me", response_model=ProfileResponse)
def edit_my_profile(
    payload: ProfileUpdate,
    database: Database,
    current_user: CurrentUser,
) -> ProfileResponse:
    profile = update_profile(
        database,
        current_user.id,
        payload.model_dump(exclude_unset=True),
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ProfileResponse(**profile.to_document())