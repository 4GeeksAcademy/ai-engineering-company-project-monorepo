"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import incidents_router, suppliers_router
from routes.seed import seed_suppliers


@asynccontextmanager
async def lifespan(_: FastAPI):
	"""Ensure the supplier directory has its initial records on first startup."""
	seed_suppliers()
	yield


app = FastAPI(title="HealthCore Digital API", lifespan=lifespan)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:3000", "http://127.0.0.1:3000"],
	allow_credentials=True,
	allow_methods=["*"] ,
	allow_headers=["*"],
)
app.include_router(incidents_router)
app.include_router(suppliers_router)
