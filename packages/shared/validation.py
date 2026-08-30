# packages/shared/validation.py
#
# L├│gica de validaci├│n y mapeo COMPARTIDA entre:
#   - scripts/seed_incidents.py (carga CSV)
#   - services/api/app/routes/incidents.py (API)
#
# Contiene TODAS las transformaciones CSV -> modelo definidas en CONTEXT-trackflow.
# El seed script y la API ambos importan desde aqu├¡ para NO duplicar c├│digo.

import re
from datetime import datetime
from typing import Any

# --- Constantes de validaci├│n CSV -----------------------------
VALID_CARRIERS = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
VALID_COUNTRIES = {"US", "ES"}
VALID_CUSTOMER_TYPES = {"B2B", "B2C"}
VALID_CSV_STATUSES = {"OPEN", "CLOSED", "DISCARDED"}
VALID_CSV_CATEGORIES = {"LOST_PARCEL", "DELAYED_DELIVERY", "WRONG_ADDRESS", "RETURN_REQUEST", "DAMAGE"}

# --- MAPEOS CSV -> MODELO (desde CONTEXT-trackflow) ------------

STATUS_MAP = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

CATEGORY_MAP = {
    "LOST_PARCEL": "lost_parcel",
    "DELAYED_DELIVERY": "delivery_failure",
    "WRONG_ADDRESS": "delivery_failure",
    "RETURN_REQUEST": "returns_issue",
    "DAMAGE": "carrier_issue",
}

BRANCH_MAP = {
    "US": "la_office",
    "ES": "zaragoza_office",
}


def validate_and_transform_row(row: dict[str, str]) -> tuple[bool, dict[str, Any] | str]:
    """
    Valida y transforma una fila CSV al formato del modelo Incident.

    Aplica todas las reglas del CONTEXT-trackflow:
    - Campos obligatorios: incident_id, customer_type, carrier, country, category, status, date, location
    - carrier debe coincidir con pais (VALID_CARRIERS)
    - country solo US o ES
    - customer_type solo B2B o B2C
    - status solo OPEN, CLOSED, DISCARDED
    - category solo las 5 del CSV
    - date formato YYYY-MM-DD
    - Transformaciones CSV->modelo aplicadas

    Returns:
        (True, dict) si es v├ílido con los campos transformados
        (False, mensaje_error) si es inv├ílido
    """
    required_fields = {"incident_id", "customer_type", "carrier", "country", "category", "status", "date", "location"}

    # Validar campos obligatorios
    missing = required_fields - set(row.keys())
    if missing:
        return (False, f"Campos obligatorios faltantes: {', '.join(sorted(missing))}")

    incident_id = row["incident_id"].strip()
    if not incident_id.isdigit():
        return (False, f"incident_id no es un n├║mero v├ílido: '{row['incident_id']}'")

    customer_type = row["customer_type"].strip().upper()
    if customer_type not in VALID_CUSTOMER_TYPES:
        return (False, f"customer_type inv├ílido: '{row['customer_type']}'. V├ílidos: B2B, B2C")

    carrier = row["carrier"].strip().upper()
    country = row["country"].strip().upper()
    if country not in VALID_COUNTRIES:
        return (False, f"pa├¡s inv├ílido: '{row['country']}'. V├ílidos: US, ES")

    if country not in VALID_CARRIERS or carrier not in VALID_CARRIERS[country]:
        valid_carriers = VALID_CARRIERS.get(country, set())
        return (False, f"carrier '{row['carrier']}' no v├ílido para pa├¡s '{country}'. V├ílidos: {', '.join(sorted(valid_carriers))}")

    category = row["category"].strip().upper()
    if category not in VALID_CSV_CATEGORIES:
        return (False, f"category inv├ílida: '{row['category']}'. V├ílidas: {', '.join(sorted(VALID_CSV_CATEGORIES))}")

    csv_status = row["status"].strip().upper()
    if csv_status not in VALID_CSV_STATUSES:
        return (False, f"status inv├ílido: '{row['status']}'. V├ílidos: {', '.join(sorted(VALID_CSV_STATUSES))}")

    # Validar formato de fecha
    date_str = row["date"].strip()
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return (False, f"fecha inv├ílida: '{row['date']}'. Formato esperado: YYYY-MM-DD")

    location = row["location"].strip()
    if not location:
        return (False, "location est├í vac├¡o")

    # --- Transformaciones CSV -> modelo ---
    title = f"Incidencia #{incident_id}"
    description = row.get("description", f"Cliente {customer_type} - Pa├¡s: {country} - Transportista: {carrier}")

    transformed_status = STATUS_MAP.get(csv_status, "open")
    transformed_category = CATEGORY_MAP.get(category, "other")
    transformed_branch = BRANCH_MAP.get(country, "central")

    return (True, {
        "incident_id": int(incident_id),
        "title": title,
        "description": description,
        "category": transformed_category,
        "status": transformed_status,
        "origin": "customer",
        "branch": transformed_branch,
        "country": country,
        "carrier": carrier,
        "customer_type": customer_type,
        "created_at": date_str,
        "updated_at": date_str,
    })


def validate_status_transition(current: str, new: str) -> tuple[bool, str]:
    """
    Valida si la transici├│n de estado es permitida seg├║n el ciclo de vida.

    Ciclo de vida: open -> in_progress -> resolved|discarded
    - resolved y discarded son estados FINALES

    Returns:
        (True, "") si es v├ílida
        (False, mensaje_error) si es inv├ílida
    """
    STATUS_TRANSITIONS = {
        "open": {"in_progress", "discarded"},
        "in_progress": {"resolved", "discarded"},
        "resolved": set(),
        "discarded": set(),
    }

    allowed = STATUS_TRANSITIONS.get(current, set())
    if new in allowed:
        return (True, "")
    return (False, f"Transici├│n de '{current}' -> '{new}' no permitida")