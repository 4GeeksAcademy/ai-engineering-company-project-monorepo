"""
data/pipelines/rfp_intake/graph.py
Grafo LangGraph dedicado `rfp_intake` y runner con persistencia en SQLModel.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict

from langgraph.graph import END, StateGraph
from sqlmodel import Session, delete

from data.pipelines.rfp_intake.nodes import (
    classifier_node,
    ingest_node,
    orchestrator_node,
    synthesizer_node,
    workers_node,
)
from data.pipelines.rfp_intake.state import RFPIntakeState
from services.api.database import engine as default_engine
from services.api.models import RFPDepartmentSection, RFPTicket

logger = logging.getLogger("nexova.rfp_graph")


def _route_after_classifier(state: RFPIntakeState) -> str:
    """Si la RFP no es válida, termina el grafo en estado `descartado`."""
    if state.get("is_valid_rfp"):
        return "orchestrator"
    return END


def create_rfp_intake_graph():
    """Construye y compila el grafo LangGraph independiente de CX."""
    workflow = StateGraph(RFPIntakeState)

    workflow.add_node("ingest", ingest_node)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("workers", workers_node)
    workflow.add_node("synthesizer", synthesizer_node)

    workflow.set_entry_point("ingest")
    workflow.add_edge("ingest", "classifier")
    workflow.add_conditional_edges(
        "classifier",
        _route_after_classifier,
        {
            "orchestrator": "orchestrator",
            END: END,
        },
    )
    workflow.add_edge("orchestrator", "workers")
    workflow.add_edge("workers", "synthesizer")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()


rfp_intake_app = create_rfp_intake_graph()


def run_rfp_intake_pipeline(ticket_id: str, db_engine=None) -> Dict[str, Any]:
    """
    Ejecuta el grafo `rfp_intake` para un RFPTicket y persiste metadatos,
    secciones departamentales y handoff_payload en PostgreSQL/SQLModel.
    """
    active_engine = db_engine or default_engine

    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise ValueError(f"RFPTicket {ticket_id} no encontrado")
        initial_state: RFPIntakeState = {
            "ticket_id": ticket.ticket_id,
            "rfp_id": ticket.rfp_id,
            "raw_pdf_path": ticket.raw_pdf_path,
            "execution_trace": [],
        }

    try:
        result = rfp_intake_app.invoke(initial_state)

        with Session(active_engine) as session:
            ticket = session.get(RFPTicket, ticket_id)
            if not ticket:
                raise ValueError(f"RFPTicket {ticket_id} desapareció durante el análisis")

            metadata = result.get("metadata") or {}
            ticket.status = result.get("status", "error")
            ticket.classification_reason = result.get("classification_reason")
            ticket.readability_metrics = json.dumps(
                result.get("readability_metrics", {}), ensure_ascii=False
            )
            ticket.client_name = metadata.get("client_name")
            ticket.client_hq = metadata.get("client_hq")
            ticket.currency = metadata.get("currency")
            ticket.services_requested = json.dumps(
                metadata.get("services_requested", []), ensure_ascii=False
            )
            ticket.scope = metadata.get("scope")
            ticket.deadline = metadata.get("deadline")
            ticket.budget_range = metadata.get("budget_range")
            ticket.departments_needed = json.dumps(
                result.get("departments_needed", []), ensure_ascii=False
            )
            ticket.synthesizer_summary = result.get("synthesizer_summary")
            ticket.handoff_payload = json.dumps(
                result.get("handoff_payload", {}), ensure_ascii=False
            )
            ticket.error_detail = result.get("error_detail")
            ticket.updated_at = datetime.now(timezone.utc).isoformat()
            session.add(ticket)

            # Reemplaza secciones previas de este ticket (idempotencia)
            session.exec(
                delete(RFPDepartmentSection).where(
                    RFPDepartmentSection.ticket_id == ticket.ticket_id
                )
            )
            for worker in result.get("worker_results", []):
                section = RFPDepartmentSection(
                    ticket_id=ticket.ticket_id,
                    department_id=worker["department_id"],
                    department_name=worker["department_name"],
                    owner_name=worker["owner_name"],
                    key_aspects=json.dumps(
                        worker.get("key_aspects", []), ensure_ascii=False
                    ),
                    open_questions=json.dumps(
                        worker.get("open_questions", []), ensure_ascii=False
                    ),
                )
                session.add(section)

            session.commit()

        return result

    except Exception as exc:
        logger.exception("Error ejecutando pipeline rfp_intake para ticket %s", ticket_id)
        with Session(active_engine) as session:
            ticket = session.get(RFPTicket, ticket_id)
            if ticket:
                ticket.status = "error"
                ticket.error_detail = str(exc)
                ticket.updated_at = datetime.now(timezone.utc).isoformat()
                session.add(ticket)
                session.commit()
        return {"ticket_id": ticket_id, "status": "error", "error_detail": str(exc)}