"""
errors.py — Brasaland · Incident domain error hierarchy

Custom exceptions + global FastAPI exception handlers that:
  - Return 400 for validation errors (instead of FastAPI's default 422).
  - Never expose stack traces or internal details in 500 responses.
"""

from __future__ import annotations

import traceback
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Custom exception hierarchy
# ---------------------------------------------------------------------------

class IncidentBaseException(Exception):
    """Base class for all incident domain errors."""

    def __init__(self, message: str, status_code: int = 500, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.field = field


class IncidentValidationError(IncidentBaseException):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message, status_code=400, field=field)


class IncidentNotFoundError(IncidentBaseException):
    def __init__(self, message: str = "Incident not found"):
        super().__init__(message, status_code=404)


class IncidentInvalidTransitionError(IncidentBaseException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class IncidentDuplicateError(IncidentBaseException):
    def __init__(self, message: str = "Incident already exists"):
        super().__init__(message, status_code=409)


class IncidentPersistenceError(IncidentBaseException):
    def __init__(self, message: str = "Persistence layer error"):
        super().__init__(message, status_code=500)


class IncidentDependencyError(IncidentBaseException):
    def __init__(self, message: str = "Dependency unavailable"):
        super().__init__(message, status_code=500)


class IncidentInternalError(IncidentBaseException):
    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, status_code=500)


# ---------------------------------------------------------------------------
# Error response schema
# ---------------------------------------------------------------------------

class IncidentErrorResponse(BaseModel):
    code: int
    message: str
    field: str | None = None
    request_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])


# ---------------------------------------------------------------------------
# Sanitizer — never expose internals
# ---------------------------------------------------------------------------

# Patterns that indicate a message contains internal details
_SENSITIVE_PATTERNS = (
    "traceback",
    "password",
    "secret",
    "token",
    "/home/",
    "/usr/",
    "tinydb",
    ".json",
)

# Keep only safe characters for user-facing messages
_ALLOWED_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "áéíóúüñÁÉÍÓÚÜÑàèìòùçÀÈÌÒÙÇ"
    ".,;:!?¡¿-–—''\"\"()[]{}@/\\#%&*+=<>~€$¢£¥ "
    "\n\r\t"
)


def sanitize_error_for_response(error: Any) -> str:
    """Return a safe user-facing message, stripping internal details."""
    msg = str(error)
    lower = msg.lower()
    for pattern in _SENSITIVE_PATTERNS:
        if pattern in lower:
            return "An internal error occurred. Please try again later."
    # Remove non-printable or unusual characters that could leak internals
    sanitized = "".join(c if c in _ALLOWED_CHARS else " " for c in msg)
    sanitized = " ".join(sanitized.split())  # collapse whitespace
    return sanitized if sanitized else "An internal error occurred. Please try again later."


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------

def register_incident_error_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI app."""

    @app.exception_handler(IncidentBaseException)
    async def incident_exception_handler(request: Request, exc: IncidentBaseException) -> JSONResponse:
        req_id = request.state.request_id if hasattr(request.state, "request_id") else uuid.uuid4().hex[:12]
        body = IncidentErrorResponse(
            code=exc.status_code,
            message=sanitize_error_for_response(exc),
            field=exc.field,
            request_id=req_id,
        )
        return JSONResponse(status_code=exc.status_code, content=body.model_dump())

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Convert FastAPI 422 validation errors into our 400 format."""
        req_id = request.state.request_id if hasattr(request.state, "request_id") else uuid.uuid4().hex[:12]
        errors = exc.errors()
        messages: list[str] = []
        for err in errors:
            loc = err.get("loc", ())
            msg = err.get("msg", "Invalid value")
            field = ".".join(str(part) for part in loc if part != "body")
            messages.append(f"[{field}] {msg}" if field else msg)
        body = IncidentErrorResponse(
            code=400,
            message="; ".join(messages),
            field=None,
            request_id=req_id,
        )
        return JSONResponse(status_code=400, content=body.model_dump())

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all: never expose stack traces."""
        req_id = request.state.request_id if hasattr(request.state, "request_id") else uuid.uuid4().hex[:12]
        # Log internally (in production, use proper logging)
        traceback.print_exc()
        body = IncidentErrorResponse(
            code=500,
            message="An internal error occurred. Please try again later.",
            field=None,
            request_id=req_id,
        )
        return JSONResponse(status_code=500, content=body.model_dump())
