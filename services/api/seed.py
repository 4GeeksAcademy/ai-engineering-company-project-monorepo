from pathlib import Path

import pandas as pd

from database import Base, SessionLocal, engine
from models import Incident


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


def load_valid_incidents() -> pd.DataFrame:
    """Load and validate incidents from the source CSV."""

    project_root = Path(__file__).resolve().parents[2]
    file_path = project_root / "data" / "raw" / "incidents.csv"

    if not file_path.exists():
        raise FileNotFoundError(
            f"No se encontró el archivo: {file_path}"
        )

    df = pd.read_csv(
        file_path,
        encoding="utf-8",
    )

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

    invalid_status = (
        df["status"].isna()
        | ~df["status"].isin(VALID_STATUSES)
    )

    invalid_any = (
        invalid_location
        | invalid_category
        | invalid_description
        | invalid_reporter
        | missing_closed_score
        | invalid_score
        | invalid_status
    )

    return df[~invalid_any].copy()


def seed_database() -> None:
    """Create the database and load valid incidents."""

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing_count = db.query(Incident).count()

        if existing_count > 0:
            print(
                f"La base de datos ya contiene "
                f"{existing_count} incidentes."
            )
            return

        df = load_valid_incidents()

        incidents = []

        for _, row in df.iterrows():
            score = pd.to_numeric(
                row["satisfaction_score"],
                errors="coerce",
            )

            incident = Incident(
                location_id=str(row["location_id"]),
                category=str(row["category"]),
                description=str(row["description"]),
                reporter_id=str(row["reporter_id"]),
                status=str(row["status"]),
                satisfaction_score=(
                    float(score)
                    if pd.notna(score)
                    else None
                ),
            )

            incidents.append(incident)

        db.add_all(incidents)
        db.commit()

        print(
            f"Seed completado: "
            f"{len(incidents)} incidentes cargados."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()