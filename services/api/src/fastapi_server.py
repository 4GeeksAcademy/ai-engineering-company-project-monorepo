"""FastAPI entrypoint exposing auth, users, and profiles routes."""

from __future__ import annotations

from collections.abc import Sequence
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.database import init_db
from src.routes.auth_router import auth_router
from src.routes.incidents_fastapi_router import incidents_fastapi_router
from src.routes.profiles_router import profiles_router
from src.routes.suppliers_fastapi_router import suppliers_fastapi_router
from src.routes.users_router import users_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create SQLModel tables in Supabase on startup."""
    init_db()
    yield


app = FastAPI(title="TrackFlow Auth API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_fastapi_router)
app.include_router(incidents_fastapi_router)


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_request, exc: RequestValidationError) -> JSONResponse:
    details: list[dict[str, str]] = []

    for issue in exc.errors():
        loc: Sequence[object] = issue.get("loc", [])
        field_name = str(loc[-1]) if loc else "field"
        issue_type = str(issue.get("type", ""))
        issue_value = issue.get("input")

        if issue_type == "missing":
            message = f"El campo '{field_name}' es obligatorio."
        elif issue_type.startswith("enum"):
            message = f"El campo '{field_name}' tiene un valor invalido: '{issue_value}'."
        elif issue_type.startswith("string_too_short"):
            message = f"El campo '{field_name}' no puede estar vacio."
        else:
            message = f"El campo '{field_name}' no es valido."

        details.append({"field": field_name, "message": message})

    return JSONResponse(
        status_code=422,
        content={
            "error": "Error de validacion en la solicitud.",
            "details": details,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail

    if isinstance(detail, dict):
        message = str(detail.get("error", "Solicitud invalida."))
        details = detail.get("details")
        content: dict[str, object] = {"error": message}
        if details is not None:
            content["details"] = details
        return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)

    if isinstance(detail, list):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Error de validacion en la solicitud.",
                "details": detail,
            },
            headers=exc.headers,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": str(detail or "Solicitud invalida.")},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, _exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "Ha ocurrido un error interno en el servidor"},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
