import csv
import re

from collections import Counter
from datetime import datetime
from io import StringIO


EXPECTED_COLUMNS = [
    "incident_id",
    "date",
    "country",
    "customer_type",
    "tracking_number",
    "carrier",
    "category",
    "description",
    "status",
    "customer_email",
    "satisfaction_score",
]


VALID_COUNTRIES = ["US", "ES"]

VALID_CUSTOMER_TYPES = ["B2B", "B2C"]

VALID_CARRIERS_BY_COUNTRY = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}

VALID_CATEGORIES = [
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
]

VALID_STATUSES = [
    "OPEN",
    "CLOSED",
    "DISCARDED",
]

ERROR_LABELS = {
    "missing_incident_id": "Missing incident_id",
    "invalid_incident_id": "Invalid incident_id format",
    "missing_date": "Missing date",
    "invalid_date": "Invalid date format",
    "invalid_country": "Missing or invalid country",
    "invalid_customer_type": "Invalid or missing customer_type",
    "invalid_tracking_number": "Invalid tracking number",
    "invalid_carrier": "Carrier/country mismatch",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Empty or too-short description",
    "invalid_status": "Invalid or missing status",
    "invalid_email": "Invalid or missing email",
    "closed_missing_score": "Closed incident, no score",
    "invalid_score": "Invalid satisfaction_score",
    "score_out_of_range": "satisfaction_score out of range",
}

INVALID_REASON_ORDER = [
    "invalid_tracking_number",
    "invalid_carrier",
    "invalid_category",
    "invalid_email",
    "closed_missing_score",
    "invalid_country",
    "invalid_customer_type",
    "invalid_status",
    "invalid_description",
    "missing_date",
    "invalid_date",
    "missing_incident_id",
    "invalid_incident_id",
    "invalid_score",
    "score_out_of_range",
]


def clean(value):
    if value is None:
        return ""

    return str(value).strip()


def valid_date(value):
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def validate_row(row):
    errors = []

    incident_id = clean(row.get("incident_id"))
    if not incident_id:
        errors.append("missing_incident_id")
    elif not re.fullmatch(r"TRF-\d{6}", incident_id):
        errors.append("invalid_incident_id")

    date = clean(row.get("date"))
    if not date:
        errors.append("missing_date")
    elif not valid_date(date):
        errors.append("invalid_date")

    country = clean(row.get("country"))
    if country not in VALID_COUNTRIES:
        errors.append("invalid_country")

    customer_type = clean(row.get("customer_type"))
    if customer_type not in VALID_CUSTOMER_TYPES:
        errors.append("invalid_customer_type")

    tracking_number = clean(row.get("tracking_number"))
    if len(tracking_number) < 8:
        errors.append("invalid_tracking_number")

    carrier = clean(row.get("carrier"))
    valid_carriers = VALID_CARRIERS_BY_COUNTRY.get(country, set())
    if carrier not in valid_carriers:
        errors.append("invalid_carrier")

    category = clean(row.get("category"))
    if category not in VALID_CATEGORIES:
        errors.append("invalid_category")

    description = clean(row.get("description"))
    if len(description) < 5:
        errors.append("invalid_description")

    status = clean(row.get("status"))
    if status not in VALID_STATUSES:
        errors.append("invalid_status")

    customer_email = clean(row.get("customer_email"))
    if not customer_email or "@" not in customer_email:
        errors.append("invalid_email")

    score_text = clean(row.get("satisfaction_score"))
    if status == "CLOSED" and not score_text:
        errors.append("closed_missing_score")

    if score_text:
        try:
            score = int(score_text)
        except ValueError:
            errors.append("invalid_score")
        else:
            if not 1 <= score <= 5:
                errors.append("score_out_of_range")

    return errors


def build_breakdown(counter, possible_values, total):
    breakdown = {}
    for value in possible_values:
        count = counter.get(value, 0)
        percentage = round((count / total) * 100, 1) if total else 0.0
        breakdown[value] = {
            "count": count,
            "percentage": percentage,
        }
    return breakdown


