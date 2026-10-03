import pytest

from incidents_analyzer import contract, read_rows, transform, validate_record
from conftest import CSV


def test_status_map_covers_the_csv_vocabulary():
    assert [transform.map_status(s) for s in ("OPEN", "CLOSED", "DISCARDED")] == ["open", "resolved", "discarded"]
    assert transform.map_status(" CLOSED ") == "resolved"
    with pytest.raises(KeyError):
        transform.map_status("PENDING")


def test_category_map_is_the_one_of_the_context():
    assert {c: transform.map_category(c) for c in contract.CSV_CATEGORIES} == {
        "TECHNICAL": "technical_failure",
        "BILLING": "process_error",
        "ACCESS": "technical_failure",
        "HR_QUERY": "process_error",
        "COMPLAINT": "client_complaint",
    }
    with pytest.raises(KeyError):
        transform.map_category("technical_failure")  # the model's names are not CSV categories


def test_title_is_the_first_120_characters_trimmed():
    assert transform.title_from_description("Short one") == "Short one"
    assert transform.title_from_description("  padded  ") == "padded"
    text = "x" * 119 + " tail that does not fit"
    assert transform.title_from_description(text) == "x" * 119  # cut at 120, then trimmed
    assert len(transform.title_from_description("word " * 60)) <= contract.TITLE_MAX
    assert transform.title_from_description(" " * 130 + "text") == ""  # nothing left: the row is discarded


def test_date_becomes_created_at_at_midnight_utc():
    assert transform.created_at_from_date("2024-03-05").isoformat() == "2024-03-05T00:00:00+00:00"
    with pytest.raises(ValueError):
        transform.created_at_from_date("05/03/2024")


def test_branch_comes_from_a_location_column_or_defaults_to_central(row):
    assert transform.branch_from_row(row) == "central"
    assert transform.branch_from_row({**row, "ubicacion": " Valencia — Operaciones "}) == "valencia_operations"
    assert transform.branch_from_row({**row, "location": "miami_office", "ubicacion": "remote"}) == "miami_office"
    assert transform.branch_from_row({**row, "location": "  "}) == "central"
    assert transform.branch_from_row({**row, "location": "Lisbon"}) is None


def test_source_key_is_the_ticket_id_or_title_and_date(row):
    assert transform.source_key(row) == "NXV-000500"
    keyless = {**row, "ticket_id": " "}
    assert transform.source_key(keyless) == "Invoice shows the wrong VAT|2024-03-05T00:00:00+00:00"
    assert transform.source_key({**keyless, "date": "2024-03-06"}) != transform.source_key(keyless)


def test_a_valid_row_becomes_customer_incident_fields(row):
    assert transform.import_problems(row) == []
    fields = transform.to_incident_fields({**row, "location": "Miami Office"})
    assert "id" not in fields and fields["source_key"] == "NXV-000500"  # the ticket_id is not part of the incident
    assert (fields["title"], fields["description"]) == (row["description"], row["description"])
    assert (fields["status"], fields["category"], fields["origin"], fields["branch"]) == ("resolved", "process_error", "customer", "miami_office")
    assert fields["created_at"].isoformat() == "2024-03-05T00:00:00+00:00"
    assert (fields["client_company"], fields["agent_id"], fields["satisfaction_score"]) == ("Acme", "AGT-04", 4)


def test_an_open_row_keeps_no_score(row):
    fields = transform.to_incident_fields({**row, "status": "OPEN", "satisfaction_score": "5"})
    assert fields["status"] == "open" and fields["satisfaction_score"] is None


@pytest.mark.parametrize(
    "overrides,rule",
    [
        ({"client_company": ""}, "missing_client_company"),
        ({"category": "SPAM"}, "invalid_or_missing_category"),
        ({"description": "abc"}, "invalid_description"),
        ({"agent_id": "007"}, "invalid_or_missing_agent_id"),
        ({"customer_email": "nope"}, "invalid_or_missing_email"),
        ({"satisfaction_score": ""}, "closed_without_score"),
        ({"satisfaction_score": "9"}, "score_out_of_range"),
        ({"status": "PENDING"}, "invalid_or_missing_status"),  # what the CSV rules do not cover
        ({"status": ""}, "invalid_or_missing_status"),
        ({"date": "05/03/2024"}, "invalid_date"),
        ({"date": ""}, "invalid_date"),
        ({"description": " " * 130 + "text after the spaces"}, "empty_title"),
        ({"location": "Lisbon"}, "invalid_branch"),
    ],
)
def test_import_problems_names_the_broken_rule(row, overrides, rule):
    assert rule in transform.import_problems({**row, **overrides})


def test_import_problems_include_exactly_the_csv_validation(row):
    """The first group is not a second implementation: it is ``validate_record`` itself."""
    for overrides in ({"client_company": ""}, {"category": "x"}, {"agent_id": "1"}, {"satisfaction_score": "9"}):
        broken = {**row, **overrides}
        assert transform.import_problems(broken) == validate_record(broken) != []


def test_the_provided_csv_has_96_importable_rows_and_4_rejected():
    rows = read_rows(str(CSV))
    problems = [transform.import_problems(r) for r in rows]
    assert sum(1 for p in problems if not p) == 96
    assert [p for p in problems if p] == [
        ["missing_client_company"],
        ["invalid_or_missing_category"],
        ["invalid_or_missing_email"],
        ["closed_without_score"],
    ]
    fields = [transform.to_incident_fields(r) for r, p in zip(rows, problems) if not p]
    assert len({f["source_key"] for f in fields}) == 96
    assert {f["origin"] for f in fields} == {"customer"} and {f["branch"] for f in fields} == {"central"}
    assert {f["status"] for f in fields} == {"open", "resolved", "discarded"}
    assert all(0 < len(f["title"]) <= contract.TITLE_MAX for f in fields)
    # CONTEXT-nexova.es.md, "Valores esperados tras el seed"
    from collections import Counter
    assert Counter(f["status"] for f in fields) == {"open": 27, "resolved": 56, "discarded": 13}
    assert Counter(f["category"] for f in fields) == {"technical_failure": 49, "process_error": 35, "client_complaint": 12}
