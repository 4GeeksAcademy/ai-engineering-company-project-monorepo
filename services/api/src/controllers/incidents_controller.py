"""Incidents analysis controller."""

from __future__ import annotations

from flask import Request, jsonify

from src.services.incidents_analysis_service import analyze_incidents_csv

ACCEPTED_MIME_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
}


def _is_csv_file(file_storage) -> bool:
    filename = (file_storage.filename or "").lower()
    has_csv_extension = filename.endswith(".csv")
    has_csv_mime_type = (file_storage.mimetype or "") in ACCEPTED_MIME_TYPES
    return has_csv_extension and has_csv_mime_type


def analyze_incidents(request: Request):
    if request.mimetype != "multipart/form-data":
        return jsonify({"error": "El contenido debe enviarse como multipart/form-data."}), 400

    uploaded_file = request.files.get("file")
    if uploaded_file is None:
        return jsonify({"error": "Debes adjuntar un archivo CSV en el campo 'file'."}), 400

    if not _is_csv_file(uploaded_file):
        return jsonify({"error": "Formato invalido: el archivo debe ser un CSV valido (.csv)."}), 400

    csv_bytes = uploaded_file.read()
    if not csv_bytes:
        return jsonify({"error": "El archivo CSV esta vacio."}), 400

    try:
        summary = analyze_incidents_csv(csv_bytes)
    except ValueError as error:
        return jsonify({"error": f"No se pudo procesar el CSV: {error}"}), 400

    return jsonify({"summary": summary}), 200
