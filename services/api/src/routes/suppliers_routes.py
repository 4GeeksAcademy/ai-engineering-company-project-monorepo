"""Routes for suppliers directory API."""

from fastapi import HTTPException
from flask import Blueprint, jsonify, request

from src.controllers.suppliers_controller import (
    create_supplier,
    delete_supplier,
    get_supplier_by_id,
    list_suppliers,
    update_supplier_rate,
    update_supplier_status,
)
from src.models.user import User
from src.services.auth_service import get_current_user

suppliers_blueprint = Blueprint("suppliers", __name__)


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


@suppliers_blueprint.post("/suppliers")
def create_supplier_route():
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return create_supplier(request)


@suppliers_blueprint.get("/suppliers")
def list_suppliers_route():
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return list_suppliers(request)


@suppliers_blueprint.get("/suppliers/<supplier_id>")
def get_supplier_by_id_route(supplier_id: str):
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return get_supplier_by_id(supplier_id)


@suppliers_blueprint.patch("/suppliers/<supplier_id>/rate")
def update_supplier_rate_route(supplier_id: str):
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return update_supplier_rate(supplier_id, request)


@suppliers_blueprint.patch("/suppliers/<supplier_id>/status")
def update_supplier_status_route(supplier_id: str):
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return update_supplier_status(supplier_id, request)


@suppliers_blueprint.delete("/suppliers/<supplier_id>")
def delete_supplier_route(supplier_id: str):
    current_user = _require_current_user()
    if isinstance(current_user, tuple):
        return current_user
    return delete_supplier(supplier_id)
