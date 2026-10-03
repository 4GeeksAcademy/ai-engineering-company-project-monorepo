"""Architecture guard: the validation and rules of the incident domain live in packages/shared and are
reused by the script and the API, never copied. These checks read the source, so they keep guarding
the rule after the code changes. Also the shape of the monorepo."""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

import incidents_analyzer
from incidents_analyzer import contract

REPO = Path(__file__).resolve().parents[3]
SHARED = REPO / "packages" / "shared"
CSV = REPO / "data" / "raw" / "incidents-nexova.csv"
SKIP = {".venv", "node_modules", ".git", "__pycache__", "tests", ".next"}


def python_files(root: Path):
    for path in root.rglob("*.py"):
        if not SKIP & set(path.relative_to(root).parts):
            yield path


def imported_names(path: Path) -> set[str]:
    names = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.ImportFrom) and node.module and node.level == 0:  # relative imports stay inside the package
            names.add(node.module)
            names.update(f"{node.module}.{alias.name}" for alias in node.names)
        elif isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
    return names


# --- the monorepo keeps its shape ------------------------------------------------------------------

def test_the_monorepo_structure_is_kept():
    for folder in ("scripts", "services/api", "uis/backoffice", "packages/shared"):
        assert (REPO / folder).is_dir(), folder
    # shared code lives under packages/shared, not at the top level of packages/ nor in a service
    assert (SHARED / "incidents" / "contract.json").is_file()
    assert (SHARED / "incidents_analyzer" / "pyproject.toml").is_file()
    assert (SHARED / "types" / "incidents.ts").is_file()
    assert not (REPO / "packages" / "incidents_analyzer").exists()
    assert not (REPO / "services" / "api" / "incidents_analyzer").exists()
    assert (REPO / "scripts" / "analyze.py").is_file() and (REPO / "scripts" / "seed_incidents.py").is_file()


def test_the_installed_package_is_the_one_in_packages_shared():
    assert Path(incidents_analyzer.__file__).resolve().is_relative_to(SHARED.resolve())
    assert contract.CONTRACT_PATH.resolve() == (SHARED / "incidents" / "contract.json").resolve()


def test_the_api_and_the_scripts_depend_on_the_shared_package_by_path():
    pyproject = (REPO / "services" / "api" / "pyproject.toml").read_text(encoding="utf-8")
    assert "../../packages/shared/incidents_analyzer" in pyproject
    assert "packages/shared/incidents_analyzer" in (REPO / "services" / "api" / "requirements.txt").read_text(encoding="utf-8")
    assert "@repo/shared-types" in (REPO / "uis" / "backoffice" / "package.json").read_text(encoding="utf-8")


# --- the script and the API reuse it ---------------------------------------------------------------

def test_the_scripts_use_the_shared_validation():
    assert "incidents_analyzer" in imported_names(REPO / "scripts" / "analyze.py")
    seed = imported_names(REPO / "scripts" / "seed_incidents.py")
    assert "incidents_analyzer" in seed and any(name.startswith("incidents") for name in seed)


def test_the_api_uses_the_shared_validation_and_rules():
    used = {}
    for path in python_files(REPO / "services" / "api" / "incidents"):
        for name in imported_names(path):
            if name.startswith("incidents_analyzer"):
                used.setdefault(name, set()).add(path.name)
    assert "validate_record" in " ".join(used) or "incidents_analyzer.import_problems" in used or "incidents_analyzer.transform.import_problems" in used
    assert "seeding.py" in used["incidents_analyzer.transform.import_problems"]
    assert "incident_lifecycle.py" in used["incidents_analyzer.rules.allowed_transitions"]
    assert "incident_schemas.py" in used["incidents_analyzer.contract.CATEGORIES"]  # the categories of the model
    assert "incident_schemas.py" in used["incidents_analyzer.contract.BRANCHES"]  # and its four offices
    assert "service.py" in used["incidents_analyzer.analyze"] or "service.py" in used["incidents_analyzer"]


def test_the_script_and_the_api_validate_the_csv_identically():
    from incidents_analyzer import read_rows, validate_record
    from incidents_analyzer.transform import import_problems

    rows = read_rows(str(CSV))
    assert [import_problems(r) for r in rows] == [validate_record(r) for r in rows]  # nothing extra on this file


# --- nothing is copied -----------------------------------------------------------------------------

# A rule written out in the API or in a script instead of coming from the shared package.
_COPIES = [
    (re.compile(r"\^AGT-"), "agent id pattern"),
    (re.compile(r"\^NXV-"), "incident id pattern"),
    (re.compile(r"[\"']HR_QUERY[\"']"), "csv category list"),
    (re.compile(r"[\"']staff_issue[\"']"), "category list"),
    (re.compile(r"[\"']valencia_operations[\"']"), "branch list"),
    (re.compile(r"[\"']miami_office[\"']"), "branch list"),
    (re.compile(r"[\"']in_progress[\"']\s*:\s*\["), "transition table"),
    (re.compile(r"CSV_STATUS_MAP\s*=|STATUS_MAP\s*=\s*\{"), "status map"),
    (re.compile(r"TRANSITIONS\s*=\s*\{|ALLOWED\s*=\s*\{"), "transition table"),
]


def test_no_rule_is_copied_outside_the_shared_package():
    offenders = []
    for root in (REPO / "services" / "api", REPO / "scripts"):
        for path in python_files(root):
            text = path.read_text(encoding="utf-8")
            offenders += [f"{path.relative_to(REPO)}: {what}" for pattern, what in _COPIES if pattern.search(text)]
    assert offenders == []


def test_the_frontend_reads_the_same_contract_file():
    ts = (SHARED / "types" / "incidents.ts").read_text(encoding="utf-8")
    assert "../incidents/contract.json" in ts
    raw = json.loads((SHARED / "incidents" / "contract.json").read_text(encoding="utf-8"))
    assert raw["transitions"] == {k: list(v) for k, v in contract.TRANSITIONS.items()}
    # no component re-declares the statuses / transitions
    backoffice = REPO / "uis" / "backoffice" / "src"
    for path in backoffice.rglob("*.ts*"):
        text = path.read_text(encoding="utf-8")
        assert not re.search(r"in_progress:\s*\[", text), path
        assert not re.search(r"\^AGT-", text), path


def test_the_shared_package_does_not_depend_on_the_api():
    for path in (SHARED / "incidents_analyzer" / "incidents_analyzer").glob("*.py"):
        assert not any(name.split(".")[0] in {"incidents", "core", "services", "fastapi", "pydantic", "tinydb"} for name in imported_names(path)), path.name
