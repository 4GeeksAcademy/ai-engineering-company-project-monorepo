"""Structure and formatter checks for the Monday leadership n8n export."""
from __future__ import annotations

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = REPO_ROOT / "workflows" / "validate_weekly_report_workflow.py"


def _validator():
    spec = importlib.util.spec_from_file_location("validate_weekly_report_workflow", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_monday_leadership_workflow_is_importable():
    errors = _validator().validate()
    assert errors == []
