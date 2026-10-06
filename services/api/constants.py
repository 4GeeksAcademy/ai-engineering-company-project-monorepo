from __future__ import annotations

VALID_CATEGORIES = {"EQUIPAMIENTO","ABASTECIMIENTO","QUEJA_CLIENTE","CALIDAD_ALIMENTO","PERSONAL"}
VALID_STATUSES = {"ABIERTO", "CERRADO", "DESCARTADO"}
REQUIRED_COLUMNS = ["incident_id","date","location_id","category","description","status","customer_id","satisfaction_score","reporter_id"]
MIN_DESCRIPTION_LENGTH = 10
