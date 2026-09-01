from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from routers.auth import router as auth_router
from routers.profiles import router as profiles_router
from routers.suppliers import router as suppliers_router
from routers.users import router as users_router

# Load environment variables from .env before anything else
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="TrackFlow Supplier Directory API",
    version="0.1.0",
)


app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)
app.include_router(suppliers_router)


@app.get("/")
def root():
    return {
        "message": "TrackFlow Supplier Directory API",
        "status": "ok",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
