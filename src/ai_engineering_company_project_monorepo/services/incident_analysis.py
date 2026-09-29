from typing import Any

import pandas as pd

REQUIRED_COLUMNS = (
    "incident_id",
    "category",
    "title",
    "description",
    "status",
    "priority",
    "created_at",
    "assigned_to",
)
ALLOWED_STATUS = {"open", "pending", "resolved", "closed", "discarded"}
ALLOWED_PRIORITY = {"low", "medium", "high"}
STATUS_LABELS = {
    "open": "abierto",
    "pending": "pendiente",
    "resolved": "cerrado",
    "closed": "cerrado",
    "discarded": "descartado",
}
CLOSED_STATUSES = {"resolved", "closed"}


def validate_dataframe(dataframe: pd.DataFrame) -> dict[str, list[int]]:
    """Return CSV line numbers grouped by validation problem."""
    issues: dict[str, list[int]] = {}
    missing_columns = [
        column for column in REQUIRED_COLUMNS if column not in dataframe.columns
    ]
    if missing_columns:
        issues["columnas obligatorias ausentes"] = list(dataframe.index + 2)
        return issues

    row_numbers = pd.Series(dataframe.index + 2, index=dataframe.index)
    missing_values = pd.Series(False, index=dataframe.index)
    for column in REQUIRED_COLUMNS:
        values = dataframe[column].astype("string")
        missing_values |= dataframe[column].isna() | values.str.strip().eq("")
    if missing_values.any():
        issues["campo faltante"] = row_numbers[missing_values].tolist()

    status_present = ~dataframe["status"].isna() & dataframe["status"].astype("string").str.strip().ne("")
    invalid_status = status_present & ~dataframe["status"].isin(ALLOWED_STATUS)
    if invalid_status.any():
        issues["status fuera de rango"] = row_numbers[invalid_status].tolist()

    priority_present = ~dataframe["priority"].isna() & dataframe["priority"].astype("string").str.strip().ne("")
    invalid_priority = priority_present & ~dataframe["priority"].isin(ALLOWED_PRIORITY)
    if invalid_priority.any():
        issues["priority fuera de rango"] = row_numbers[invalid_priority].tolist()

    parsed_dates = pd.to_datetime(
        dataframe["created_at"], format="%Y-%m-%d", errors="coerce"
    )
    date_present = ~dataframe["created_at"].isna() & dataframe["created_at"].astype("string").str.strip().ne("")
    invalid_dates = date_present & parsed_dates.isna()
    if invalid_dates.any():
        issues["fecha inválida"] = row_numbers[invalid_dates].tolist()

    non_empty_ids = dataframe["incident_id"].astype("string").str.strip().ne("")
    duplicated_ids = dataframe["incident_id"].duplicated(keep=False) & non_empty_ids
    if duplicated_ids.any():
        issues["incident_id duplicado"] = row_numbers[duplicated_ids].tolist()
    return issues


def analyze_dataframe(dataframe: pd.DataFrame) -> dict[str, Any]:
    """Validate a dataframe and return the canonical analysis summary."""
    issues = validate_dataframe(dataframe)
    invalid_row_numbers = {
        row_number for row_numbers in issues.values() for row_number in row_numbers
    }
    valid_dataframe = dataframe.drop(
        index=[row_number - 2 for row_number in invalid_row_numbers],
        errors="ignore",
    )

    if all(column in valid_dataframe.columns for column in ("category", "status")):
        categories = {
            str(category): int(count)
            for category, count in valid_dataframe["category"].value_counts().sort_index().items()
        }
        statuses = (
            valid_dataframe["status"]
            .map(STATUS_LABELS)
            .fillna(valid_dataframe["status"])
            .value_counts()
            .sort_index()
        )
        status_counts = {
            str(status): int(count) for status, count in statuses.items()
        }
    else:
        categories = {}
        status_counts = {}

    if "satisfaction_score" in valid_dataframe.columns and "status" in valid_dataframe.columns:
        scores = pd.to_numeric(
            valid_dataframe.loc[
                valid_dataframe["status"].isin(CLOSED_STATUSES),
                "satisfaction_score",
            ],
            errors="coerce",
        ).where(lambda values: values.between(1, 5)).dropna()
    else:
        scores = pd.Series(dtype="float64")

    return {
        "total_processed": len(dataframe),
        "valid_records": len(valid_dataframe),
        "invalid_records": len(dataframe) - len(valid_dataframe),
        "by_category": categories,
        "by_status": status_counts,
        "average_satisfaction_closed": (
            round(float(scores.mean()), 2) if not scores.empty else None
        ),
        "satisfaction_scored_closed_cases": len(scores),
        "validation_issues": {
            issue_type: {"count": len(rows), "rows": rows}
            for issue_type, rows in issues.items()
        },
    }


def summary_to_rows(summary: dict[str, Any]) -> list[dict[str, object]]:
    """Convert an analysis summary into rows suitable for CSV export."""
    results: list[dict[str, object]] = [
        {"metric": "total_procesados", "value": summary["total_processed"], "details": ""},
        {"metric": "registros_validos", "value": summary["valid_records"], "details": ""},
        {"metric": "registros_invalidos", "value": summary["invalid_records"], "details": ""},
    ]
    results.extend(
        {
            "metric": f"categoria_{category}",
            "value": count,
            "details": "registros válidos",
        }
        for category, count in summary["by_category"].items()
    )
    results.extend(
        {
            "metric": f"estado_{status}",
            "value": count,
            "details": "registros válidos",
        }
        for status, count in summary["by_status"].items()
    )
    results.append(
        {
            "metric": "satisfaccion_media_casos_cerrados",
            "value": summary["average_satisfaction_closed"] or "",
            "details": (
                f"{summary['satisfaction_scored_closed_cases']} caso(s) con puntuación"
            ),
        }
    )
    results.extend(
        {
            "metric": f"problema_{issue_type}",
            "value": issue_details["count"],
            "details": f"filas CSV: {', '.join(map(str, issue_details['rows']))}",
        }
        for issue_type, issue_details in summary["validation_issues"].items()
    )
    return results
