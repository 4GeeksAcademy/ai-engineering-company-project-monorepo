"""Routes for incidents API."""

from flask import Blueprint, request

from src.controllers.incidents_controller import analyze_incidents

incidents_blueprint = Blueprint("incidents", __name__)


@incidents_blueprint.post("/api/incidents/analyze")
def analyze_incidents_route():
    return analyze_incidents(request)
