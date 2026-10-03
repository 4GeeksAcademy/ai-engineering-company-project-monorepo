import pytest

from incidents_analyzer import contract, rules


@pytest.mark.parametrize(
    "status,expected",
    [
        ("open", ["in_progress", "discarded"]),
        ("in_progress", ["resolved", "discarded"]),
        ("resolved", []),
        ("discarded", []),
        ("OPEN", []),  # the CSV vocabulary is not a lifecycle status
        ("nonsense", []),
    ],
)
def test_allowed_transitions(status, expected):
    assert rules.allowed_transitions(status) == expected


def test_allowed_transitions_returns_a_copy():
    rules.allowed_transitions("open").append("resolved")
    assert rules.allowed_transitions("open") == ["in_progress", "discarded"]


def test_only_open_and_in_progress_are_editable():
    assert {s for s in contract.STATUSES if rules.is_editable(s)} == {"open", "in_progress"}
    assert not rules.is_editable("nonsense")


def test_resolved_and_discarded_are_final():
    finals = {s for s in contract.STATUSES if not rules.allowed_transitions(s)}
    assert finals == {"resolved", "discarded"}
    assert not any(rules.is_editable(s) for s in finals)


@pytest.mark.parametrize(
    "text,expected",
    [
        ("central", "central"),
        ("Central — Sede Valencia", "central"),
        ("  VALENCIA_OPERATIONS ", "valencia_operations"),
        ("Valencia — Operaciones", "valencia_operations"),
        ("miami office", "miami_office"),
        ("Miami Office", "miami_office"),
        ("remote", "remote"),
        ("Remoto (empleado sin sede fija)", "remote"),
        ("Valencia", None),  # ambiguous: neither `central` nor `valencia_operations`
        ("hq", None),
        ("", None),
    ],
)
def test_branch_value_resolves_a_value_or_a_display_name(text, expected):
    assert rules.branch_value(text) == expected


def test_there_are_exactly_four_offices_and_remote_is_not_central():
    assert contract.BRANCHES == ("central", "valencia_operations", "miami_office", "remote")
    assert len(set(contract.BRANCH_LABELS.values())) == 4
    assert rules.branch_value("remote") != rules.branch_value("central")
