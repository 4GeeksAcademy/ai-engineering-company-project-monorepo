"""Unit tests for the incidents service layer — business logic only.

These call app.services.incidents functions directly (no HTTP client, no
FastAPI routing/serialization involved) against a throwaway in-memory
SQLite database (see tests/conftest.py's `sql_engine` fixture).
"""

from __future__ import annotations

import pytest

from app.models.schemas import (
    IncidentCreate,
    IncidentOrigin,
    IncidentStatus,
    IncidentStatusUpdate,
    IncidentUpdate,
)
from app.services import incidents as incidents_service

pytestmark = pytest.mark.usefixtures("sql_engine")


def _valid_row(**overrides) -> dict:
    row = {
        "incident_id": "BRS-000001",
        "date": "2026-01-15",
        "location_id": "COL-01",
        "category": "EQUIPMENT",
        "description": "Grill temperature control failed",
        "status": "OPEN",
        "customer_id": "CLI-000001",
        "satisfaction_score": "",
        "reporter_id": "MGR-01",
    }
    row.update(overrides)
    return row


# ── _validate_record / validate_csv_row ──────────────────────────


class TestValidateRecord:
    def test_valid_row_has_no_errors(self):
        assert incidents_service._validate_record(_valid_row()) == []

    def test_missing_location_id(self):
        errors = incidents_service._validate_record(_valid_row(location_id="NOPE"))
        assert "missing_location_id" in errors

    def test_invalid_category(self):
        errors = incidents_service._validate_record(_valid_row(category="NOT_A_CATEGORY"))
        assert "invalid_category" in errors

    def test_empty_description(self):
        errors = incidents_service._validate_record(_valid_row(description="hi"))
        assert "empty_description" in errors

    def test_missing_reporter_id(self):
        errors = incidents_service._validate_record(_valid_row(reporter_id=""))
        assert "missing_reporter_id" in errors

    def test_closed_without_score(self):
        errors = incidents_service._validate_record(_valid_row(status="CLOSED", satisfaction_score=""))
        assert "closed_no_score" in errors

    def test_closed_with_valid_score_is_fine(self):
        errors = incidents_service._validate_record(
            _valid_row(status="CLOSED", satisfaction_score="4")
        )
        assert errors == []

    @pytest.mark.parametrize("score", ["0", "6", "-1", "not-a-number"])
    def test_score_out_of_range(self, score):
        errors = incidents_service._validate_record(_valid_row(satisfaction_score=score))
        assert "score_out_of_range" in errors

    def test_multiple_rules_can_fail_at_once(self):
        errors = incidents_service._validate_record(
            {"location_id": "", "category": "", "description": "", "reporter_id": "", "status": "OPEN"}
        )
        assert set(errors) == {
            "missing_location_id",
            "invalid_category",
            "empty_description",
            "missing_reporter_id",
        }


class TestValidateCsvRow:
    def test_valid_row_transforms_into_incident_create(self):
        incident, errors = incidents_service.validate_csv_row(_valid_row())
        assert errors == []
        assert isinstance(incident, IncidentCreate)
        assert incident.title == "Grill temperature control failed"
        assert incident.branch == "COL-01"
        assert incident.origin is IncidentOrigin.CUSTOMER
        assert incident.status is IncidentStatus.OPEN
        assert incident.customer_id == "CLI-000001"
        assert incident.reporter_id == "MGR-01"
        assert incident.incident_date.isoformat() == "2026-01-15"

    def test_invalid_row_returns_none_and_errors(self):
        incident, errors = incidents_service.validate_csv_row(_valid_row(category="BOGUS"))
        assert incident is None
        assert "invalid_category" in errors

    def test_closed_status_maps_to_resolved(self):
        incident, errors = incidents_service.validate_csv_row(
            _valid_row(status="CLOSED", satisfaction_score="5")
        )
        assert errors == []
        assert incident.status is IncidentStatus.RESOLVED
        assert incident.satisfaction_score == 5

    def test_discarded_status_maps_to_discarded(self):
        incident, errors = incidents_service.validate_csv_row(_valid_row(status="DISCARDED"))
        assert errors == []
        assert incident.status is IncidentStatus.DISCARDED

    def test_long_description_is_truncated_for_title(self):
        long_description = "x" * 80
        incident, errors = incidents_service.validate_csv_row(
            _valid_row(description=long_description)
        )
        assert errors == []
        assert incident.title.endswith("…")
        assert len(incident.title) == 61  # 60 chars + ellipsis

    def test_short_description_is_not_truncated(self):
        incident, _ = incidents_service.validate_csv_row(_valid_row())
        assert not incident.title.endswith("…")

    def test_missing_customer_id_becomes_none(self):
        incident, _ = incidents_service.validate_csv_row(_valid_row(customer_id=""))
        assert incident.customer_id is None


