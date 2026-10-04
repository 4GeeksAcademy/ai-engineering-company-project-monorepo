from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.suppliers import router as suppliers_router
from seed import main as seed_suppliers


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_suppliers()
    yield


app = FastAPI(title="HealthCore Supplier Directory", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:43123",
        "http://localhost:43123",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "healthcore-supplier-api"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "HealthCore Supplier Directory",
        "suppliers": "/suppliers",
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status": exc.status_code},
    )
