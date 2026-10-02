"""Routes for the incidents domain: analyze an uploaded CSV, export the last
analysis. Endpoint paths are fixed by the project brief, not the API
versioning convention used elsewhere in this monorepo's architecture
proposal — see docs/ARCHITECTURE_PROPOSAL.md for that broader discussion.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import Response

from . import service
from .schemas import AnalyzeResponse

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_incidents(file: UploadFile) -> AnalyzeResponse:
    content = await file.read()

    try:
        result = service.run_analysis(filename=file.filename or "upload.csv", content=content)
    except service.NotCsvFileError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except service.MissingColumnsError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except service.EmptyCsvError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="File is not valid UTF-8 text."
        ) from exc

    return service.to_response(result)


@router.get("/results/export")
async def export_results() -> Response:
    try:
        result = service.get_last_result()
    except service.NoAnalysisYetError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    csv_bytes = service.to_export_csv_bytes(result)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )
