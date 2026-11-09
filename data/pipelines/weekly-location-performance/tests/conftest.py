"""Shared pytest setup for this pipeline's tests.

Adds the pipeline folder (one level up) to sys.path so tests can
`import extract`, `import transform`, etc. the same way the pipeline
modules import each other (see ../_pathsetup.py's docstring for why a
hyphenated folder can't be a real Python package).
"""

from __future__ import annotations

import sys
from pathlib import Path

_PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))
