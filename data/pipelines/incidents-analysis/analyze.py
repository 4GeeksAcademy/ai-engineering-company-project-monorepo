import sys
from pathlib import Path

import pandas as pd


VALID_LOCATIONS = {
    "COL-01", "COL-02", "COL-03", "COL-04", "COL-05",
    "COL-06", "COL-07", "COL-08", "COL-09", "COL-10",
    "FLA-01", "FLA-02", "FLA-03", "FLA-04",
}

VALID_CATEGORIES = {
    "CUSTOMER_COMPLAINT",
    "EQUIPMENT",
    "SUPPLY",
    "FOOD_QUALITY",
    "STAFF",
}

VALID_STATUSES = {
    "OPEN",
    "CLOSED",
    "DISCARDED",
}


def load_data(file_name: str) -> pd.DataFrame:
    """Load the incident CSV from the data/raw directory."""

    project_root = Path(__file__).resolve().parents[3]
    file_path = project_root / "data" / "raw" / file_name

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    return pd.read_csv(file_path, encoding="utf-8")


def validate_records(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Validate incident records according to Brasaland rules."""

    invalid_location = (
        df["location_id"].isna()
        | ~df["location_id"].isin(VALID_LOCATIONS)
    )

    invalid_category = (
        df["category"].isna()
        | ~df["category"].isin(VALID_CATEGORIES)
    )

    invalid_description = (
        df["description"].isna()
        | (
            df["description"]
            .fillna("")
            .str.strip()
            .str.len()
            < 5
        )
    )

    invalid_reporter = (
        df["reporter_id"].isna()
        | (
            df["reporter_id"]
            .fillna("")
            .str.strip()
            == ""
        )
    )

    score = pd.to_numeric(
        df["satisfaction_score"],
        errors="coerce",
    )

    missing_closed_score = (
        (df["status"] == "CLOSED")
        & score.isna()
    )

    invalid_score = (
        score.notna()
        & ~score.between(1, 5)
    )

    invalid_any = (
        invalid_location
        | invalid_category
        | invalid_description
        | invalid_reporter
        | missing_closed_score
        | invalid_score
    )

    valid_df = df[~invalid_any].copy()

    invalid_breakdown = {
        "invalid_location": int(invalid_location.sum()),
        "invalid_category": int(invalid_category.sum()),
        "invalid_description": int(invalid_description.sum()),
        "invalid_reporter": int(invalid_reporter.sum()),
        "missing_closed_score": int(
            missing_closed_score.sum()
        ),
        "invalid_score": int(invalid_score.sum()),
    }

    return valid_df, invalid_breakdown

def export_results(
    valid_df: pd.DataFrame,
    invalid_breakdown: dict,
    output_path: Path,
) -> None:
    """Export analysis results to a CSV file."""

    rows = []

    total_records = len(valid_df) + sum(
        invalid_breakdown.values()
    )

    invalid_records = total_records - len(valid_df)

    rows.extend([
        {
            "metric": "total_records",
            "value": total_records,
            "percentage": 100.0,
        },
        {
            "metric": "valid_records",
            "value": len(valid_df),
            "percentage": round(
                len(valid_df) / total_records * 100,
                2,
            ),
        },
        {
            "metric": "invalid_records",
            "value": invalid_records,
            "percentage": round(
                invalid_records / total_records * 100,
                2,
            ),
        },
    ])

    for rule, count in invalid_breakdown.items():
        rows.append({
            "metric": rule,
            "value": count,
            "percentage": round(
                count / total_records * 100,
                2,
            ),
        })

    category_counts = valid_df["category"].value_counts()

    for category, count in category_counts.items():
        rows.append({
            "metric": f"category_{category}",
            "value": count,
            "percentage": round(
                count / len(valid_df) * 100,
                2,
            ),
        })

    status_counts = valid_df["status"].value_counts()

    for status, count in status_counts.items():
        rows.append({
            "metric": f"status_{status}",
            "value": count,
            "percentage": round(
                count / len(valid_df) * 100,
                2,
            ),
        })

    closed_df = valid_df[
        valid_df["status"] == "CLOSED"
    ].copy()

    closed_scores = pd.to_numeric(
        closed_df["satisfaction_score"],
        errors="coerce",
    )

    rows.append({
        "metric": "closed_incidents",
        "value": len(closed_df),
        "percentage": round(
            len(closed_df) / len(valid_df) * 100,
            2,
        ),
    })

    rows.append({
        "metric": "average_satisfaction",
        "value": round(closed_scores.mean(), 2),
        "percentage": None,
    })

    score_counts = closed_scores.value_counts().sort_index()

    for score, count in score_counts.items():
        rows.append({
            "metric": f"satisfaction_score_{int(score)}",
            "value": count,
            "percentage": round(
                count / len(closed_df) * 100,
                2,
            ),
        })

    results_df = pd.DataFrame(rows)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    results_df.to_csv(
        output_path,
        index=False,
        encoding="utf-8",
    )

    print()
    print(f"Results exported to: {output_path}")

def main() -> None:
    """Run the Brasaland incident analysis."""

    if len(sys.argv) != 2:
        print("Usage: python analyze.py incidents.csv")
        sys.exit(1)

    file_name = sys.argv[1]
    df = load_data(file_name)

    valid_df, invalid_breakdown = validate_records(df)

    print("=" * 60)
    print("  BRASALAND — INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {file_name}")
    print("=" * 60)
    print()

    print(f"TOTAL RECORDS IN FILE .......... {len(df)}")
    print(f"VALID RECORDS ................. {len(valid_df)}")
    print(
        f"INVALID RECORDS ............... "
        f"{len(df) - len(valid_df)}"
    )

    print()
    print("INVALID RECORD BREAKDOWN")

    for rule, count in invalid_breakdown.items():
        print(f"  {rule:<25} {count}")

    print()
    print("VALID RECORDS BY CATEGORY")

    category_counts = valid_df["category"].value_counts()

    for category, count in category_counts.items():
        print(f"  {category:<25} {count}")

    print()
    print("VALID RECORDS BY STATUS")

    status_counts = valid_df["status"].value_counts()

    for status, count in status_counts.items():
        print(f"  {status:<25} {count}")

    print()
    print("CLOSED INCIDENTS - SATISFACTION")

    closed_df = valid_df[
        valid_df["status"] == "CLOSED"
    ].copy()

    closed_scores = pd.to_numeric(
        closed_df["satisfaction_score"],
        errors="coerce",
    )

    print(
        f"  CLOSED INCIDENTS ............ "
        f"{len(closed_df)}"
    )

    print(
        f"  AVERAGE SATISFACTION ........ "
        f"{closed_scores.mean():.2f}"
    )

    print()
    print("SATISFACTION SCORE COUNTS")

    score_counts = closed_scores.value_counts().sort_index()

    for score, count in score_counts.items():
        print(
            f"  Score {int(score)} ................ {count}"
        )

    project_root = Path(__file__).resolve().parents[3]

    output_path = (
        project_root
        / "data"
        / "process"
        / "incident_analysis_results.csv"
    )
    export_choice = input(
        "\n¿Deseas exportar los resultados a CSV? (s/n): "
    ).strip().lower()

    if export_choice == "s":
        project_root = Path(__file__).resolve().parents[3]
        output_path = project_root / "results.csv"

        export_results(
            valid_df,
            invalid_breakdown,
            output_path,
        )
    else:
        print("\nExportación omitida.")

if __name__ == "__main__":
    main()