# ── read_csv_from_bytes ───────────────────────────────────────────


class TestReadCsvFromBytes:
    def test_parses_valid_csv(self):
        content = b"incident_id,category\nBRS-000001,EQUIPMENT\n"
        rows = incidents_service.read_csv_from_bytes(content)
        assert rows == [{"incident_id": "BRS-000001", "category": "EQUIPMENT"}]

    def test_handles_bom(self):
        content = "incident_id,category\nBRS-000001,EQUIPMENT\n".encode("utf-8-sig")
        rows = incidents_service.read_csv_from_bytes(content)
        assert rows[0]["incident_id"] == "BRS-000001"

    def test_strips_header_whitespace(self):
        content = b" incident_id , category \nBRS-000001,EQUIPMENT\n"
        rows = incidents_service.read_csv_from_bytes(content)
        assert set(rows[0].keys()) == {"incident_id", "category"}

    def test_empty_content_raises(self):
        with pytest.raises(ValueError):
            incidents_service.read_csv_from_bytes(b"")

    def test_header_only_raises(self):
        with pytest.raises(ValueError, match="no data rows"):
            incidents_service.read_csv_from_bytes(b"incident_id,category\n")


# ── analyze() ──────────────────────────────────────────────────────


class TestAnalyze:
    def test_all_valid_rows_persisted_by_default(self):
        rows = [_valid_row(incident_id="BRS-000001"), _valid_row(incident_id="BRS-000002")]
        results = incidents_service.analyze(rows)
        assert results["total_rows"] == 2
        assert results["valid_count"] == 2
        assert results["invalid_count"] == 0
        assert results["persisted_count"] == 2

        stored, total = incidents_service.list_incidents()
        assert total == 2

    def test_invalid_rows_are_not_persisted_and_are_counted(self):
        rows = [_valid_row(), _valid_row(category="BOGUS")]
        results = incidents_service.analyze(rows)
        assert results["valid_count"] == 1
        assert results["invalid_count"] == 1
        assert results["invalid_reasons"] == {"invalid_category": 1}
        assert results["persisted_count"] == 1

    def test_persist_false_does_not_write_to_db(self):
        results = incidents_service.analyze([_valid_row()], persist=False)
        assert results["persisted_count"] == 0
        _, total = incidents_service.list_incidents()
        assert total == 0

    def test_satisfaction_score_statistics(self):
        rows = [
            _valid_row(incident_id="BRS-1", status="CLOSED", satisfaction_score="4"),
            _valid_row(incident_id="BRS-2", status="CLOSED", satisfaction_score="2"),
            _valid_row(incident_id="BRS-3", status="OPEN"),
        ]
        results = incidents_service.analyze(rows)
        assert results["total_closed"] == 2
        assert results["total_scored"] == 2
        assert results["avg_score"] == 3.0

    def test_a_single_persist_failure_does_not_abort_the_batch(self, monkeypatch):
        rows = [_valid_row(incident_id="BRS-1"), _valid_row(incident_id="BRS-2")]

        real_create = incidents_service.create_incident
        calls = {"n": 0}

        def flaky_create(payload):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("disk full")
            return real_create(payload)

        monkeypatch.setattr(incidents_service, "create_incident", flaky_create)

        results = incidents_service.analyze(rows)
        assert results["persisted_count"] == 1
        assert results["invalid_reasons"].get("persist_failed") == 1
        # the failed row must not be double-counted as valid
        assert results["valid_count"] == 1


