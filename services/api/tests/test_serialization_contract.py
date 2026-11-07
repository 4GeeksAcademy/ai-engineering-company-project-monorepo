"""Contract guard: every endpoint declares its response in the decorator and no schema leaks internal fields."""

from __future__ import annotations

import ast
from pathlib import Path

from fastapi.routing import APIRoute

import main
from routes import auth, incident_manager, incidents, inventory, profiles, suppliers, users

API_DIR = Path(main.__file__).parent
ROUTERS = [auth, incident_manager, incidents, inventory, profiles, suppliers, users]
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}
FORBIDDEN_FIELDS = {"hashed_password", "password", "token", "jti", "source_id", "user_id"}


def _decorator_calls(path: Path):
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.FunctionDef):
            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Call) and getattr(decorator.func, "attr", None) in HTTP_METHODS:
                    yield node.name, {keyword.arg for keyword in decorator.keywords}


def test_every_route_decorator_declares_response_model_or_response_class():
    # `response_class` covers the two bodiless/file endpoints (204 deletes, CSV export).
    files = [API_DIR / "main.py"] + [Path(module.__file__) for module in ROUTERS]
    undeclared = [
        f"{path.name}:{name}"
        for path in files
        for name, keywords in _decorator_calls(path)
        if not keywords & {"response_model", "response_class"}
    ]
    assert undeclared == []


def _field_names(model) -> set[str]:
    names = set(model.model_fields)
    for field in model.model_fields.values():
        for arg in (field.annotation, *getattr(field.annotation, "__args__", ())):
            if hasattr(arg, "model_fields"):
                names |= _field_names(arg)
    return names


def _response_models() -> dict[str, type]:
    models = {}
    for module in ROUTERS:
        for route in module.router.routes:
            if isinstance(route, APIRoute) and route.response_model is not None:
                inner = getattr(route.response_model, "__args__", (route.response_model,))[0]
                if hasattr(inner, "model_fields"):
                    models[f"{sorted(route.methods)[0]} {route.path}"] = inner
    return models


def test_no_response_model_exposes_credentials_or_internal_keys():
    leaks = {name: _field_names(model) & FORBIDDEN_FIELDS for name, model in _response_models().items()}
    assert {name: found for name, found in leaks.items() if found} == {}


def test_unauthenticated_auth_flows_do_not_echo_the_email():
    models = _response_models()
    for route in ("POST /users", "POST /auth/login", "POST /auth/forgot-password", "POST /auth/reset-password"):
        assert "email" not in _field_names(models[route]), route
