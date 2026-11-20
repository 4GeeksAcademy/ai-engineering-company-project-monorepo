"""
services/api/routes/rfps.py
Router FastAPI para recepción, enrutamiento, generación, aprobación HITL y cierre de tickets RFP (Hito 9 · Partes 1, 2 y 3).
Protegido por defecto con Auth Guard Standard (Depends(get_current_user)).
"""
from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from data.pipelines.rfp_intake.graph import (
    get_ticket_trace_and_conflicts,
    run_rfp_generation_pipeline,
    run_rfp_intake_pipeline,
    start_rfp_approval_pipeline,
    submit_department_approval,
)
from services.api.database import engine
from services.api.models import RFPDepartmentSection, RFPFinalDocument, RFPTicket
from services.api.routes.auth import get_current_user
from services.api.sse_manager import rfp_broadcaster

router = APIRouter(prefix="/api/rfps", tags=["RFPs (Recepción, Enrutamiento, Generación y Aprobación)"])

RAW_RFP_DIR = Path("data/raw")


class DepartmentApprovalRequest(BaseModel):
    department_id: Literal["seleccion", "capacitacion", "soporte"]
    decision: Literal["approve", "reject", "request_changes"]
    approver_name: Optional[str] = None
    comments: Optional[str] = None


def _safe_json_load(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _serialize_final_doc(final_doc: Optional[RFPFinalDocument]) -> Optional[Dict[str, Any]]:
    if not final_doc:
        return None
    return {
        "ticket_id": final_doc.ticket_id,
        "rfp_id": final_doc.rfp_id,
        "client_name": final_doc.client_name,
        "client_hq": final_doc.client_hq,
        "currency": final_doc.currency,
        "sections": _safe_json_load(final_doc.sections, []),
        "markdown_content": final_doc.markdown_content,
        "arbitration_log": _safe_json_load(final_doc.arbitration_log, []),
        "trace_log": _safe_json_load(final_doc.trace_log, []),
        "generated_at": final_doc.generated_at,
    }


def _serialize_ticket(
    ticket: RFPTicket,
    sections: List[RFPDepartmentSection] | None = None,
    final_doc: Optional[RFPFinalDocument] = None,
    trace_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    serialized_doc = _serialize_final_doc(final_doc)
    trace_log = (
        serialized_doc["trace_log"]
        if serialized_doc and serialized_doc.get("trace_log")
        else (trace_info or {}).get("trace_entries", [])
    )
    conflict_triggers = (
        serialized_doc["arbitration_log"]
        if serialized_doc and serialized_doc.get("arbitration_log")
        else (trace_info or {}).get("conflict_triggers", [])
    )

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
                "draft_content": s.draft_content,
                "evaluation_results": _safe_json_load(s.evaluation_results, None),
                "approval_status": s.approval_status,
                "approver": s.approver,
                "approved_at": s.approved_at,
            }
            for s in (sections or [])
        ],
        "final_document": serialized_doc,
        "conflict_triggers": conflict_triggers,
        "trace_log": trace_log,
    }


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_rfp_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Parte 1: Recibe una RFP en PDF, crea el ticket y lanza la clasificación y enrutamiento en background."""
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
    
    await rfp_broadcaster.publish(
        event="rfp_ticket_created",
        event_id=ticket.ticket_id,
        data={
            "ticket_id": ticket.ticket_id,
            "rfp_id": ticket.rfp_id,
            "filename": ticket.filename,
            "status": ticket.status,
            "client_name": ticket.client_name,
            "created_at": ticket.created_at,
        },
    )

    background_tasks.add_task(run_rfp_intake_pipeline, ticket.ticket_id)

    return {
        "ticket_id": ticket.ticket_id,
        "rfp_id": ticket.rfp_id,
        "status": ticket.status,
        "raw_pdf_path": ticket.raw_pdf_path,
        "message": "RFP recibida. Análisis agéntico en curso.",
    }


@router.post("/{ticket_id}/generate", status_code=status.HTTP_202_ACCEPTED)
def trigger_generation_pipeline(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Parte 2: Consume el handoff de la Parte 1 y lanza el ciclo generador-evaluador en background."""
    with Session(engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket RFP no encontrado.")
        if ticket.status == "descartado":
            raise HTTPException(status_code=400, detail="No se pueden generar borradores para un ticket descartado.")

        ticket.status = "generando_borrador"
        session.add(ticket)
        session.commit()

    background_tasks.add_task(run_rfp_generation_pipeline, ticket_id)

    return {
        "ticket_id": ticket_id,
        "status": "generando_borrador",
        "message": "Ciclo generador-evaluador iniciado en segundo plano.",
    }


@router.post("/{ticket_id}/start-approval", status_code=status.HTTP_200_OK)
def start_approval_workflow(
    ticket_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Parte 3: Inicia los checkpoints paralelos de aprobación humana (HITL) por departamento."""
    try:
        start_rfp_approval_pipeline(ticket_id, db_engine=engine)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return get_rfp_ticket(ticket_id, current_user=current_user)


@router.post("/{ticket_id}/approve", status_code=status.HTTP_200_OK)
def submit_approval_decision(
    ticket_id: str,
    payload: DepartmentApprovalRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Parte 3: Reanuda únicamente la rama de un departamento desde su punto `interrupt`.
    Valida `approve` / `reject` / `request_changes` y cierra el documento si aprobaron todos.
    """
    try:
        submit_department_approval(
            ticket_id=ticket_id,
            department_id=payload.department_id,
            decision=payload.decision,
            approver_name=payload.approver_name or current_user.get("email"),
            comments=payload.comments,
            db_engine=engine,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return get_rfp_ticket(ticket_id, current_user=current_user)


@router.get("/{ticket_id}/final-document", status_code=status.HTTP_200_OK)
def get_final_proposal_document(
    ticket_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Devuelve el documento final consolidado cuando el ticket está en estado `terminado`."""
    with Session(engine) as session:
        final_doc = session.exec(
            select(RFPFinalDocument).where(RFPFinalDocument.ticket_id == ticket_id)
        ).first()
        if not final_doc:
            raise HTTPException(
                status_code=404,
                detail="El documento final aún no ha sido generado (faltan aprobaciones departamentales).",
            )
        return _serialize_final_doc(final_doc) or {}

@router.get("/stream", status_code=status.HTTP_200_OK)
async def stream_rfp_events(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StreamingResponse:
    """
    Stream SSE en tiempo real protegido por JWT.
    Emite eventos nombrados (`rfp_ticket_created`) y latidos keep-alive cada 15s.
    """
    async def event_generator():
        queue = rfp_broadcaster.subscribe()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield message
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            rfp_broadcaster.unsubscribe(queue)
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

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
    """Devuelve el detalle del ticket con secciones, borradores, evaluaciones, trazabilidad y documento final."""
    with Session(engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket RFP no encontrado.")
        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()
        final_doc = session.exec(
            select(RFPFinalDocument).where(RFPFinalDocument.ticket_id == ticket_id)
        ).first()
        trace_info = get_ticket_trace_and_conflicts(
            ticket_id,
            [s.department_id for s in sections],
        )
        return _serialize_ticket(ticket, sections, final_doc=final_doc, trace_info=trace_info)