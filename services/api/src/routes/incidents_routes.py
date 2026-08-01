"""Routes for incidents API."""

from fastapi import HTTPException
from flask import Blueprint, jsonify, request

from src.controllers.incidents_controller import analyze_incidents
from src.models.user import User
from src.services.auth_service import get_current_user

incidents_blueprint = Blueprint("incidents", __name__)


def _extract_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split(" ", 1)
    if len(parts) != 2:
        return None
    if parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def _require_current_user() -> User | tuple:
    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        return get_current_user(token)
    except HTTPException:
        return jsonify({"error": "Unauthorized"}), 401


@incidents_blueprint.post("/api/incidents/analyze")
def analyze_incidents_route():
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return analyze_incidents(request)
