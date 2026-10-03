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


def test_central_is_normalised_whatever_its_case():
    assert rules.normalize_branch("Central", "customer") == "central"
    assert rules.normalize_branch("CENTRAL", None) == "central"
    assert rules.normalize_branch("Valencia Centro", "internal") == "Valencia Centro"


def test_an_incident_from_a_branch_must_name_it():
    assert rules.normalize_branch("Valencia", "branch") == "Valencia"
    with pytest.raises(ValueError, match="must name it"):
        rules.normalize_branch("central", "branch")
    with pytest.raises(ValueError):
        rules.normalize_branch("CENTRAL", "branch")
