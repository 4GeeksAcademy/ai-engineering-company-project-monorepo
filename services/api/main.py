from contextlib import asynccontextmanager

from fastapi import FastAPI

from services.api import database
from services.api.routes.suppliers import router as suppliers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    database.close_db()


app = FastAPI(title="Brasaland Suppliers API", lifespan=lifespan)
app.include_router(suppliers_router, prefix="/suppliers")
app.include_router(suppliers_router, prefix="/api/suppliers", include_in_schema=False)


@app.get("/")
def root():
    return {
        "message": "Brasaland Suppliers API",
        "suppliers": "/suppliers",
        "docs": "/docs",
    }