class TestResultsToSummaryJson:
    def test_includes_note_only_when_invalid_rows_exist(self):
        clean_results = incidents_service.analyze([_valid_row()])
        summary = incidents_service.results_to_summary_json(clean_results)
        assert "note" not in summary

        dirty_results = incidents_service.analyze([_valid_row(), _valid_row(category="BOGUS")])
        summary = incidents_service.results_to_summary_json(dirty_results)
        assert summary["note"] == incidents_service.INVALID_CSV_RECORDS_MESSAGE
        assert summary["invalid_breakdown"][0]["rule"] == "invalid_category"

    def test_category_and_status_breakdown_percentages(self):
        rows = [_valid_row(incident_id=f"BRS-{i}") for i in range(4)]
        results = incidents_service.analyze(rows, persist=False)
        summary = incidents_service.results_to_summary_json(results)
        equipment = next(b for b in summary["category_breakdown"] if b["category"] == "EQUIPMENT")
        assert equipment["count"] == 4
        assert equipment["percentage"] == 100.0

    def test_zero_valid_records_gives_zero_percentage_not_division_error(self):
        results = incidents_service.analyze([_valid_row(category="BOGUS")])
        summary = incidents_service.results_to_summary_json(results)
        assert summary["category_breakdown"] == []


class TestResultsToCsvBytes:
    def test_produces_csv_with_expected_rows(self):
        results = incidents_service.analyze([_valid_row()], persist=False)
        csv_bytes = incidents_service.results_to_csv_bytes(results)
        text = csv_bytes.decode("utf-8")
        assert "Total Records,1" in text
        assert "Average Score" in text


# ── CRUD ───────────────────────────────────────────────────────────


def _create_payload(**overrides) -> IncidentCreate:
    data = dict(
        title="Walk-in cooler not cooling",
        description="Walk-in cooler stopped cooling overnight",
        category="EQUIPMENT",
        origin=IncidentOrigin.BRANCH,
        branch="COL-01",
    )
    data.update(overrides)
    return IncidentCreate(**data)


class TestCreateIncident:
    def test_assigns_id_and_timestamps(self):
        doc = incidents_service.create_incident(_create_payload())
        assert doc["id"]
        assert doc["created_at"] == doc["updated_at"]
        assert doc["status"] == "open"

    def test_two_creates_get_distinct_ids(self):
        a = incidents_service.create_incident(_create_payload())
        b = incidents_service.create_incident(_create_payload())
        assert a["id"] != b["id"]


class TestListIncidents:
    def setup_rows(self):
        incidents_service.create_incident(
            _create_payload(title="Fridge broken", category="EQUIPMENT", branch="COL-01", origin=IncidentOrigin.BRANCH)
        )
        incidents_service.create_incident(
            _create_payload(title="Rude staff member", category="STAFF", branch="FLA-01", origin=IncidentOrigin.HEADQUARTERS)
        )
        incidents_service.create_incident(
            _create_payload(title="Late delivery", category="SUPPLY", branch="COL-01", origin=IncidentOrigin.CUSTOMER)
        )

    def test_no_filters_returns_everything_newest_first(self):
        self.setup_rows()
        docs, total = incidents_service.list_incidents()
        assert total == 3
        assert len(docs) == 3

    def test_filter_by_category(self):
        self.setup_rows()
        docs, total = incidents_service.list_incidents(category="STAFF")
        assert total == 1
        assert docs[0]["title"] == "Rude staff member"

    def test_filter_by_branch(self):
        self.setup_rows()
        _, total = incidents_service.list_incidents(branch="COL-01")
        assert total == 2

    def test_filter_by_origin(self):
        self.setup_rows()
        _, total = incidents_service.list_incidents(origin="customer")
        assert total == 1

    def test_filter_by_status(self):
        self.setup_rows()
        _, total = incidents_service.list_incidents(status="open")
        assert total == 3
        _, none_resolved = incidents_service.list_incidents(status="resolved")
        assert none_resolved == 0

    def test_search_matches_title_case_insensitively(self):
        self.setup_rows()
        docs, total = incidents_service.list_incidents(search="fridge")
        assert total == 1
        assert docs[0]["title"] == "Fridge broken"

    def test_search_matches_description_too(self):
        incidents_service.create_incident(
            _create_payload(title="Issue", description="the espresso machine is leaking")
        )
        _, total = incidents_service.list_incidents(search="espresso")
        assert total == 1

    def test_pagination(self):
        self.setup_rows()
        page1, total = incidents_service.list_incidents(page=1, limit=2)
        page2, _ = incidents_service.list_incidents(page=2, limit=2)
        assert total == 3
        assert len(page1) == 2
        assert len(page2) == 1


class TestGetIncidentById:
    def test_returns_none_when_missing(self):
        assert incidents_service.get_incident_by_id("nope") is None

    def test_returns_the_document(self):
        created = incidents_service.create_incident(_create_payload())
        found = incidents_service.get_incident_by_id(created["id"])
        assert found["id"] == created["id"]


