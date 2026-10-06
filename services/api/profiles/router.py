"""Routes for the profiles domain: read and edit your own profile.

Every route needs a valid session. A profile is created and deleted together
with its user (see ``users.service``), so there is no POST or DELETE here.
Reading a profile by id is for its owner or an admin, listing all of them is for
admins, and only the owner can write it (``403`` for anyone else).

Mounted once in ``main.py``, at ``/profiles``.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import CurrentUser, admin_only, get_current_user, owner_or_admin, owner_only

from . import service
from .schemas import Profile, ProfileUpdate

router = APIRouter(tags=["profiles"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[Profile], dependencies=[Depends(admin_only)])
async def list_profiles() -> list[Profile]:
    return service.list_profiles()


# "/me" is declared before "/{user_id}" so "me" is never parsed as an id.
@router.get("/me", response_model=Profile)
async def read_my_profile(current: CurrentUser) -> Profile:
    return service.ensure_profile(current.id, current.email)  # self-heals a missing profile


@router.put("/me", response_model=Profile)
async def update_my_profile(payload: ProfileUpdate, current: CurrentUser) -> Profile:
    """Update your own ``name``, ``phone``, ``address`` (and ``contact_email``);
    omitted fields are kept, an explicit ``null`` clears an optional one."""
    service.ensure_profile(current.id, current.email)
    return service.update_profile(current.id, payload)


@router.put("/{user_id}", response_model=Profile, dependencies=[Depends(owner_only)])
async def update_profile_by_id(payload: ProfileUpdate, current: CurrentUser) -> Profile:
    """Same as ``/me`` for clients that address the profile by id; anyone but the owner
    gets ``403`` (not even an admin can write someone else's profile)."""
    return await update_my_profile(payload, current)


@router.get("/{user_id}", response_model=Profile, dependencies=[Depends(owner_or_admin)])
async def get_profile(user_id: UUID) -> Profile:
    try:
        return service.get_profile(user_id)
    except service.ProfileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
