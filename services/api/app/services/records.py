"""Candidate Records service layer over SQL (Postgres/Supabase).

Migrated from TinyDB — see app/models/candidate_storage.py. Manages
hiring pipeline candidates and their notes. The manual cascade-delete of
notes that TinyDB needed is now backed by a real `ON DELETE CASCADE` FK
(`candidate_notes.record_id` -> `records.id`) — the explicit delete call
below is kept anyway so behavior doesn't depend on that constraint
existing in every environment.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select, update
from sqlmodel import Session

from app.core.database import engine
from app.models.candidate_storage import candidate_notes_table, records_table
from app.models.schemas import (
    CandidateNoteCreate,
    CandidateStage,
    CandidateStatus,
    RecordCreate,
    RecordPatch,
    RecordUpdate,
)


def _get_session() -> Session:
    return Session(engine)


def _build_record_response(row, notes_count: int = 0) -> dict:
    """Assemble the public record payload."""
    return {
        "id": row.id,
        "full_name": row.full_name,
        "email": row.email,
        "phone": row.phone,
        "position": row.position,
        "linkedin_url": row.linkedin_url,
        "cv_url": row.cv_url,
        "status": row.status,
        "stage": row.stage,
        "experience_years": row.experience_years,
        "notes_count": notes_count,
        "applied_at": row.applied_at,
        "updated_at": row.updated_at,
    }


def _notes_count(db: Session, record_id: str) -> int:
    return db.execute(
        select(func.count()).select_from(candidate_notes_table).where(candidate_notes_table.c.record_id == record_id)
    ).scalar_one()


def create_record(payload: RecordCreate) -> dict:
    """Create a candidate record."""
    now = datetime.now(timezone.utc)
    record_id = str(uuid.uuid4())

    with _get_session() as db:
        db.execute(
            records_table.insert().values(
                id=record_id,
                full_name=payload.full_name,
                email=payload.email,
                phone=payload.phone,
                position=payload.position,
                linkedin_url=payload.linkedin_url,
                cv_url=payload.cv_url,
                status=CandidateStatus.RECEIVED.value,
                stage=CandidateStage.PENDING.value,
                experience_years=payload.experience_years,
                applied_at=now,
                updated_at=now,
            )
        )
        db.commit()
        row = db.execute(select(records_table).where(records_table.c.id == record_id)).one()
        return _build_record_response(row)


def list_records(
    page: int = 1, limit: int = 20, search: str | None = None
) -> tuple[list[dict], int]:
    """Return paginated records with optional search."""
    with _get_session() as db:
        stmt = select(records_table)
        count_stmt = select(func.count()).select_from(records_table)

        if search:
            needle = f"%{search.lower()}%"
            search_filter = (
                func.lower(records_table.c.full_name).like(needle)
                | func.lower(records_table.c.email).like(needle)
                | func.lower(records_table.c.position).like(needle)
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        total = db.execute(count_stmt).scalar_one()

        stmt = stmt.order_by(records_table.c.updated_at.desc()).offset((page - 1) * limit).limit(limit)
        rows = db.execute(stmt).all()

        return [_build_record_response(row, _notes_count(db, row.id)) for row in rows], total


def get_record_by_id(record_id: str) -> dict | None:
    """Return a single record by id, or None."""
    with _get_session() as db:
        row = db.execute(select(records_table).where(records_table.c.id == record_id)).first()
        if row is None:
            return None
        return _build_record_response(row, _notes_count(db, record_id))


def update_record(record_id: str, payload: RecordUpdate) -> dict | None:
    """Update all fields of a record. Returns None if not found."""
    with _get_session() as db:
        existing = db.execute(select(records_table.c.id).where(records_table.c.id == record_id)).first()
        if existing is None:
            return None

        now = datetime.now(timezone.utc)
        db.execute(
            update(records_table)
            .where(records_table.c.id == record_id)
            .values(
                full_name=payload.full_name,
                email=payload.email,
                phone=payload.phone,
                position=payload.position,
                linkedin_url=payload.linkedin_url,
                cv_url=payload.cv_url,
                experience_years=payload.experience_years,
                updated_at=now,
            )
        )
        db.commit()

        row = db.execute(select(records_table).where(records_table.c.id == record_id)).one()
        return _build_record_response(row, _notes_count(db, record_id))


def patch_record(record_id: str, payload: RecordPatch) -> dict | None:
    """Partially update a record (status/stage). Returns None if not found."""
    with _get_session() as db:
        existing = db.execute(select(records_table.c.id).where(records_table.c.id == record_id)).first()
        if existing is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        if "status" in data and data["status"] is not None:
            data["status"] = data["status"].value
        if "stage" in data and data["stage"] is not None:
            data["stage"] = data["stage"].value
        data["updated_at"] = datetime.now(timezone.utc)

        db.execute(update(records_table).where(records_table.c.id == record_id).values(**data))
        db.commit()

        row = db.execute(select(records_table).where(records_table.c.id == record_id)).one()
        return _build_record_response(row, _notes_count(db, record_id))


def delete_record(record_id: str) -> bool:
    """Delete a record and its notes. Returns False if not found."""
    with _get_session() as db:
        existing = db.execute(select(records_table.c.id).where(records_table.c.id == record_id)).first()
        if existing is None:
            return False

        db.execute(delete(records_table).where(records_table.c.id == record_id))
        # Cascade: also handled by ON DELETE CASCADE, kept explicit too
        # (see module docstring).
        db.execute(delete(candidate_notes_table).where(candidate_notes_table.c.record_id == record_id))
        db.commit()
        return True


# ── Notes ──────────────────────────────────────────────────


def get_notes_by_record_id(record_id: str) -> list[dict]:
    """Return all notes for a record, newest first."""
    with _get_session() as db:
        rows = db.execute(
            select(candidate_notes_table)
            .where(candidate_notes_table.c.record_id == record_id)
            .order_by(candidate_notes_table.c.created_at.desc())
        ).all()
        return [
            {"id": row.id, "record_id": row.record_id, "content": row.content, "created_at": row.created_at}
            for row in rows
        ]


def create_note(record_id: str, payload: CandidateNoteCreate) -> dict:
    """Create a note for a record."""
    now = datetime.now(timezone.utc)
    note_id = str(uuid.uuid4())

    with _get_session() as db:
        db.execute(
            candidate_notes_table.insert().values(
                id=note_id, record_id=record_id, content=payload.content, created_at=now
            )
        )
        db.commit()
        row = db.execute(select(candidate_notes_table).where(candidate_notes_table.c.id == note_id)).one()
        return {"id": row.id, "record_id": row.record_id, "content": row.content, "created_at": row.created_at}


def delete_note(note_id: str) -> bool:
    """Delete a note. Returns False if not found."""
    with _get_session() as db:
        existing = db.execute(
            select(candidate_notes_table.c.id).where(candidate_notes_table.c.id == note_id)
        ).first()
        if existing is None:
            return False

        db.execute(delete(candidate_notes_table).where(candidate_notes_table.c.id == note_id))
        db.commit()
        return True
