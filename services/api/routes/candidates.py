from fastapi import APIRouter, Depends, HTTPException, Query as FastAPIQuery
from typing import List, Optional
from services.api.models import (
    CandidateCreate, CandidateResponse, CandidateUpdate, CandidatePatch,
    CandidateNoteCreate, CandidateNoteResponse
)
from services.api.database import (
    get_all_candidates_from_db, get_candidate_from_db, create_candidate_in_db,
    update_candidate_in_db, create_candidate_note_in_db, get_candidate_notes_from_db,
    delete_candidate_note_from_db
)
from services.api.routes.auth import get_current_user

router = APIRouter(prefix="/candidates", tags=["candidates"])

@router.get("/", response_model=List[CandidateResponse])
def get_candidates(
    status: Optional[str] = FastAPIQuery(None),
    stage: Optional[str] = FastAPIQuery(None),
    current_user: dict = Depends(get_current_user)
):
    return get_all_candidates_from_db(status=status, stage=stage)

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, current_user: dict = Depends(get_current_user)):
    candidate = get_candidate_from_db(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.post("/", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, current_user: dict = Depends(get_current_user)):
    return create_candidate_in_db(candidate.dict())

@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: int, candidate: CandidateUpdate, current_user: dict = Depends(get_current_user)):
    existing = get_candidate_from_db(candidate_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return update_candidate_in_db(candidate_id, candidate.dict(exclude_unset=True))

@router.patch("/{candidate_id}", response_model=CandidateResponse)
def patch_candidate(candidate_id: int, candidate: CandidatePatch, current_user: dict = Depends(get_current_user)):
    existing = get_candidate_from_db(candidate_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return update_candidate_in_db(candidate_id, candidate.dict(exclude_unset=True))

@router.get("/{candidate_id}/notes", response_model=List[CandidateNoteResponse])
def get_candidate_notes(candidate_id: int, current_user: dict = Depends(get_current_user)):
    return get_candidate_notes_from_db(candidate_id)

@router.post("/{candidate_id}/notes", response_model=CandidateNoteResponse)
def add_candidate_note(candidate_id: int, note: CandidateNoteCreate, current_user: dict = Depends(get_current_user)):
    return create_candidate_note_in_db(candidate_id, note.dict())

@router.delete("/{candidate_id}/notes/{note_id}", status_code=204)
def delete_candidate_note(candidate_id: int, note_id: int, current_user: dict = Depends(get_current_user)):
    success = delete_candidate_note_from_db(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
