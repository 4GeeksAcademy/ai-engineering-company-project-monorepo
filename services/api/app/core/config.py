"""Application configuration and settings."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# services/api (este archivo está en app/core/)
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "AI Engineering API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Auth (extend as needed)
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # Transactional email
    # pydantic-settings lo lee de la variable de entorno o de .env; "" = sin configurar
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Brasaland <onboarding@resend.dev>"
    BACKOFFICE_URL: str = "http://localhost:3002"

    # Database (extend when ready)
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"

    # AI / ML
    MODEL_NAME: str = ""

    model_config = SettingsConfigDict(
        # Ruta absoluta: "./.env" depende del cwd y falla si no lanzas uvicorn desde services/api
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Singleton accessor for settings."""
    return Settings()