def analyze_csv_text(text, source_file="incidents-trackflow.csv"):
    if not text or not text.strip():
        raise ValueError("El fichero CSV esta vacio")

    try:
        reader = csv.DictReader(StringIO(text), strict=True)

        if not reader.fieldnames:
            raise ValueError("El CSV no contiene encabezados")

        missing_columns = [
            column
            for column in EXPECTED_COLUMNS
            if column not in reader.fieldnames
        ]

        if missing_columns:
            raise ValueError(
                "Faltan columnas obligatorias: " + ", ".join(missing_columns)
            )

        rows = list(reader)
    except csv.Error as error:
        raise ValueError("El fichero no contiene un CSV valido") from error

    if not rows:
        raise ValueError("El CSV no contiene registros")

    valid_rows = []
    invalid_reason_counts = Counter()
    invalid_records = 0

    for row in rows:
        problems = validate_row(row)
        if problems:
            invalid_records += 1
            invalid_reason_counts.update(problems)
        else:
            valid_rows.append(row)

    valid_records = len(valid_rows)

    category_counts = Counter(clean(row.get("category")) for row in valid_rows)
    status_counts = Counter(clean(row.get("status")) for row in valid_rows)
    country_counts = Counter(clean(row.get("country")) for row in valid_rows)

    closed_rows = [
        row
        for row in valid_rows
        if clean(row.get("status")) == "CLOSED"
    ]

    scores = [
        int(clean(row.get("satisfaction_score")))
        for row in closed_rows
    ]

    score_counts = Counter(scores)
    average_score = round(sum(scores) / len(scores), 2) if scores else None

    invalid_breakdown = {}
    for code in INVALID_REASON_ORDER:
        count = invalid_reason_counts.get(code, 0)
        if count:
            invalid_breakdown[ERROR_LABELS.get(code, code)] = count

    return {
        "company": "TRACKFLOW",
        "source_file": source_file,
        "total_records": len(rows),
        "valid_records": valid_records,
        "invalid_records": invalid_records,
        "invalid_breakdown": invalid_breakdown,
        "by_category": build_breakdown(
            category_counts,
            VALID_CATEGORIES,
            valid_records,
        ),
        "by_status": build_breakdown(
            status_counts,
            VALID_STATUSES,
            valid_records,
        ),
        "by_country": build_breakdown(
            country_counts,
            VALID_COUNTRIES,
            valid_records,
        ),
        "satisfaction": {
            "closed_cases": len(closed_rows),
            "scored_cases": len(scores),
            "average": average_score,
            "scores": {
                str(score): score_counts.get(score, 0)
                for score in range(1, 6)
            },
        },
    }


def format_summary(summary):
    lines = [
        "=" * 60,
        "  TRACKFLOW - INCIDENT REPORT ANALYSIS",
        f"  Source file: {summary['source_file']}",
        "=" * 60,
        "",
        f"TOTAL RECORDS IN FILE .......... {summary['total_records']}",
        f"  Valid records ................ {summary['valid_records']}",
        f"  Invalid / incomplete ......... {summary['invalid_records']}",
        "",
        "INVALID RECORDS BREAKDOWN",
    ]

    if summary["invalid_breakdown"]:
        for reason, count in summary["invalid_breakdown"].items():
            lines.append(f"  {reason:<42} {count}")
    else:
        lines.append("  No invalid records")

    lines.extend([
        "",
        "BREAKDOWN BY CATEGORY (valid records)",
    ])

    for category, data in summary["by_category"].items():
        lines.append(
            f"  {category:<28} {data['count']:>3}  ({data['percentage']:.1f}%)"
        )

    lines.extend([
        "",
        "BREAKDOWN BY STATUS (valid records)",
    ])

    for status, data in summary["by_status"].items():
        lines.append(
            f"  {status:<28} {data['count']:>3}  ({data['percentage']:.1f}%)"
        )

    lines.extend([
        "",
        "BREAKDOWN BY COUNTRY (valid records)",
    ])

    for country, data in summary["by_country"].items():
        lines.append(
            f"  {country:<28} {data['count']:>3}  ({data['percentage']:.1f}%)"
        )

    satisfaction = summary["satisfaction"]

    lines.extend([
        "",
        "SATISFACTION INDEX (closed incidents)",
        (
            "  Scored incidents: "
            f"{satisfaction['scored_cases']} "
            "of "
            f"{satisfaction['closed_cases']}"
        ),
    ])

    if satisfaction["average"] is None:
        lines.append("  Average score: N/A")
    else:
        lines.append(
            "  Average score: "
            f"{satisfaction['average']:.2f}"
            " / 5.00"
        )

    score_labels = {
        "1": "Very dissatisfied",
        "2": "Dissatisfied",
        "3": "Neutral",
        "4": "Satisfied",
        "5": "Very satisfied",
    }

    for score, count in satisfaction["scores"].items():
        label = score_labels[score]
        lines.append(
            f"  Score {score} ({label}) ........ {count}"
        )

    lines.extend([
        "",
        "=" * 60,
    ])

    return "\n".join(lines)


def summary_to_csv(summary):
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["metric", "value", "percentage"])

    writer.writerow(["total_records", summary["total_records"], ""])
    writer.writerow(["valid_records", summary["valid_records"], ""])
    writer.writerow(["invalid_records", summary["invalid_records"], ""])

    for reason, count in summary["invalid_breakdown"].items():
        writer.writerow([f"invalid.{reason}", count, ""])

    for category, data in summary["by_category"].items():
        writer.writerow([
            f"category.{category}",
            data["count"],
            data["percentage"],
        ])

    for status, data in summary["by_status"].items():
        writer.writerow([
            f"status.{status}",
            data["count"],
            data["percentage"],
        ])

    for country, data in summary["by_country"].items():
        writer.writerow([
            f"country.{country}",
            data["count"],
            data["percentage"],
        ])

    satisfaction = summary["satisfaction"]

    writer.writerow([
        "satisfaction.closed_cases",
        satisfaction["closed_cases"],
        "",
    ])

    writer.writerow([
        "satisfaction.scored_cases",
        satisfaction["scored_cases"],
        "",
    ])

    writer.writerow([
        "satisfaction.average",
        satisfaction["average"],
        "",
    ])

    for score, count in satisfaction["scores"].items():
        writer.writerow([
            f"satisfaction.score_{score}",
            count,
            "",
        ])

    return output.getvalue()