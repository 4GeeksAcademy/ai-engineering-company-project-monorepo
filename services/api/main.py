import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import database_lifespan
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from routes.suppliers import router
from routes.users import router as users_router


def create_app(path: Path | None = None) -> FastAPI:
    application = FastAPI(title="TrackFlow Supplier Directory", lifespan=database_lifespan(path))

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        if request.url.path != "/api/incidents" and not request.url.path.startswith("/api/incidents/"):
            return await request_validation_exception_handler(request, error)
        messages = {
            "missing": "Este campo es obligatorio.",
            "string_type": "Debe ser un texto.",
            "string_too_short": "El texto no puede estar vacio.",
            "value_error": "El texto no puede estar vacio ni contener solo espacios.",
            "extra_forbidden": "Este campo no esta permitido.",
            "json_invalid": "El cuerpo debe contener JSON valido.",
            "uuid_parsing": "El identificador debe ser un UUID valido.",
            "uuid_type": "El identificador debe ser un UUID valido.",
            "model_attributes_type": "El cuerpo debe ser un objeto JSON con los campos de la incidencia.",
        }
        errors = []
        for item in error.errors():
            field = ".".join(str(part) for part in item["loc"][1:]) or "body"
            if item["type"] in {"enum", "literal_error"}:
                message = "Valor no permitido. Valores admitidos: " + item.get("ctx", {}).get("expected", "consulta el catalogo de incidencias")
            else:
                message = messages.get(item["type"], "El valor indicado no es valido para este campo.")
            errors.append({"field": field, "message": message})
        return JSONResponse(status_code=400, content={"detail": "Revisa los campos de la incidencia.", "errors": errors})

    @application.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception):
        return JSONResponse(status_code=500, content={"detail": "Error interno del servidor. Intentalo de nuevo mas tarde."})

    origins = os.environ.get("CORS_ORIGINS", "http://localhost:5174,http://127.0.0.1:5174")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins.split(","),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["content-type", "authorization"],
    )
    application.include_router(router)
    application.include_router(users_router)
    application.include_router(profiles_router)
    application.include_router(auth_router)
    application.include_router(incidents_router)
    return application


app = create_app()


def main():
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("SUPPLIERS_PORT", "8081")))