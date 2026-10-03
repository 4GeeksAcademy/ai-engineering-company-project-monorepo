"""Error handling shared by the whole app."""

from __future__ import annotations

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse

# Routes that receive secrets or personal data: passwords, and the customer_email of an
# incident. FastAPI's default 422 body echoes the rejected ``input`` of every field,
# which would send that value back in the response and into proxy and access logs.
_CREDENTIAL_PATHS = ("/auth", "/users", "/api/incidents")


async def validation_error_handler(request: Request, exc: RequestValidationError):
    if not request.url.path.startswith(_CREDENTIAL_PATHS):
        return await request_validation_exception_handler(request, exc)
    errors = [{k: v for k, v in error.items() if k not in ("input", "ctx")} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})
