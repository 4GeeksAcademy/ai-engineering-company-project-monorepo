"""Import-time sys.path setup for this pipeline's sibling modules.

The folder name (`weekly-location-performance`) has hyphens, matching the
kebab-case convention documented in data/pipelines/README.md ("sales-etl",
"customer-segmentation") — but a hyphenated directory can't be a Python
*package* (it isn't a valid module name), so sibling modules here (extract,
transform, load, notify, run_log, schema) can't import each other with
package-relative `from . import ...` syntax. Every module in this folder
instead does `import _pathsetup` before importing a sibling by its plain
module name (e.g. `import schema`) — inserting this directory onto
`sys.path` is enough for that to resolve, independent of the containing
folder's own name.

This repo's `app.*` package (services/api) is importable from any working
directory without extra setup: services/api is installed editable into its
own virtualenv (see services/api/.venv), so running these pipeline scripts
with that venv's Python (e.g. `services/api/.venv/bin/python flow.py`) is
enough for `from app.core.database import engine` to resolve.
"""

from __future__ import annotations

import sys
from pathlib import Path

_PIPELINE_DIR = Path(__file__).resolve().parent
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))
