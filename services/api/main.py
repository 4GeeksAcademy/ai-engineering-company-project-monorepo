from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException

app = FastAPI(
    title="Brasaland Incident API",
    description="API para analizar incidentes de Brasaland",
    version="1.0.0",
)


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


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "brasaland-incident-api",
    }


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser un CSV.",
        )

    try:
        contents = await file.read()
        df = pd.read_csv(BytesIO(contents))
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el CSV: {error}",
        )

    required_columns = {
        "location_id",
        "category",
        "description",
        "reporter_id",
        "status",
        "satisfaction_score",
    }

    missing_columns = required_columns - set(df.columns)

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas: {sorted(missing_columns)}",
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

    invalid_any = (
        invalid_location
        | invalid_category
        | invalid_description
        | invalid_reporter
        | missing_closed_score
        | invalid_score
    )

    valid_df = df[~invalid_any].copy()

    closed_df = valid_df[
        valid_df["status"] == "CLOSED"
    ]

    closed_scores = pd.to_numeric(
        closed_df["satisfaction_score"],
        errors="coerce",
    )

    return {
        "total_records": len(df),
        "valid_records": len(valid_df),
        "invalid_records": int(invalid_any.sum()),
        "invalid_breakdown": {
            "invalid_location": int(invalid_location.sum()),
            "invalid_category": int(invalid_category.sum()),
            "invalid_description": int(invalid_description.sum()),
            "invalid_reporter": int(invalid_reporter.sum()),
            "missing_closed_score": int(
                missing_closed_score.sum()
            ),
            "invalid_score": int(invalid_score.sum()),
        },
        "by_category": valid_df["category"].value_counts().to_dict(),
        "by_status": valid_df["status"].value_counts().to_dict(),
        "closed_incidents": len(closed_df),
        "average_satisfaction": round(
            float(closed_scores.mean()),
            2,
        ),
    }

from services.api.auth.routes import router as auth_router
app.include_router(auth_router)

from services.api.auth.users_routes import router as users_router
app.include_router(users_router)

from services.api.auth.profiles_routes import router as profiles_router
app.include_router(profiles_router)
