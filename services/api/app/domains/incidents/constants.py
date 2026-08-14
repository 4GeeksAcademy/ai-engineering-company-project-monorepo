"""
constants.py — Brasaland · Incident domain constants

Single source of truth for categories, statuses, branches and state transitions.
Reuses enum values from the analytics module so CSV analysis and CRUD share
the same vocabulary.
"""

from __future__ import annotations

from app.domains.analytics.incidents.analysis import VALID_CATEGORIES, VALID_STATUSES

# ---------------------------------------------------------------------------
# Categories (same as CSV analysis)
# ---------------------------------------------------------------------------
CATEGORY_LABELS: dict[str, str] = {
    "CUSTOMER_COMPLAINT": "Queja de cliente",
    "EQUIPMENT": "Falla de equipamiento",
    "SUPPLY": "Problema de abastecimiento",
    "FOOD_QUALITY": "Calidad de alimentos",
    "STAFF": "Incidente de personal",
}

# ---------------------------------------------------------------------------
# Statuses — CSV uses uppercase; API uses lowercase
# ---------------------------------------------------------------------------
# CSV values: OPEN, CLOSED, DISCARDED
# API lifecycle: open → in_progress → resolved | discarded

VALID_STATUSES_API = ("open", "in_progress", "resolved", "discarded")

STATUS_LABELS: dict[str, str] = {
    "open": "Abierto",
    "in_progress": "En progreso",
    "resolved": "Resuelto",
    "discarded": "Descartado",
}

# Map CSV uppercase status to API lowercase
CSV_STATUS_MAP: dict[str, str] = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

# ---------------------------------------------------------------------------
# Origins — where the incident was reported from
# ---------------------------------------------------------------------------
VALID_ORIGINS = ("api", "csv_import", "manual")

ORIGIN_LABELS: dict[str, str] = {
    "api": "API",
    "csv_import": "Importación CSV",
    "manual": "Manual",
}

# ---------------------------------------------------------------------------
# Branches — Brasaland locations (14 branches + headquarters)
# ---------------------------------------------------------------------------
BRANCH_MAP: dict[str, str] = {
    # Colombia branches
    "COL-01": "Brasaland Medellín Centro",
    "COL-02": "Brasaland El Poblado",
    "COL-03": "Brasaland Laureles",
    "COL-04": "Brasaland Envigado",
    "COL-05": "Brasaland Bucaramanga",
    "COL-06": "Brasaland Bogotá Norte",
    "COL-07": "Brasaland Bogotá Chapinero",
    "COL-08": "Brasaland Cali Granada",
    "COL-09": "Brasaland Barranquilla",
    "COL-10": "Brasaland Cartagena",
    # Florida branches
    "FLA-01": "Brasaland Brickell",
    "FLA-02": "Brasaland Wynwood",
    "FLA-03": "Brasaland Doral",
    "FLA-04": "Brasaland Orlando",
    # Headquarters
    "HQ-MDE": "Sede Central Medellín",
}

VALID_BRANCHES = tuple(BRANCH_MAP.keys())

BRANCH_LABELS: dict[str, str] = dict(BRANCH_MAP)

# ---------------------------------------------------------------------------
# State machine transitions
# ---------------------------------------------------------------------------
# Allowed: open → {in_progress, discarded}
#          in_progress → {resolved, discarded}
#          resolved → {}  (terminal)
#          discarded → {} (terminal)
STATE_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "open": ("in_progress", "discarded"),
    "in_progress": ("resolved", "discarded"),
    "resolved": (),
    "discarded": (),
}

TERMINAL_STATUSES = ("resolved", "discarded")
