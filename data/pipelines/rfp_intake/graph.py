"""
data/pipelines/rfp_intake/graph.py
Grafo LangGraph integrado (Recepción, Enrutamiento, Generación y Evaluación).
Persistencia robusta en PostgreSQL/SQLModel.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List

from langgraph.graph import END, StateGraph
from sqlmodel import Session, delete, select

from data.pipelines.rfp_intake.nodes import (
    classifier_node,
    draft_generation_node,
    evaluation_node,
    ingest_node,
    orchestrator_node,
    should_continue_generation_eval,
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


def create_rfp_full_graph():
    """Construye y compila el grafo completo de LangGraph (Partes 1 y 2)."""
    workflow = StateGraph(RFPIntakeState)

    # Nodos Parte 1: Ingesta, Clasificación, Asignación y Síntesis
    workflow.add_node("ingest", ingest_node)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("workers", workers_node)
    workflow.add_node("synthesizer", synthesizer_node)

    # Nodos Parte 2: Ciclo Generador-Evaluador
    workflow.add_node("draft_generation", draft_generation_node)
    workflow.add_node("evaluation", evaluation_node)

    # Aristas y Puntos de Decisión
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
    workflow.add_edge("draft_generation", "evaluation")

    # Bucle condicional de evaluación (reintenta o avanza a END)
    workflow.add_conditional_edges(
        "evaluation",
        should_continue_generation_eval,
        {
            "draft_generation": "draft_generation",
            END: END,
        },
    )

    return workflow.compile()


def create_rfp_generation_subgraph():
    """Subgrafo enfocado exclusivamente en la Generación y Evaluación a partir del handoff."""
    workflow = StateGraph(RFPIntakeState)
    workflow.add_node("draft_generation", draft_generation_node)
    workflow.add_node("evaluation", evaluation_node)

    workflow.set_entry_point("draft_generation")
    workflow.add_edge("draft_generation", "evaluation")
    workflow.add_conditional_edges(
        "evaluation",
        should_continue_generation_eval,
        {
            "draft_generation": "draft_generation",
            END: END,
        },
    )
    return workflow.compile()


rfp_intake_app = create_rfp_full_graph()
rfp_generation_app = create_rfp_generation_subgraph()


def run_rfp_intake_pipeline(ticket_id: str, db_engine=None) -> Dict[str, Any]:
    """
    Parte 1: Ejecuta clasificación y enrutamiento departamental.
    Persiste metadatos, secciones y handoff_payload con estado `analisis_completo`.
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
        # Ejecuta nodos hasta el synthesizer (Parte 1)
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

            # Persistencia de secciones departamentales con aspectos clave
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


def run_rfp_generation_pipeline(ticket_id: str, db_engine=None) -> Dict[str, Any]:
    """
    Parte 2: Consume estrictamente el handoff de la Parte 1 (sin re-parsear el PDF).
    Ejecuta el ciclo generador-evaluador y persiste borradores + evaluation_results.
    """
    active_engine = db_engine or default_engine

    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise ValueError(f"RFPTicket {ticket_id} no encontrado")

        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()

        if not sections:
            raise ValueError(f"No hay secciones departamentales registradas para el ticket {ticket_id}")

        metadata = {
            "client_name": ticket.client_name,
            "client_hq": ticket.client_hq,
            "currency": ticket.currency,
            "scope": ticket.scope,
            "deadline": ticket.deadline,
            "budget_range": ticket.budget_range,
        }

        department_tasks: List[Dict[str, Any]] = []
        for s in sections:
            department_tasks.append({
                "department_id": s.department_id,
                "key_aspects": json.loads(s.key_aspects or "[]"),
                "open_questions": json.loads(s.open_questions or "[]"),
            })

        initial_state: RFPIntakeState = {
            "ticket_id": ticket.ticket_id,
            "rfp_id": ticket.rfp_id,
            "metadata": metadata,
            "department_tasks": department_tasks,
            "departments_needed": json.loads(ticket.departments_needed or "[]"),
            "department_drafts": {},
            "evaluation_results": {},
            "iteration_counts": {},
            "department_statuses": {},
            "execution_trace": [],
        }

        # Actualiza el estado a generando_borrador antes de empezar
        ticket.status = "generando_borrador"
        ticket.updated_at = datetime.now(timezone.utc).isoformat()
        session.add(ticket)
        session.commit()

    try:
        result: Dict[str, Any] = dict(initial_state)

        for chunk in rfp_generation_app.stream(initial_state, stream_mode="updates"):
            for node_name, node_update in chunk.items():
                if not isinstance(node_update, dict):
                    continue
                result.update(node_update)

                with Session(active_engine) as session:
                    ticket = session.get(RFPTicket, ticket_id)
                    sections = session.exec(
                        select(RFPDepartmentSection).where(
                            RFPDepartmentSection.ticket_id == ticket_id
                        )
                    ).all()

                    drafts = result.get("department_drafts", {})
                    evals = result.get("evaluation_results", {})
                    dept_statuses = result.get("department_statuses", {})

                    for sec in sections:
                        dept_draft = drafts.get(sec.department_id)
                        dept_eval = evals.get(sec.department_id)
                        if dept_draft:
                            sec.draft_content = dept_draft.get("draft_content")
                        if dept_eval:
                            sec.evaluation_results = json.dumps(dept_eval, ensure_ascii=False)
                        if sec.department_id in dept_statuses:
                            sec.approval_status = dept_statuses[sec.department_id]
                        session.add(sec)

                    if ticket:
                        if node_name == "draft_generation":
                            # Al completar la redacción, el grafo entra en evaluación paralela
                            ticket.status = "en_evaluación"
                        elif node_name == "evaluation":
                            raw_status = node_update.get("status", "needs_human_review")
                            # Si alguna sección va a reintentar, vuelve a generar borrador
                            ticket.status = (
                                "generando_borrador"
                                if raw_status == "en_evaluacion"
                                else raw_status
                            )
                        ticket.updated_at = datetime.now(timezone.utc).isoformat()
                        session.add(ticket)

                    session.commit()

        return result
    except Exception as exc:
        logger.exception("Error en pipeline de generación para ticket %s", ticket_id)
        with Session(active_engine) as session:
            ticket = session.get(RFPTicket, ticket_id)
            if ticket:
                ticket.status = "error"
                ticket.error_detail = str(exc)
                ticket.updated_at = datetime.now(timezone.utc).isoformat()
                session.add(ticket)
                session.commit()
        return {"ticket_id": ticket_id, "status": "error", "error_detail": str(exc)}
        