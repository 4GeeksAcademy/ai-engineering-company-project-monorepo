from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from incident_store import (
    BRANCHES,
    CATEGORIES,
    ORIGINS,
    STATUSES,
    TRANSITIONS,
    connect,
    create_incident,
    get_incident,
    list_incidents,
    summarize,
    update_incident_status,
)

router = APIRouter()

_SERVER_ERROR = {"message": "The server could not complete the request."}
_TRANSITION_MESSAGE = {
    "open": "An open incident can only move to in progress or discarded.",
    "in_progress": "An in-progress incident can only move to resolved or discarded.",
    "resolved": "A resolved incident cannot change status.",
    "discarded": "A discarded incident cannot change status.",
}


def _failure(errors: list[dict[str, str]]) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"field": errors[0]["field"], "message": errors[0]["message"], "errors": errors},
    )


def _text(payload: dict, field: str) -> str:
    value = payload.get(field)
    if not isinstance(value, str):
        return ""
    return value.strip()


def _enum_error(payload: dict, field: str, allowed: tuple[str, ...], message: str) -> dict[str, str] | None:
    value = payload.get(field)
    if not isinstance(value, str) or value not in allowed:
        return {"field": field, "message": message}
    return None


def _validate_new(payload: dict) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if not _text(payload, "title"):
        errors.append({"field": "title", "message": "Enter a title."})
    if not _text(payload, "description"):
        errors.append({"field": "description", "message": "Enter a description."})
    category_error = _enum_error(payload, "category", CATEGORIES, "Choose a valid category.")
    if category_error:
        errors.append(category_error)
    status_error = _enum_error(payload, "status", STATUSES, "Choose a valid status.")
    if status_error:
        errors.append(status_error)
    origin_error = _enum_error(payload, "origin", ORIGINS, "Choose a valid origin.")
    if origin_error:
        errors.append(origin_error)
    branch_error = _enum_error(payload, "branch", BRANCHES, "Choose a valid clinic.")
    if branch_error:
        errors.append(branch_error)
    return errors


async def _json_object(request: Request) -> dict | JSONResponse:
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"field": "body", "message": "Send the incident as JSON."})
    if not isinstance(payload, dict):
        return JSONResponse(
            status_code=400,
            content={"field": "body", "message": "Send the incident as a JSON object."},
        )
    return payload


def _filters(request: Request) -> dict[str, str] | JSONResponse:
    allowed = {
        "status": (STATUSES, "Choose a valid status."),
        "origin": (ORIGINS, "Choose a valid origin."),
        "branch": (BRANCHES, "Choose a valid clinic."),
        "category": (CATEGORIES, "Choose a valid category."),
    }
    filters: dict[str, str] = {}
    for field, (choices, message) in allowed.items():
        if field not in request.query_params:
            continue
        value = request.query_params[field]
        if value not in choices:
            return JSONResponse(status_code=400, content={"field": field, "message": message})
        filters[field] = value
    return filters


@router.post("/api/incidents")
async def post_incident(request: Request) -> JSONResponse:
    payload = await _json_object(request)
    if isinstance(payload, JSONResponse):
        return payload
    errors = _validate_new(payload)
    if errors:
        return _failure(errors)
    values = {
        "title": _text(payload, "title"),
        "description": _text(payload, "description"),
        "category": payload["category"],
        "status": payload["status"],
        "origin": payload["origin"],
        "branch": payload["branch"],
    }
    try:
        connection = connect()
        try:
            incident = create_incident(connection, values)
            connection.commit()
        finally:
            connection.close()
    except sqlite3.IntegrityError:
        return JSONResponse(
            status_code=400,
            content={"field": "body", "message": "A field has a missing or invalid value."},
        )
    except Exception:
        return JSONResponse(status_code=500, content=_SERVER_ERROR)
    return JSONResponse(status_code=201, content=incident)


@router.get("/api/incidents")
def get_incidents(request: Request) -> JSONResponse:
    filters = _filters(request)
    if isinstance(filters, JSONResponse):
        return filters
    try:
        connection = connect()
        try:
            incidents = list_incidents(connection, filters)
        finally:
            connection.close()
    except Exception:
        return JSONResponse(status_code=500, content=_SERVER_ERROR)
    return JSONResponse(status_code=200, content=incidents)


@router.get("/api/incidents/summary")
def get_summary() -> JSONResponse:
    try:
        connection = connect()
        try:
            payload = summarize(connection)
        finally:
            connection.close()
    except Exception:
        return JSONResponse(status_code=500, content=_SERVER_ERROR)
    return JSONResponse(status_code=200, content=payload)


@router.get("/api/incidents/{incident_id}")
def get_one(incident_id: str) -> JSONResponse:
    try:
        connection = connect()
        try:
            incident = get_incident(connection, incident_id)
        finally:
            connection.close()
    except Exception:
        return JSONResponse(status_code=500, content=_SERVER_ERROR)
    if incident is None:
        return JSONResponse(status_code=404, content={"error": "No incident exists with that id.", "status": 404})
    return JSONResponse(status_code=200, content=incident)


@router.patch("/api/incidents/{incident_id}/status")
async def patch_status(incident_id: str, request: Request) -> JSONResponse:
    payload = await _json_object(request)
    if isinstance(payload, JSONResponse):
        return payload
    status = payload.get("status")
    if not isinstance(status, str) or status not in STATUSES:
        return _failure([{"field": "status", "message": "Choose a valid status."}])
    try:
        connection = connect()
        try:
            current = get_incident(connection, incident_id)
            if current is None:
                response = JSONResponse(
                    status_code=404,
                    content={"error": "No incident exists with that id.", "status": 404},
                )
            elif status not in TRANSITIONS[current["status"]]:
                response = _failure(
                    [{"field": "status", "message": _TRANSITION_MESSAGE[current["status"]]}]
                )
            else:
                updated = update_incident_status(connection, incident_id, status)
                connection.commit()
                response = JSONResponse(status_code=200, content=updated)
        finally:
            connection.close()
    except sqlite3.IntegrityError:
        return JSONResponse(
            status_code=400,
            content={"field": "status", "message": "Choose a valid status."},
        )
    except Exception:
        return JSONResponse(status_code=500, content=_SERVER_ERROR)
    return response
