
from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select

from services.api.auth.profiles_routes import router as profiles_router
from services.api.auth.routes import router as auth_router
from services.api.auth.users_routes import router as users_router
from services.api.database import engine
from services.api.models import Incident
from services.api.routers.inventory import router as inventory_router


app = FastAPI(
    title="Brasaland Incident API",
    description="API para analizar incidentes de Brasaland",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# VALIDACIONES DE INCIDENTES
# ============================================================

VALID_LOCATIONS = {
    "COL-01",
    "COL-02",
    "COL-03",
    "COL-04",
    "COL-05",
    "COL-06",
    "COL-07",
    "COL-08",
    "COL-09",
    "COL-10",
    "FLA-01",
    "FLA-02",
    "FLA-03",
    "FLA-04",
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


REQUIRED_COLUMNS = {
    "location_id",
    "category",
    "description",
    "reporter_id",
    "status",
    "satisfaction_score",
}


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "brasaland-incident-api",
    }


# ============================================================
# INCIDENTS SUMMARY
# ============================================================

@app.get("/api/incidents/summary")
def incidents_summary():
    """
    Devuelve el resumen de incidentes utilizado por el dashboard.
    """

    with Session(engine) as db:
        incidents = db.exec(
            select(Incident)
        ).all()

    total_records = len(incidents)

    by_category = {}

    for incident in incidents:
        category = incident.category

        if category not in by_category:
            by_category[category] = 0

        by_category[category] += 1

    by_status = {}

    for incident in incidents:
        status = incident.status

        if status not in by_status:
            by_status[status] = 0

        by_status[status] += 1

    closed_incidents = [
        incident
        for incident in incidents
        if incident.status == "CLOSED"
    ]

    closed_scores = [
        incident.satisfaction_score
        for incident in closed_incidents
        if incident.satisfaction_score is not None
    ]

    average_satisfaction = (
        round(
            sum(closed_scores) / len(closed_scores),
            2,
        )
        if closed_scores
        else None
    )

    return {
        "total_records": total_records,
        "by_category": by_category,
        "by_status": by_status,
        "closed_incidents": len(closed_incidents),
        "average_satisfaction": average_satisfaction,
    }


# ============================================================
# INCIDENTS ANALYSIS
# ============================================================

@app.post("/api/incidents/analyze")
async def analyze_incidents(
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser un CSV.",
        )

    try:
        contents = await file.read()

        if not contents.strip():
            raise ValueError("El archivo está vacío.")

        df = pd.read_csv(BytesIO(contents))

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el CSV: {error}",
        )

    missing_columns = REQUIRED_COLUMNS - set(df.columns)

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas: {sorted(missing_columns)}",
        )

    location_values = (
        df["location_id"]
        .astype("string")
        .str.strip()
    )

    category_values = (
        df["category"]
        .astype("string")
        .str.strip()
    )

    description_values = (
        df["description"]
        .astype("string")
        .str.strip()
    )

    reporter_values = (
        df["reporter_id"]
        .astype("string")
        .str.strip()
    )

    status_values = (
        df["status"]
        .astype("string")
        .str.strip()
    )

    invalid_location = (
        location_values.isna()
        | ~location_values.isin(VALID_LOCATIONS)
    )

    invalid_category = (
        category_values.isna()
        | ~category_values.isin(VALID_CATEGORIES)
    )

    invalid_description = (
        description_values.isna()
        | (description_values.str.len() < 5)
    )

    invalid_reporter = (
        reporter_values.isna()
        | (reporter_values == "")
    )

    invalid_status = (
        status_values.isna()
        | ~status_values.isin(VALID_STATUSES)
    )

    score = pd.to_numeric(
        df["satisfaction_score"],
        errors="coerce",
    )

    missing_closed_score = (
        (status_values == "CLOSED")
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
        | invalid_status
        | missing_closed_score
        | invalid_score
    )

    valid_df = df[~invalid_any].copy()

    closed_df = valid_df[
        status_values[~invalid_any] == "CLOSED"
    ]

    closed_scores = pd.to_numeric(
        closed_df["satisfaction_score"],
        errors="coerce",
    )

    average_satisfaction = (
        round(
            float(closed_scores.mean()),
            2,
        )
        if not closed_scores.empty
        else None
    )

    return {
        "total_records": len(df),
        "valid_records": len(valid_df),
        "invalid_records": int(
            invalid_any.sum()
        ),
        "invalid_breakdown": {
            "invalid_location": int(
                invalid_location.sum()
            ),
            "invalid_category": int(
                invalid_category.sum()
            ),
            "invalid_description": int(
                invalid_description.sum()
            ),
            "invalid_reporter": int(
                invalid_reporter.sum()
            ),
            "invalid_status": int(
                invalid_status.sum()
            ),
            "missing_closed_score": int(
                missing_closed_score.sum()
            ),
            "invalid_score": int(
                invalid_score.sum()
            ),
        },
        "by_category": (
            valid_df["category"]
            .value_counts()
            .to_dict()
        ),
        "by_status": (
            valid_df["status"]
            .value_counts()
            .to_dict()
        ),
        "closed_incidents": len(closed_df),
        "average_satisfaction": average_satisfaction,
    }


# ============================================================
# ROUTERS DE AUTENTICACIÓN
# ============================================================

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)


# ============================================================
# ROUTER DE INVENTARIO
# ============================================================

app.include_router(inventory_router)