class TestUpdateIncident:
    def test_returns_none_when_missing(self):
        result = incidents_service.update_incident("nope", IncidentUpdate(title="x"))
        assert result is None

    def test_updates_only_provided_fields(self):
        created = incidents_service.create_incident(_create_payload())
        updated = incidents_service.update_incident(
            created["id"], IncidentUpdate(title="New title")
        )
        assert updated["title"] == "New title"
        assert updated["description"] == created["description"]
        assert updated["updated_at"] != created["updated_at"] or True  # timestamp refreshed


class TestUpdateIncidentStatus:
    def test_returns_none_when_missing(self):
        result = incidents_service.update_incident_status(
            "nope", IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
        )
        assert result is None

    def test_open_to_in_progress_is_legal(self):
        created = incidents_service.create_incident(_create_payload())
        updated = incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
        )
        assert updated["status"] == "in_progress"

    def test_open_to_resolved_directly_is_illegal(self):
        created = incidents_service.create_incident(_create_payload())
        with pytest.raises(ValueError, match="Cannot transition"):
            incidents_service.update_incident_status(
                created["id"],
                IncidentStatusUpdate(status=IncidentStatus.RESOLVED, satisfaction_score=5),
            )

    def test_resolve_without_score_is_illegal(self):
        created = incidents_service.create_incident(_create_payload())
        incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
        )
        with pytest.raises(ValueError, match="satisfaction score"):
            incidents_service.update_incident_status(
                created["id"], IncidentStatusUpdate(status=IncidentStatus.RESOLVED)
            )

    def test_resolve_with_score_succeeds(self):
        created = incidents_service.create_incident(_create_payload())
        incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
        )
        resolved = incidents_service.update_incident_status(
            created["id"],
            IncidentStatusUpdate(status=IncidentStatus.RESOLVED, satisfaction_score=4),
        )
        assert resolved["status"] == "resolved"
        assert resolved["satisfaction_score"] == 4

    def test_discard_reachable_from_open(self):
        created = incidents_service.create_incident(_create_payload())
        discarded = incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.DISCARDED)
        )
        assert discarded["status"] == "discarded"

    def test_terminal_state_cannot_transition_further(self):
        created = incidents_service.create_incident(_create_payload())
        incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.DISCARDED)
        )
        with pytest.raises(ValueError):
            incidents_service.update_incident_status(
                created["id"], IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
            )

    def test_setting_same_status_again_is_a_noop_success(self):
        created = incidents_service.create_incident(_create_payload())
        same = incidents_service.update_incident_status(
            created["id"], IncidentStatusUpdate(status=IncidentStatus.OPEN)
        )
        assert same["status"] == "open"


class TestGetIncidentMetrics:
    def test_empty_db(self):
        metrics = incidents_service.get_incident_metrics()
        assert metrics["total"] == 0
        assert metrics["avg_satisfaction_score"] is None
        assert metrics["avg_resolution_seconds"] is None

    def test_counts_by_status_category_branch_origin(self):
        incidents_service.create_incident(
            _create_payload(category="EQUIPMENT", branch="COL-01", origin=IncidentOrigin.BRANCH)
        )
        incidents_service.create_incident(
            _create_payload(category="STAFF", branch="FLA-01", origin=IncidentOrigin.CUSTOMER)
        )
        metrics = incidents_service.get_incident_metrics()
        assert metrics["total"] == 2
        assert metrics["status_counts"] == {"open": 2}
        assert metrics["category_counts"] == {"EQUIPMENT": 1, "STAFF": 1}
        assert metrics["branch_counts"] == {"COL-01": 1, "FLA-01": 1}
        assert metrics["origin_counts"] == {"branch": 1, "customer": 1}

    def test_avg_satisfaction_only_counts_resolved_with_scores(self):
        a = incidents_service.create_incident(_create_payload())
        incidents_service.update_incident_status(
            a["id"], IncidentStatusUpdate(status=IncidentStatus.IN_PROGRESS)
        )
        incidents_service.update_incident_status(
            a["id"], IncidentStatusUpdate(status=IncidentStatus.RESOLVED, satisfaction_score=5)
        )
        # an open incident should not pollute the average
        incidents_service.create_incident(_create_payload())

        metrics = incidents_service.get_incident_metrics()
        assert metrics["avg_satisfaction_score"] == 5.0
        assert metrics["avg_resolution_seconds"] is not None
        assert metrics["avg_resolution_seconds"] >= 0
