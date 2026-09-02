"""Custom exception handlers.

Only `/incidents` requests get the 400 validation-error format required by
this project. Every other route keeps FastAPI's default 422 behavior
(Supplier Directory, Auth, Users, Profiles).

An additional generic handler ensures truly unhandled exceptions never
leak tracebacks, file paths or secrets to the client.
"""

import logging

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


logger = logging.getLogger("api.errors")

INCIDENTS_PATH_PREFIXES = ("/api/incidents", "/incidents")

_FIELD_LABELS = {
    "title": "Title",
    "description": "Description",
}


def _field_from_loc(loc: tuple) -> str:
    for part in loc:
        if part not in ("body", "query", "path"):
            return str(part)
    return str(loc[-1]) if loc else "unknown"


def _human_message(field: str, error_type: str) -> str:
    label = _FIELD_LABELS.get(field)

    if label is not None:
        if error_type == "missing":
            return f"{label} is required"
        return f"{label} must not be empty"

    if error_type == "missing":
        return f"{field.capitalize()} is required"

    return f"Invalid {field}"


async def incidents_validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    if not request.url.path.startswith(INCIDENTS_PATH_PREFIXES):
        # Preserve the default FastAPI 422 contract for every other route.
        return JSONResponse(
            status_code=422,
            content={"detail": jsonable_encoder(exc.errors())},
        )

    first_error = exc.errors()[0]
    field = _field_from_loc(first_error["loc"])
    message = _human_message(field, first_error["type"])

    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_error",
            "field": field,
            "message": message,
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception while processing %s", request.url.path)

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
