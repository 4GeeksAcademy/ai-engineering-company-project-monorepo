from __future__ import annotations

from typing import Any

STATUSES = ("open", "in_progress", "resolved", "discarded")
ORIGINS = ("customer", "branch", "internal")
CATEGORIES = (
    "service",
    "product_quality",
    "payment",
    "technology",
    "inventory",
    "operations",
    "other",
)
BRANCHES = (
    "central",
    "medellin_poblado",
    "medellin_laureles",
    "medellin_envigado",
    "medellin_sabaneta",
    "medellin_belen",
    "medellin_las_americas",
    "medellin_mayorca",
    "florida_miami",
    "florida_orlando",
    "florida_tampa",
    "florida_fort_lauderdale",
    "florida_boca_raton",
    "florida_weston",
    "florida_doral",
)

STATUS_TRANSITIONS = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),
    "discarded": set(),
}


class ValidationError(ValueError):
    def __init__(self, errors: dict[str, str]):
        self.errors = errors
        super().__init__("; ".join(f"{key}: {value}" for key, value in errors.items()))


def validate_incident(data: dict[str, Any]) -> dict[str, Any]:
    errors: dict[str, str] = {}
    for field in ("title", "description", "category", "status", "origin", "branch"):
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            errors[field] = "Este campo es obligatorio."

    for field, allowed, label in (
        ("category", CATEGORIES, "categoría"),
        ("status", STATUSES, "estado"),
        ("origin", ORIGINS, "origen"),
        ("branch", BRANCHES, "sede"),
    ):
        if field in data and data[field] not in allowed:
            errors[field] = f"El valor no es válido para {label}."

    if errors:
        raise ValidationError(errors)
    return {field: data[field].strip() if isinstance(data[field], str) else data[field] for field in data}


def validate_status_transition(current: str, target: str) -> None:
    if target not in STATUSES:
        raise ValidationError({"status": "El estado indicado no es válido."})
    if target not in STATUS_TRANSITIONS.get(current, set()):
        raise ValidationError({"status": f"No se puede pasar de {current} a {target}."})