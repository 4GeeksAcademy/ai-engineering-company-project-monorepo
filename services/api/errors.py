"""HTTP error helpers for the Brasaland central API.

Every client error uses the same JSON envelope. Unhandled exceptions are logged
server-side and returned as a generic 500 — never a Python traceback.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from services.safe_errors import ExternalServiceError, public_error_text

logger = logging.getLogger("brasaland.api")

_STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "too_many_requests",
    500: "internal_error",
    503: "service_unavailable",
}

_DEFAULT_MESSAGES = {
    400: "The request could not be processed.",
    401: "Authentication is required.",
    403: "You do not have access to this action.",
    404: "The requested resource was not found.",
    409: "That record already exists.",
    422: "Please correct the highlighted fields and try again.",
    429: "Too many attempts. Wait a moment and try again.",
    500: "Internal server error",
    503: "This service is temporarily unavailable.",
}


def error_code_for_status(status_code: int) -> str:
    return _STATUS_CODES.get(status_code, "http_error")


def _public_message(status_code: int, detail: Any) -> str:
    default = _DEFAULT_MESSAGES.get(status_code, "The request failed.")
    if not isinstance(detail, str):
        return default
    return public_error_text(detail, default)


def _public_detail(status_code: int, detail: Any) -> Any:
    if status_code == 422 and isinstance(detail, list):
        return [
            {
                "loc": item.get("loc", []) if isinstance(item, dict) else [],
                "msg": item.get("msg", "Invalid value") if isinstance(item, dict) else "Invalid value",
                "type": item.get("type", "value_error") if isinstance(item, dict) else "value_error",
            }
            for item in detail
        ]
    return _public_message(status_code, detail)


def error_body(status_code: int, detail: Any = None) -> dict[str, Any]:
    """Structured JSON body: status, code, message, and FastAPI-compatible detail."""
    message = _public_message(status_code, detail)
    return {
        "status": status_code,
        "code": error_code_for_status(status_code),
        "message": message,
        "detail": _public_detail(status_code, detail),
    }


def error_response(
    status_code: int,
    detail: Any = None,
    *,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=error_body(status_code, detail),
        headers=headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        logger.warning(
            "http_error path=%s status=%s code=%s",
            request.url.path,
            exc.status_code,
            error_code_for_status(exc.status_code),
        )
        return error_response(exc.status_code, exc.detail, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.warning("validation_error path=%s", request.url.path)
        return error_response(422, exc.errors())

    @app.exception_handler(ExternalServiceError)
    async def handle_external_service_error(
        request: Request, exc: ExternalServiceError
    ) -> JSONResponse:
        logger.warning("external_service path=%s service=%s", request.url.path, exc.service)
        return error_response(503, str(exc))

    @app.exception_handler(Exception)
    async def handle_unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, ExternalServiceError):
            return await handle_external_service_error(request, exc)
        if isinstance(exc, (HTTPException, StarletteHTTPException)):
            return await handle_http_exception(request, exc)
        logger.exception("unhandled_error path=%s", request.url.path)
        return error_response(500, "Internal server error")
