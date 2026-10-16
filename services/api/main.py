from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from models import Incident
from auth.routes import router as auth_router


app = FastAPI(
    title="Brasaland Incident API",
    description="API para gestionar y analizar incidentes de Brasaland",
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
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTH
# ============================================================

app.include_router(auth_router)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    return SessionLocal()


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "brasaland-incident-api",
    }


# ============================================================
# INCIDENTS
# ============================================================

@app.get("/api/incidents")
def get_incidents():
    db = get_db()

    try:
        incidents = db.query(Incident).all()

        return [
            {
                "id": incident.id,
                "location_id": incident.location_id,
                "category": incident.category,
                "description": incident.description,
                "reporter_id": incident.reporter_id,
                "status": incident.status,
                "satisfaction_score": incident.satisfaction_score,
                "created_at": incident.created_at,
            }
            for incident in incidents
        ]

    finally:
        db.close()


# ============================================================
# INCIDENT SUMMARY
#
# IMPORTANTE:
# Esta ruta debe estar ANTES de /api/incidents/{incident_id}
# para evitar que "summary" sea interpretado como un ID.
# ============================================================

@app.get("/api/incidents/summary")
def get_incidents_summary():
    db = get_db()

    try:
        incidents = db.query(Incident).all()

        total_records = len(incidents)

        by_category = {}
        by_status = {}

        for incident in incidents:
            by_category[incident.category] = (
                by_category.get(incident.category, 0) + 1
            )

            by_status[incident.status] = (
                by_status.get(incident.status, 0) + 1
            )

        closed_incidents = [
            incident
            for incident in incidents
            if incident.status == "CLOSED"
            and incident.satisfaction_score is not None
        ]

        if closed_incidents:
            average_satisfaction = round(
                sum(
                    incident.satisfaction_score
                    for incident in closed_incidents
                )
                / len(closed_incidents),
                2,
            )
        else:
            average_satisfaction = None

        return {
            "total_records": total_records,
            "by_category": by_category,
            "by_status": by_status,
            "closed_incidents": len(closed_incidents),
            "average_satisfaction": average_satisfaction,
        }

    finally:
        db.close()


# ============================================================
# GET SINGLE INCIDENT
# ============================================================

@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: int):
    db = get_db()

    try:
        incident = (
            db.query(Incident)
            .filter(Incident.id == incident_id)
            .first()
        )

        if not incident:
            raise HTTPException(
                status_code=404,
                detail="Incidente no encontrado.",
            )

        return {
            "id": incident.id,
            "location_id": incident.location_id,
            "category": incident.category,
            "description": incident.description,
            "reporter_id": incident.reporter_id,
            "status": incident.status,
            "satisfaction_score": incident.satisfaction_score,
            "created_at": incident.created_at,
        }

    finally:
        db.close()


# ============================================================
# CREATE INCIDENT
# ============================================================

@app.post("/api/incidents")
def create_incident(
    location_id: str,
    category: str,
    description: str,
    reporter_id: str,
    status: str = "OPEN",
    satisfaction_score: float | None = None,
):
    db = get_db()

    try:
        incident = Incident(
            location_id=location_id,
            category=category,
            description=description,
            reporter_id=reporter_id,
            status=status,
            satisfaction_score=satisfaction_score,
        )

        db.add(incident)
        db.commit()
        db.refresh(incident)

        return {
            "id": incident.id,
            "location_id": incident.location_id,
            "category": incident.category,
            "description": incident.description,
            "reporter_id": incident.reporter_id,
            "status": incident.status,
            "satisfaction_score": incident.satisfaction_score,
            "created_at": incident.created_at,
        }

    finally:
        db.close()


# ============================================================
# UPDATE INCIDENT STATUS
# ============================================================

@app.patch("/api/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    status: str,
):
    db = get_db()

    try:
        incident = (
            db.query(Incident)
            .filter(Incident.id == incident_id)
            .first()
        )

        if not incident:
            raise HTTPException(
                status_code=404,
                detail="Incidente no encontrado.",
            )

        incident.status = status

        db.commit()
        db.refresh(incident)

        return {
            "id": incident.id,
            "status": incident.status,
        }

    finally:
        db.close()


# ============================================================
# CSV ANALYSIS
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

        df = pd.read_csv(
            BytesIO(contents)
        )

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

    # --------------------------------------------------------
    # VALID LOCATIONS
    # --------------------------------------------------------

    valid_locations = {
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

    # --------------------------------------------------------
    # VALID CATEGORIES
    # --------------------------------------------------------

    valid_categories = {
        "CUSTOMER_COMPLAINT",
        "EQUIPMENT",
        "SUPPLY",
        "FOOD_QUALITY",
        "STAFF",
    }

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    invalid_location = (
        df["location_id"].isna()
        | ~df["location_id"].isin(valid_locations)
    )

    invalid_category = (
        df["category"].isna()
        | ~df["category"].isin(valid_categories)
    )

    invalid_description = (
        df["description"].isna()
        | (
            df["description"]
            .fillna("")
            .astype(str)
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
            .astype(str)
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

    if closed_scores.notna().any():
        average_satisfaction = round(
            float(closed_scores.mean()),
            2,
        )
    else:
        average_satisfaction = None

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

        "closed_incidents": len(
            closed_df
        ),

        "average_satisfaction": (
            average_satisfaction
        ),
    }


# ============================================================
# LOCAL EXECUTION
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )