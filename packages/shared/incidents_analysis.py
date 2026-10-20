from collections import Counter


VALID_LOCATIONS = [
    "COL-01", "COL-02", "COL-03", "COL-04", "COL-05",
    "COL-06", "COL-07", "COL-08", "COL-09", "COL-10",
    "FLA-01", "FLA-02", "FLA-03", "FLA-04",
]

VALID_CATEGORIES = [
    "CUSTOMER_COMPLAINT",
    "EQUIPMENT",
    "SUPPLY",
    "FOOD_QUALITY",
    "STAFF",
]

VALID_STATUSES = [
    "OPEN",
    "CLOSED",
    "DISCARDED",
]


def validate_record(record):
    errors = []

    location_id = (record.get("location_id") or "").strip()
    category = (record.get("category") or "").strip()
    description = (record.get("description") or "").strip()
    reporter_id = (record.get("reporter_id") or "").strip()
    status = (record.get("status") or "").strip()
    satisfaction_score = (
        record.get("satisfaction_score") or ""
    ).strip()

    if location_id not in VALID_LOCATIONS:
        errors.append("missing_location")

    if category not in VALID_CATEGORIES:
        errors.append("invalid_category")

    if len(description) < 5:
        errors.append("empty_description")

    if not reporter_id:
        errors.append("missing_reporter")

    if status not in VALID_STATUSES:
        errors.append("invalid_status")

    if status == "CLOSED" and not satisfaction_score:
        errors.append("closed_without_score")

    if satisfaction_score:
        try:
            score = int(satisfaction_score)

            if score < 1 or score > 5:
                errors.append("score_out_of_range")

        except ValueError:
            errors.append("score_out_of_range")

    return errors


def analyze_records(records):
    valid_records = []
    invalid_records = []

    error_counts = {
        "missing_location": 0,
        "invalid_category": 0,
        "empty_description": 0,
        "missing_reporter": 0,
        "invalid_status": 0,
        "closed_without_score": 0,
        "score_out_of_range": 0,
    }

    for record in records:
        errors = validate_record(record)

        if errors:
            invalid_records.append(record)

            for error in errors:
                error_counts[error] += 1
        else:
            valid_records.append(record)

    category_counts = Counter(
        record["category"] for record in valid_records
    )

    status_counts = Counter(
        record["status"] for record in valid_records
    )

    closed_scores = []

    for record in valid_records:
        if (
            record["status"] == "CLOSED"
            and record["satisfaction_score"]
        ):
            closed_scores.append(
                int(record["satisfaction_score"])
            )

    score_counts = Counter(closed_scores)

    average_score = (
        sum(closed_scores) / len(closed_scores)
        if closed_scores
        else 0
    )

    total_valid = len(valid_records)

    categories = {}

    for category in VALID_CATEGORIES:
        count = category_counts[category]

        categories[category] = {
            "count": count,
            "percentage": round(
                (count / total_valid) * 100, 1
            ) if total_valid else 0,
        }

    statuses = {}

    for status in VALID_STATUSES:
        count = status_counts[status]

        statuses[status] = {
            "count": count,
            "percentage": round(
                (count / total_valid) * 100, 1
            ) if total_valid else 0,
        }

    return {
        "total_records": len(records),
        "valid_records": len(valid_records),
        "invalid_records": len(invalid_records),
        "invalid_breakdown": error_counts,
        "categories": categories,
        "statuses": statuses,
        "satisfaction": {
            "scored_cases": len(closed_scores),
            "closed_cases": status_counts["CLOSED"],
            "average_score": round(average_score, 2),
            "scores": {
                "1": score_counts[1],
                "2": score_counts[2],
                "3": score_counts[3],
                "4": score_counts[4],
                "5": score_counts[5],
            },
        },
    }


def results_to_rows(results):
    rows = [
        {
            "metric": "total_records",
            "value": results["total_records"],
            "percentage": "",
        },
        {
            "metric": "valid_records",
            "value": results["valid_records"],
            "percentage": "",
        },
        {
            "metric": "invalid_records",
            "value": results["invalid_records"],
            "percentage": "",
        },
    ]

    for key, value in results["invalid_breakdown"].items():
        rows.append({
            "metric": f"invalid_{key}",
            "value": value,
            "percentage": "",
        })

    for category, data in results["categories"].items():
        rows.append({
            "metric": f"category_{category}",
            "value": data["count"],
            "percentage": data["percentage"],
        })

    for status, data in results["statuses"].items():
        rows.append({
            "metric": f"status_{status}",
            "value": data["count"],
            "percentage": data["percentage"],
        })

    rows.append({
        "metric": "closed_cases",
        "value": results["satisfaction"]["closed_cases"],
        "percentage": "",
    })

    rows.append({
        "metric": "scored_cases",
        "value": results["satisfaction"]["scored_cases"],
        "percentage": "",
    })

    rows.append({
        "metric": "average_satisfaction_score",
        "value": results["satisfaction"]["average_score"],
        "percentage": "",
    })

    for score, count in results["satisfaction"]["scores"].items():
        rows.append({
            "metric": f"satisfaction_score_{score}",
            "value": count,
            "percentage": "",
        })

    return rows