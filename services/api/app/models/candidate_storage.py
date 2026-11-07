"""SQL storage for `records` + `candidate_notes` — migrated from TinyDB.

See `user_storage.py`'s module docstring for the general rationale. Both
tables already used a string UUID `id` in TinyDB, so no ID remapping is
needed. `candidate_notes.record_id` becomes a real FK with
`ON DELETE CASCADE`, replacing the manual cascade-delete that
`app/services/records.py` used to do in Python.
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table, Uuid

metadata = MetaData()

records_table = Table(
    "records",
    metadata,
    Column("id", Uuid(as_uuid=False), primary_key=True),
    Column("full_name", String, nullable=False),
    Column("email", String, nullable=False),
    Column("phone", String, nullable=True),
    Column("position", String, nullable=False),
    Column("linkedin_url", String, nullable=True),
    Column("cv_url", String, nullable=True),
    Column("status", String, nullable=False),
    Column("stage", String, nullable=False),
    Column("experience_years", Integer, nullable=False),
    Column("applied_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)

candidate_notes_table = Table(
    "candidate_notes",
    metadata,
    Column("id", Uuid(as_uuid=False), primary_key=True),
    Column("record_id", Uuid(as_uuid=False), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("content", String, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


class RecordRow(TypedDict):
    id: str
    full_name: str
    email: str
    phone: str | None
    position: str
    linkedin_url: str | None
    cv_url: str | None
    status: str
    stage: str
    experience_years: int
    applied_at: Any
    updated_at: Any


class CandidateNoteRow(TypedDict):
    id: str
    record_id: str
    content: str
    created_at: Any
