"""
services/api/routes/rfps.py
Router FastAPI para recepción async y consulta de tickets RFP (Hito 9 · Parte 1).
Solo dispara el pipeline de `data/pipelines/rfp_intake/` y consulta PostgreSQL.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from data.pipelines.rfp_intake.graph import run_rfp_intake_pipeline
from services.api.database import engine
from services.api.models import RFPDepartmentSection, RFPTicket
from services.api.routes.auth import get_current_user

router = APIRouter(prefix="/api/rfps", tags=["RFPs (Recepción y Enrutamiento)"])

RAW_RFP_DIR = Path("data/raw")


def _safe_json_load(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _serialize_ticket(ticket: RFPTicket, sections: List[RFPDepartmentSection] | None = None) -> Dict[str, Any]:
    return {
        "ticket_id": ticket.ticket_id,
        "rfp_id": ticket.rfp_id,
        "filename": ticket.filename,
        "raw_pdf_path": ticket.raw_pdf_path,
        "status": ticket.status,
        "classification_reason": ticket.classification_reason,
        "client_name": ticket.client_name,
        "client_hq": ticket.client_hq,
        "currency": ticket.currency,
        "services_requested": _safe_json_load(ticket.services_requested, []),
        "scope": ticket.scope,
        "deadline": ticket.deadline,
        "budget_range": ticket.budget_range,
        "departments_needed": _safe_json_load(ticket.departments_needed, []),
        "readability_metrics": _safe_json_load(ticket.readability_metrics, {}),
        "synthesizer_summary": ticket.synthesizer_summary,
        "handoff_payload": _safe_json_load(ticket.handoff_payload, {}),
        "error_detail": ticket.error_detail,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "sections": [
            {
                "id": s.id,
                "department_id": s.department_id,
                "department_name": s.department_name,
                "owner_name": s.owner_name,
                "key_aspects": _safe_json_load(s.key_aspects, []),
                "open_questions": _safe_json_load(s.open_questions, []),
            }
            for s in (sections or [])
        ],
    }


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_rfp_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Recibe una RFP en PDF, la guarda en `data/raw/`, crea el ticket y lanza el pipeline en background."""
    filename = file.filename or "rfp.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten archivos PDF (.pdf).")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo PDF está vacío.")

    RAW_RFP_DIR.mkdir(parents=True, exist_ok=True)
    ticket_id = str(uuid.uuid4())
    safe_name = Path(filename).name
    dest_path = RAW_RFP_DIR / f"{ticket_id}_{safe_name}"
    dest_path.write_bytes(content)

    ticket = RFPTicket(
        ticket_id=ticket_id,
        filename=safe_name,
        raw_pdf_path=str(dest_path),
        status="analizando",
    )
    with Session(engine) as session:
        session.add(ticket)
        session.commit()
        session.refresh(ticket)

    background_tasks.add_task(run_rfp_intake_pipeline, ticket.ticket_id)

    return {
        "ticket_id": ticket.ticket_id,
        "rfp_id": ticket.rfp_id,
        "status": ticket.status,
        "raw_pdf_path": ticket.raw_pdf_path,
        "message": "RFP recibida. Análisis agéntico en curso.",
    }


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK, include_in_schema=False)
def list_rfp_tickets(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Lista todos los tickets de RFP ordenados del más reciente al más antiguo."""
    with Session(engine) as session:
        tickets = session.exec(select(RFPTicket)).all()
        tickets_sorted = sorted(tickets, key=lambda t: t.created_at, reverse=True)
        return [_serialize_ticket(t) for t in tickets_sorted]


@router.get("/{ticket_id}", status_code=status.HTTP_200_OK)
def get_rfp_ticket(
    ticket_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Devuelve el estado actual del ticket, métricas, aspectos clave por departamento y handoff."""
    with Session(engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket RFP no encontrado.")
        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()
        return _serialize_ticket(ticket, sections)