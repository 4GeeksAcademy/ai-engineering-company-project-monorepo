"""Error handling shared by the whole app.

* Anything unexpected is a generic ``500`` (``catch_unhandled_errors``): the
  client never sees a stack trace, an exception message or a file path. The
  details go to the server log under an ``error_id`` that is also returned, so
  a report can be matched with its log line.
* Invalid input to the incident API (``/api/incidents``) is a ``400`` that names
  the problematic field(s) (``describe_validation_errors``). Other domains keep
  FastAPI's ``422``.
* The body of a validation error never echoes what was sent (it could be a
  password, or the customer's email of an incident).
"""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# Routes that receive secrets or personal data: passwords, and the customer_email of an
# incident. FastAPI's default 422 body echoes the rejected ``input`` of every field,
# which would send that value back in the response and into proxy and access logs.
_CREDENTIAL_PATHS = ("/auth", "/users", "/api/incidents")

INCIDENT_API_PREFIX = "/api/incidents"
INTERNAL_ERROR_MESSAGE = "Internal server error. Please try again later."


# --- 500: never a stack trace ------------------------------------------------------------------

async def catch_unhandled_errors(request: Request, call_next):
    """Turn any exception no route handled into a generic JSON ``500``.

    It sits inside the CORS middleware (see ``main.py``), so the browser can read
    the answer instead of seeing an opaque network error.
    """
    try:
        return await call_next(request)
    except Exception:  # noqa: BLE001 - this is the last line of defence
        error_id = uuid.uuid4().hex[:8]
        logger.exception("Unhandled error [%s] on %s %s", error_id, request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": INTERNAL_ERROR_MESSAGE, "error_id": error_id})


# --- 400: the problematic field ----------------------------------------------------------------

def _is_incident_api(request: Request) -> bool:
    path = request.url.path.rstrip("/")
    return path == INCIDENT_API_PREFIX or path.startswith(INCIDENT_API_PREFIX + "/")


def _field_name(loc) -> str | None:
    names = [part for part in loc if isinstance(part, str) and part not in ("body", "query", "path")]
    return names[-1] if names else None


def _sentence(error: dict) -> str:
    """What is wrong, as a sentence a person can act on. Never quotes the rejected value."""
    kind, ctx, field = error["type"], error.get("ctx") or {}, _field_name(error["loc"])
    if kind == "value_error":
        # A rule written for people (e.g. "an incident from a branch must name it") is already a sentence.
        message = str(error["msg"]).removeprefix("Value error, ")
        return f"{field} must be a valid email address" if "email address" in message else message
    if field is None:  # the body as a whole
        return "The request body is required: send a JSON object" if kind == "missing" else "The request body must be a valid JSON object"
    if kind == "missing":
        return f"{field} is required"
    if kind == "string_too_short":
        minimum = ctx["min_length"]
        return f"{field} cannot be empty" if minimum == 1 else f"{field} must have at least {minimum} characters"
    if kind == "string_too_long":
        return f"{field} must have at most {ctx['max_length']} characters"
    if kind == "string_pattern_mismatch":
        return f"{field} does not have a valid format"
    if kind == "enum":
        return f"{field} must be one of: {ctx['expected']}"
    if kind == "extra_forbidden":
        return f"{field} is not a field you can set"
    if kind in ("greater_than_equal", "greater_than"):
        return f"{field} must be at least {ctx.get('ge', ctx.get('gt'))}"
    if kind in ("less_than_equal", "less_than"):
        return f"{field} must be at most {ctx.get('le', ctx.get('lt'))}"
    if kind.startswith("date") or kind.startswith("datetime"):
        return f"{field} must be a valid date (YYYY-MM-DD)"
    if kind in ("int_parsing", "int_type", "int_from_float"):
        return f"{field} must be a whole number"
    if kind.endswith("_type") or kind.endswith("_parsing"):
        return f"{field} has the wrong type"
    return f"{field}: {error['msg']}"


def describe_validation_errors(errors: list[dict], *, prefix: tuple = ()) -> list[dict]:
    """Pydantic/FastAPI errors as ``{field, loc, msg, type}`` (no ``input``, no ``ctx``)."""
    return [
        {
            "field": _field_name((*prefix, *error["loc"])),
            "loc": [*prefix, *error["loc"]],
            "msg": _sentence({**error, "loc": (*prefix, *error["loc"])}),
            "type": error["type"],
        }
        for error in errors
    ]


class InvalidRequest(Exception):
    """A request the incident API refuses for a reason found after parsing (``400``)."""

    def __init__(self, problems: list[dict]):
        self.problems = problems
        super().__init__("; ".join(problem["msg"] for problem in problems))

    @classmethod
    def on(cls, field: str, message: str, *, where: str = "body") -> "InvalidRequest":
        return cls([{"field": field, "loc": [where, field], "msg": message, "type": "value_error"}])

    @classmethod
    def from_validation(cls, errors: list[dict], *, prefix: tuple = ("body",)) -> "InvalidRequest":
        return cls(describe_validation_errors(errors, prefix=prefix))


def _bad_request(problems: list[dict]) -> JSONResponse:
    message = "The request is not valid: " + "; ".join(problem["msg"] for problem in problems) + "."
    return JSONResponse(status_code=400, content={"message": message, "detail": jsonable_encoder(problems)})


async def invalid_request_handler(request: Request, exc: InvalidRequest):
    return _bad_request(exc.problems)


async def validation_error_handler(request: Request, exc: RequestValidationError):
    if _is_incident_api(request):
        return _bad_request(describe_validation_errors(exc.errors()))
    if not request.url.path.startswith(_CREDENTIAL_PATHS):
        return await request_validation_exception_handler(request, exc)
    errors = [{k: v for k, v in error.items() if k not in ("input", "ctx")} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})


def document_400_for_the_incident_api(app: FastAPI) -> None:
    """The incident API never answers 422, so /docs advertises 400 (with the same body) instead."""
    original = app.openapi

    def openapi() -> dict:
        schema = original()
        for path, operations in schema["paths"].items():
            if not (path == INCIDENT_API_PREFIX or path.startswith(INCIDENT_API_PREFIX + "/")):
                continue
            for operation in operations.values():
                responses = operation.get("responses", {})
                if "422" in responses:
                    del responses["422"]
                    responses.setdefault(
                        "400",
                        {
                            "description": "Invalid request: `message` says what to fix and `detail` names each problematic field.",
                            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/InvalidRequestResponse"}}},
                        },
                    )
        return schema

    app.openapi = openapi
