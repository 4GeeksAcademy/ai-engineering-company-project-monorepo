#!/usr/bin/env python3
"""Ensure repo changes are accompanied by a memory-bank update."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

MEMORY_BANK = {
    "memory-bank/progress.md",
    "memory-bank/projectbrief.md",
    "memory-bank/techContext.md",
}

ALLOWED_WORKFLOW_FILES = {
    "AGENTS.md",
    ".agents/rules/UpdateMemoryBank.md",
    ".githooks/pre-commit",
    "scripts/check_memory_bank.py",
}


def git_output(*args: str) -> str:
    repo_root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def changed_files(mode: str) -> list[str]:
    if mode == "cached":
        stdout = git_output("diff", "--cached", "--name-only", "--diff-filter=ACMR")
    else:
        stdout = git_output("diff", "--name-only", "--diff-filter=ACMR", "HEAD")
    if not stdout:
        return []
    return [line.strip() for line in stdout.splitlines() if line.strip()]


def main() -> int:
    mode = "cached" if "--cached" in sys.argv[1:] else "working-tree"
    files = changed_files(mode)

    if not files:
        return 0

    if any(path in MEMORY_BANK for path in files):
        return 0

    non_memory_files = [
        path for path in files if path not in ALLOWED_WORKFLOW_FILES and path not in MEMORY_BANK
    ]

    if not non_memory_files:
        return 0

    print(
        "TrackFlow memory-bank guard failed: project changes were detected without a matching update to "
        "memory-bank/progress.md, memory-bank/projectbrief.md, or memory-bank/techContext.md.\n"
        "Changed files:\n- " + "\n- ".join(non_memory_files)
    )
    print("\nRequired action: update the memory bank before finalizing this change.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
