from pathlib import Path

from fastapi import FastAPI

from app.schemas import BrasalandBusinessInput

app = FastAPI(title="Brasaland API")
WEEKLY_INPUT_FIXTURE = Path(__file__).parent / "fixtures" / "weekly_input.json"


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/weekly-input", response_model=BrasalandBusinessInput)
def get_weekly_input() -> BrasalandBusinessInput:
    return BrasalandBusinessInput.model_validate_json(
        WEEKLY_INPUT_FIXTURE.read_text(encoding="utf-8")
    )