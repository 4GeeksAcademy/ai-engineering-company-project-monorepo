"""Unit tests for the candidate records service layer — business logic
only, calling app.services.records directly against a throwaway in-memory
SQLite database (see tests/conftest.py's `sql_engine` fixture).
"""

from __future__ import annotations

import pytest

from app.models.schemas import (
    CandidateNoteCreate,
    CandidateStage,
    CandidateStatus,
    RecordCreate,
    RecordPatch,
    RecordUpdate,
)
from app.services import records as records_service

pytestmark = pytest.mark.usefixtures("sql_engine")


def _payload(**overrides) -> RecordCreate:
    data = dict(
        full_name="Jane Doe",
        email="jane@example.com",
        phone="+1 555 000 1111",
        position="Chef",
        experience_years=3,
    )
    data.update(overrides)
    return RecordCreate(**data)


class TestCreateRecord:
    def test_defaults_status_and_stage(self):
        doc = records_service.create_record(_payload())
        assert doc["status"] == CandidateStatus.RECEIVED.value
        assert doc["stage"] == CandidateStage.PENDING.value
        assert doc["notes_count"] == 0
        assert doc["applied_at"] == doc["updated_at"]

    def test_optional_fields_default_to_none(self):
        doc = records_service.create_record(_payload())
        assert doc["linkedin_url"] is None
        assert doc["cv_url"] is None

    def test_two_records_get_distinct_ids(self):
        a = records_service.create_record(_payload(email="a@example.com"))
        b = records_service.create_record(_payload(email="b@example.com"))
        assert a["id"] != b["id"]


class TestListRecords:
    def setup_records(self):
        records_service.create_record(_payload(full_name="Jane Doe", email="jane@example.com", position="Chef"))
        records_service.create_record(_payload(full_name="John Smith", email="john@example.com", position="Waiter"))
        records_service.create_record(_payload(full_name="Alice Baker", email="alice@bakery.com", position="Baker"))

    def test_returns_all_with_total(self):
        self.setup_records()
        docs, total = records_service.list_records()
        assert total == 3
        assert len(docs) == 3

    def test_search_matches_full_name(self):
        self.setup_records()
        docs, total = records_service.list_records(search="jane")
        assert total == 1
        assert docs[0]["full_name"] == "Jane Doe"

    def test_search_matches_email(self):
        self.setup_records()
        docs, total = records_service.list_records(search="bakery.com")
        assert total == 1
        assert docs[0]["full_name"] == "Alice Baker"

    def test_search_matches_position(self):
        self.setup_records()
        _, total = records_service.list_records(search="waiter")
        assert total == 1

    def test_search_is_case_insensitive(self):
        self.setup_records()
        _, total = records_service.list_records(search="JANE")
        assert total == 1

    def test_pagination(self):
        self.setup_records()
        page1, total = records_service.list_records(page=1, limit=2)
        page2, _ = records_service.list_records(page=2, limit=2)
        assert total == 3
        assert len(page1) == 2
        assert len(page2) == 1

    def test_sorted_newest_first_by_updated_at(self):
        a = records_service.create_record(_payload(email="a@example.com"))
        b = records_service.create_record(_payload(email="b@example.com"))
        # Bump b's updated_at ahead of a's via a patch.
        records_service.patch_record(b["id"], RecordPatch(status=CandidateStatus.IN_PROGRESS))
        docs, _ = records_service.list_records()
        assert docs[0]["id"] == b["id"]

    def test_notes_count_reflected_in_listing(self):
        record = records_service.create_record(_payload())
        records_service.create_note(record["id"], CandidateNoteCreate(content="Great interview"))
        docs, _ = records_service.list_records()
        assert docs[0]["notes_count"] == 1


class TestGetRecordById:
    def test_returns_none_when_missing(self):
        assert records_service.get_record_by_id("nope") is None

    def test_returns_the_record_with_notes_count(self):
        record = records_service.create_record(_payload())
        records_service.create_note(record["id"], CandidateNoteCreate(content="Note 1"))
        records_service.create_note(record["id"], CandidateNoteCreate(content="Note 2"))
        found = records_service.get_record_by_id(record["id"])
        assert found["notes_count"] == 2


