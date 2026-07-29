"""CRUD controller for suppliers directory."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Request, jsonify
from pydantic import ValidationError
from tinydb.table import Document

from src.database import get_suppliers_table
from src.models.supplier import (
    SupplierCategory,
    SupplierCountry,
    SupplierCreate,
    SupplierRateUpdate,
    SupplierResponse,
    SupplierStatusUpdate,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validation_error_message(error: ValidationError) -> str:
    if not error.errors():
        return "Datos invalidos"
    return error.errors()[0].get("msg", "Datos invalidos")


def _serialize_supplier(document: Document) -> dict:
    payload = dict(document)
    payload["id"] = str(document.doc_id)

    if "updated_at" not in payload:
        payload["updated_at"] = _now_iso()

    supplier = SupplierResponse.model_validate(payload)
    return supplier.model_dump(mode="json")


def _get_supplier_document_by_id(raw_id: str) -> Document | None:
    if not raw_id.isdigit():
        return None

    doc_id = int(raw_id)
    if doc_id <= 0:
        return None

    suppliers_table = get_suppliers_table()
    return suppliers_table.get(doc_id=doc_id)


def create_supplier(request: Request):
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Body JSON invalido."}), 400

    try:
        supplier_create = SupplierCreate.model_validate(payload)
    except ValidationError as error:
        return jsonify({"error": _validation_error_message(error)}), 400

    suppliers_table = get_suppliers_table()
    supplier_data = supplier_create.model_dump(mode="json")
    supplier_data["updated_at"] = _now_iso()

    doc_id = suppliers_table.insert(supplier_data)
    created_document = suppliers_table.get(doc_id=doc_id)

    if created_document is None:
        return jsonify({"error": "No se pudo crear el proveedor."}), 500

    return jsonify(_serialize_supplier(created_document)), 201


def list_suppliers(request: Request):
    pais = request.args.get("pais")
    categoria = request.args.get("categoria")

    if pais is not None:
        try:
            SupplierCountry(pais)
        except ValueError:
            return jsonify({"error": "El valor de 'pais' no es valido."}), 400

    if categoria is not None:
        try:
            SupplierCategory(categoria)
        except ValueError:
            return jsonify({"error": "El valor de 'categoria' no es valido."}), 400

    suppliers_table = get_suppliers_table()
    documents = suppliers_table.all()

    if pais is not None:
        documents = [document for document in documents if document.get("pais") == pais]

    if categoria is not None:
        documents = [
            document
            for document in documents
            if categoria in (document.get("categorias") or [])
        ]

    return jsonify([_serialize_supplier(document) for document in documents]), 200


def get_supplier_by_id(supplier_id: str):
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    return jsonify(_serialize_supplier(document)), 200


def update_supplier_rate(supplier_id: str, request: Request):
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Body JSON invalido."}), 400

    try:
        rate_update = SupplierRateUpdate.model_validate(payload)
    except ValidationError as error:
        return jsonify({"error": _validation_error_message(error)}), 400

    suppliers_table = get_suppliers_table()
    suppliers_table.update(
        {
            "tarifa": rate_update.tarifa,
            "updated_at": _now_iso(),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = suppliers_table.get(doc_id=document.doc_id)
    if updated_document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    return jsonify(_serialize_supplier(updated_document)), 200


def update_supplier_status(supplier_id: str, request: Request):
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Body JSON invalido."}), 400

    try:
        status_update = SupplierStatusUpdate.model_validate(payload)
    except ValidationError as error:
        return jsonify({"error": _validation_error_message(error)}), 400

    suppliers_table = get_suppliers_table()
    suppliers_table.update(
        {
            "estado": status_update.estado.value,
            "updated_at": _now_iso(),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = suppliers_table.get(doc_id=document.doc_id)
    if updated_document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    return jsonify(_serialize_supplier(updated_document)), 200


def delete_supplier(supplier_id: str):
    document = _get_supplier_document_by_id(supplier_id)
    if document is None:
        return jsonify({"error": "Proveedor no encontrado."}), 404

    suppliers_table = get_suppliers_table()
    suppliers_table.remove(doc_ids=[document.doc_id])

    return jsonify({"message": "Proveedor eliminado."}), 200
