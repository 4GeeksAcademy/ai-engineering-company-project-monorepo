from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_SERVICES_API_DIR = Path(__file__).resolve().parents[1] / "services" / "api"
_MODULE_NAME = "_services_api_app"


def _load_services_api_app():
    if _MODULE_NAME in sys.modules:
        return sys.modules[_MODULE_NAME].app

    if str(_SERVICES_API_DIR) not in sys.path:
        sys.path.insert(0, str(_SERVICES_API_DIR))

    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _SERVICES_API_DIR / "app.py")
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load FastAPI app from {_SERVICES_API_DIR / 'app.py'}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module.app


app = _load_services_api_app()
