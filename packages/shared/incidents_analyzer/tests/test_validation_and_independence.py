"""The shared package: the CSV validation of the first project, and that it stays shareable."""

import ast
import sys
from pathlib import Path

from incidents_analyzer import analyze, contract, read_rows, validate_record
from conftest import CSV

PACKAGE = Path(__file__).resolve().parents[1] / "incidents_analyzer"


def test_the_csv_of_the_context_gives_the_expected_report():
    result = analyze(read_rows(str(CSV)), source_name="incidents-nexova.csv")
    assert (result.total_records, result.valid_records, result.invalid_records) == (100, 96, 4)
    assert result.status_counts == {"OPEN": 27, "CLOSED": 56, "DISCARDED": 13}
    assert result.category_counts == {"TECHNICAL": 28, "BILLING": 18, "ACCESS": 21, "HR_QUERY": 17, "COMPLAINT": 12}
    assert result.satisfaction.average == 3.84


def test_validate_record_applies_the_contract_limits(row):
    assert validate_record(row) == []
    assert "invalid_description" in validate_record({**row, "description": "x" * (contract.DESCRIPTION_MIN - 1)})
    assert validate_record({**row, "agent_id": "AGT-1"}) == ["invalid_or_missing_agent_id"]


def test_the_package_uses_the_standard_library_only():
    """So the CLI scripts can use it without installing the API's dependencies, and the API
    does not pull anything extra. Everything it imports is stdlib or inside the package."""
    stdlib = set(sys.stdlib_module_names)
    offenders = []
    for path in PACKAGE.glob("*.py"):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            modules = []
            if isinstance(node, ast.Import):
                modules = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                modules = [node.module]
            offenders += [f"{path.name}: {m}" for m in modules if m.split(".")[0] not in stdlib]
    assert offenders == []


def test_the_package_is_installed_from_this_repository():
    assert Path(contract.__file__).resolve().parent == PACKAGE
    assert contract.CONTRACT_PATH.resolve() == PACKAGE.parents[1] / "incidents" / "contract.json"
