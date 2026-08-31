from fastapi import FastAPI

from routers.suppliers import router as suppliers_router


app = FastAPI(
    title="TrackFlow Supplier Directory API",
    version="0.1.0",
)


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