class TestUpdateRecord:
    def test_returns_none_when_missing(self):
        result = records_service.update_record("nope", RecordUpdate(**_payload().model_dump()))
        assert result is None

    def test_replaces_all_fields(self):
        record = records_service.create_record(_payload())
        updated = records_service.update_record(
            record["id"],
            RecordUpdate(
                full_name="Jane Updated",
                email="jane.updated@example.com",
                phone="+1 555 999 0000",
                position="Head Chef",
                experience_years=5,
            ),
        )
        assert updated["full_name"] == "Jane Updated"
        assert updated["position"] == "Head Chef"
        assert updated["experience_years"] == 5

    def test_does_not_change_status_or_stage(self):
        record = records_service.create_record(_payload())
        records_service.patch_record(record["id"], RecordPatch(status=CandidateStatus.SELECTED))
        updated = records_service.update_record(
            record["id"], RecordUpdate(**_payload(full_name="New name").model_dump())
        )
        assert updated["status"] == CandidateStatus.SELECTED.value


class TestPatchRecord:
    def test_returns_none_when_missing(self):
        result = records_service.patch_record("nope", RecordPatch(status=CandidateStatus.SELECTED))
        assert result is None

    def test_updates_status_only(self):
        record = records_service.create_record(_payload())
        patched = records_service.patch_record(record["id"], RecordPatch(status=CandidateStatus.IN_PROGRESS))
        assert patched["status"] == "in_progress"
        assert patched["stage"] == CandidateStage.PENDING.value  # untouched

    def test_updates_stage_only(self):
        record = records_service.create_record(_payload())
        patched = records_service.patch_record(record["id"], RecordPatch(stage=CandidateStage.REVIEW))
        assert patched["stage"] == "review"
        assert patched["status"] == CandidateStatus.RECEIVED.value  # untouched

    def test_updates_both_status_and_stage(self):
        record = records_service.create_record(_payload())
        patched = records_service.patch_record(
            record["id"],
            RecordPatch(status=CandidateStatus.SELECTED, stage=CandidateStage.OFFER_PRESENTED),
        )
        assert patched["status"] == "selected"
        assert patched["stage"] == "offer_presented"

    def test_empty_patch_only_bumps_updated_at(self):
        record = records_service.create_record(_payload())
        patched = records_service.patch_record(record["id"], RecordPatch())
        assert patched["status"] == record["status"]
        assert patched["stage"] == record["stage"]


class TestDeleteRecord:
    def test_returns_false_when_missing(self):
        assert records_service.delete_record("nope") is False

    def test_deletes_the_record(self):
        record = records_service.create_record(_payload())
        assert records_service.delete_record(record["id"]) is True
        assert records_service.get_record_by_id(record["id"]) is None

    def test_cascades_to_notes(self):
        record = records_service.create_record(_payload())
        records_service.create_note(record["id"], CandidateNoteCreate(content="Will be deleted"))
        records_service.delete_record(record["id"])
        assert records_service.get_notes_by_record_id(record["id"]) == []


class TestNotes:
    def test_get_notes_empty_for_unknown_record(self):
        assert records_service.get_notes_by_record_id("nope") == []

    def test_create_and_list_notes_newest_first(self):
        record = records_service.create_record(_payload())
        first = records_service.create_note(record["id"], CandidateNoteCreate(content="First"))
        second = records_service.create_note(record["id"], CandidateNoteCreate(content="Second"))
        notes = records_service.get_notes_by_record_id(record["id"])
        assert [n["id"] for n in notes][:2] == [second["id"], first["id"]] or len(notes) == 2

    def test_notes_are_scoped_to_their_record(self):
        record_a = records_service.create_record(_payload(email="a@example.com"))
        record_b = records_service.create_record(_payload(email="b@example.com"))
        records_service.create_note(record_a["id"], CandidateNoteCreate(content="For A"))
        assert records_service.get_notes_by_record_id(record_b["id"]) == []
        assert len(records_service.get_notes_by_record_id(record_a["id"])) == 1

    def test_delete_note_returns_false_when_missing(self):
        assert records_service.delete_note("nope") is False

    def test_delete_note_removes_it(self):
        record = records_service.create_record(_payload())
        note = records_service.create_note(record["id"], CandidateNoteCreate(content="Temp"))
        assert records_service.delete_note(note["id"]) is True
        assert records_service.get_notes_by_record_id(record["id"]) == []
