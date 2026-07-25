"""Flask entrypoint for incidents API."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from src.routes.incidents_routes import incidents_blueprint


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

    app.register_blueprint(incidents_blueprint)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "*")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        return response

    @app.route("/api/incidents/analyze", methods=["OPTIONS"])
    @app.route("/api/incidents/results/export", methods=["OPTIONS"])
    def incidents_preflight():
        return ("", 204)

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(_error):
        return jsonify({"error": "El archivo supera el tamano maximo permitido (10MB)."}), 400

    @app.errorhandler(Exception)
    def handle_unexpected_error(_error):
        return jsonify({"error": "Error interno del servidor."}), 500

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3001"))
    app.run(host="0.0.0.0", port=port)
