from __future__ import annotations

import csv
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ANALYZE = REPO_ROOT / "scripts" / "analyze.py"
REQUIRED = [
    "incident_id",
    "date",
    "location_id",
    "category",
    "description",
    "status",
    "customer_id",
    "satisfaction_score",
    "reporter_id",
]


def _run_analyze(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(ANALYZE), *args],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(REPO_ROOT)},
    )


class AnalyzeScriptErrorHandlingTests(unittest.TestCase):
    def test_missing_input_exits_nonzero_on_stderr(self) -> None:
        result = _run_analyze("scripts/does-not-exist.csv")
        self.assertEqual(result.returncode, 1)
        self.assertIn("not found", result.stderr.lower())
        self.assertEqual(result.stdout.strip(), "")

    def test_empty_input_exits_nonzero_on_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            empty = Path(tmp) / "empty.csv"
            empty.write_text("", encoding="utf-8")
            result = _run_analyze(str(empty), "--output", str(Path(tmp) / "out.csv"))
        self.assertEqual(result.returncode, 1)
        self.assertIn("empty", result.stderr.lower())

    def test_malformed_header_exits_nonzero_on_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bad.csv"
            bad.write_text("not_a_real_column\nvalue\n", encoding="utf-8")
            result = _run_analyze(str(bad), "--output", str(Path(tmp) / "out.csv"))
        self.assertEqual(result.returncode, 1)
        self.assertIn("missing required columns", result.stderr.lower())

    def test_header_only_exits_nonzero_on_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            header_only = Path(tmp) / "header.csv"
            header_only.write_text(",".join(REQUIRED) + "\n", encoding="utf-8")
            result = _run_analyze(str(header_only), "--output", str(Path(tmp) / "out.csv"))
        self.assertEqual(result.returncode, 1)
        self.assertIn("no data rows", result.stderr.lower())

    def test_valid_company_csv_exports(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "results.csv"
            result = _run_analyze(
                "scripts/incidents-COMPANY.csv",
                "--output",
                str(out),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(out.exists())
            with out.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertGreater(len(rows), 0)
            self.assertIn("Incident Analysis Summary", result.stdout)


class NightlyExportInputChecksTests(unittest.TestCase):
    def test_invalid_date_exits_nonzero_on_stderr(self) -> None:
        result = subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts" / "nightly_export.py"), "18-09-2026"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": str(REPO_ROOT)},
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("YYYY-MM-DD", result.stderr)
        self.assertNotIn("YYYY-MM-DD", result.stdout)


if __name__ == "__main__":
    unittest.main()
