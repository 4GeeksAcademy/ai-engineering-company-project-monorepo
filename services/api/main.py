from fastapi import FastAPI

from routes.suppliers import router as suppliers_router


app = FastAPI(
    title="TrackFlow Supplier Directory API",
    version="1.0.0",
)


app.include_router(suppliers_router)


@app.get("/")
def root():
    return {
        "message": "TrackFlow Supplier Directory API is running",
    }