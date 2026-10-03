#!/usr/bin/env python3
"""Run the HealthCore incident API on an uncommon port."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHARED = ROOT / "shared"
API_DIR = Path(__file__).resolve().parent
for path in (str(SHARED), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=43180, reload=False)
