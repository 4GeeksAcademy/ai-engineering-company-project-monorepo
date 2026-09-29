"""Routes for the profiles domain: read everyone's profile, edit your own.

Every route needs a valid session. A profile is created and deleted together
with its user (see ``users.service``), so there is no POST or DELETE here.
Only the owner can edit (``403`` otherwise).

Mounted twice in ``main.py``: at ``/profiles`` (documented) and at
``/api/profiles`` (the backoffice's Vite-proxy path).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import CurrentUser, get_current_user, only_owner

from . import service
from .schemas import ProfileOut, ProfileUpdate

router = APIRouter(tags=["profiles"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ProfileOut])
async def list_profiles() -> list[ProfileOut]:
    return service.list_profiles()


# Declared before "/{user_uuid}" so "me" is never parsed as an id.
@router.get("/me", response_model=ProfileOut)
async def read_my_profile(current: CurrentUser) -> ProfileOut:
    return service.ensure_profile(current.user_uuid, current.email)


@router.get("/{user_uuid}", response_model=ProfileOut)
async def get_profile(user_uuid: UUID) -> ProfileOut:
    try:
        return service.get_profile(user_uuid)
    except service.ProfileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{user_uuid}", response_model=ProfileOut, dependencies=[Depends(only_owner)])
async def update_profile(user_uuid: UUID, payload: ProfileUpdate, current: CurrentUser) -> ProfileOut:
    service.ensure_profile(current.user_uuid, current.email)  # self-heal a missing profile
    return service.update_profile(user_uuid, payload)
