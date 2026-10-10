import os 
import logging
from fastapi import APIRouter
from services.api.schemas import TelemetryBatch

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])
logger = logging.getLogger(__name__)

TELEMETRY_ENDPOINT = os.getenv("TELEMETRY_ENDPOINT", "http://localhost:8000/telemetry/events")

@router.post("/events")
async def receive_telemetry(batch: TelemetryBatch):
    events_count = len(batch.events)
    event_types = [event.event_type for event in batch.events]

    print(f"📡 [TELEMETRÍA] Lote recibido: {events_count} eventos. Tipos: {event_types}")
    logger.info(f"Recibidos {events_count} eventos de telemetria: {event_types}")

    return {"received": events_count}