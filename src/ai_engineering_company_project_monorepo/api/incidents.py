from io import BytesIO
from io import StringIO
import csv
from typing import Annotated

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from ai_engineering_company_project_monorepo.services.incident_analysis import (
    analyze_dataframe,
    summary_to_rows,
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])
CsvFile = Annotated[UploadFile, File(description="Fichero CSV de incidencias")]


@router.post("/analyze")
async def analyze_incidents(request: Request, file: CsvFile) -> dict[str, object]:
    """Analyze an uploaded incidents CSV file."""
    try:
        dataframe = pd.read_csv(BytesIO(await file.read()))
    except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV inválido: {error}",
        ) from error

    if dataframe.empty and len(dataframe.columns) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El CSV no contiene cabeceras",
        )
    summary = analyze_dataframe(dataframe)
    request.app.state.last_incident_analysis = summary
    return summary


@router.get("/results/export", response_class=StreamingResponse)
def export_incident_results(request: Request) -> StreamingResponse:
    """Download the most recent incident analysis as CSV."""
    summary = getattr(request.app.state, "last_incident_analysis", None)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ningún análisis disponible para exportar",
        )

    csv_buffer = StringIO()
    writer = csv.DictWriter(csv_buffer, fieldnames=["metric", "value", "details"])
    writer.writeheader()
    writer.writerows(summary_to_rows(summary))
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )
