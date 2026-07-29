"""Routes for suppliers directory API."""

from flask import Blueprint, request

from src.controllers.suppliers_controller import (
    create_supplier,
    delete_supplier,
    get_supplier_by_id,
    list_suppliers,
    update_supplier_rate,
    update_supplier_status,
)

suppliers_blueprint = Blueprint("suppliers", __name__)


@suppliers_blueprint.post("/suppliers")
def create_supplier_route():
    return create_supplier(request)


@suppliers_blueprint.get("/suppliers")
def list_suppliers_route():
    return list_suppliers(request)


@suppliers_blueprint.get("/suppliers/<supplier_id>")
def get_supplier_by_id_route(supplier_id: str):
    return get_supplier_by_id(supplier_id)


@suppliers_blueprint.patch("/suppliers/<supplier_id>/rate")
def update_supplier_rate_route(supplier_id: str):
    return update_supplier_rate(supplier_id, request)


@suppliers_blueprint.patch("/suppliers/<supplier_id>/status")
def update_supplier_status_route(supplier_id: str):
    return update_supplier_status(supplier_id, request)


@suppliers_blueprint.delete("/suppliers/<supplier_id>")
def delete_supplier_route(supplier_id: str):
    return delete_supplier(supplier_id)
