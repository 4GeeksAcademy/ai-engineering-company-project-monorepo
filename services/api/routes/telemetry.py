import os 
import uuid
import logging

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

from fastapi import APIRouter,Depends
from pydantic import BaseModel,ValidationError
from sqlmodel import SQLModel, Field, Session
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column, JSON, insert

from services.api.schemas import TelemetryEvent
from services.api.database import get_db
from services.api.cache import cache
from services.api.routes.auth import get_current_user
from services.telemetry.analysis import generate_telemetry_report


router = APIRouter(prefix="/telemetry", tags=["Telemetry"])
logger = logging.getLogger(__name__)

TELEMETRY_ENDPOINT = os.getenv("TELEMETRY_ENDPOINT", "http://localhost:8000/telemetry/events")

class RawTelemetryBatch(BaseModel):
    events: List[Dict[str, Any]]

class TelemetryEventDB(SQLModel, table=True):
    __tablename__= "telemetry_events"
    __table_args__= {"extend_existing": True}


    id:uuid.UUID = Field(primary_key=True)
    timestamp: datetime = Field(nullable=False)
    event_type: str = Field(nullable=False, index=True)
    service: str = Field(default="backoffice", nullable=False)
    session_id: Optional[str]= Field(default=None, nullable=True)
    user_id: Optional[str] = Field(default=None, nullable=True)
    request_id: str = Field(nullable=False)
    tags: Dict[str,Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON().with_variant(JSONB,"postgresql"), nullable=False)
    )


@router.post("/events")
def receive_telemetry(batch: RawTelemetryBatch, db: Session = Depends(get_db)):
    received = len(batch.events)
    valid_records: list[Dict[str,Any]] = []
    rejected = 0

    for raw_item in batch.events:
        try:
            event = TelemetryEvent.model_validate(raw_item)

            ts_str = event.timestamp.replace("Z", "+00:00")
            parsed_dt = datetime.fromisoformat(ts_str)

            record = {
                "id": uuid.UUID(event.eventId),
                "timestamp": parsed_dt,
                "event_type": event.event_type,
                "service": "backoffice",
                "session_id": event.sessionId,
                "user_id": event.userId,
                "request_id": event.requestId,
                "tags": event.properties,
            }
            valid_records.append(record)
        except (ValidationError, ValueError, Exception) as exc:
            logger.warning(f"Evento de telemetrúia rechazado por esquema: {exc}")
            rejected += 1

    stored = 0
    if valid_records:
        try:
            db.execute(insert(TelemetryEventDB), valid_records)
            db.commit()
            stored = len(valid_records)
        except Exception as e:
            db.rollback()
            logger.error(f"Error al ejecutar bulk insert en Supabase: {e}")
            rejected += len(valid_records)

    logger.info(f"📡 [TELEMETRÍA] Recibidos: {received}, Guardados: {stored}, Rechazados: {rejected}")
    return{
        "received": received,
        "stored": stored,
        "rejected": rejected
    }
    
@router.get("/report")
def get_telemetry_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict= Depends (get_current_user),
):
    if not start_date and not end_date:
        cache_key = "telemetry:report:default_7d"
    else:
        cache_key = f"telemetry:report:{start_date}:{end_date}"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"⚡ [CACHE HIT] Retornando reporte de telemetría ({cache_key})")
        return cached_data

    now = datetime.now(timezone.utc)
    if end_date:
        parsed_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        parsed_end = now
    if start_date:
        parsed_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        parsed_start = parsed_end - timedelta(days=7)

    logger.info(f"🔄 [CACHE MISS] Calculando reporte de telemetría de {parsed_start} a {parsed_end}")
    report = generate_telemetry_report(parsed_start, parsed_end)

    cache.set(cache_key, report, ttl_seconds=60, tag="telemetry")
    return report