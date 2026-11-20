"""
data/pipelines/rfp_intake/graph.py
Grafo LangGraph integrado (Recepción, Enrutamiento, Generación y Evaluación).
Persistencia robusta en PostgreSQL/SQLModel.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import pickle
import sqlite3
import threading
from typing import Any, Dict, List, Optional

from langgraph.checkpoint.base import ChannelVersions, Checkpoint, CheckpointMetadata
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph
from langgraph.types import Command
from langchain_core.runnables import RunnableConfig
from sqlmodel import Session, delete, select

from data.pipelines.rfp_intake.nodes import (
    NEXOVA_DEPARTMENTS,
    _make_trace_entry,
    arbitration_node,
    classifier_node,
    department_human_approval_node,
    department_regenerate_on_rejection_node,
    draft_generation_node,
    evaluation_node,
    ingest_node,
    orchestrator_node,
    prepare_department_approval_node,
    route_after_human_approval,
    should_continue_generation_eval,
    synthesizer_node,
    ultimate_document_synthesizer_node,
    validate_human_approval_input,
    workers_node,
)
from data.pipelines.rfp_intake.state import DepartmentApprovalBranchState, RFPIntakeState
from services.api.database import engine as default_engine
from services.api.models import RFPDepartmentSection, RFPFinalDocument, RFPTicket

logger = logging.getLogger("nexova.rfp_graph")

DEFAULT_CHECKPOINT_DB = Path("services/api/data/rfp_checkpoints.db")


def get_ticket_thread_id(ticket_id: str) -> str:
    """Namespace de checkpoint global del ticket."""
    return f"rfp-{ticket_id}"


def get_department_thread_id(ticket_id: str, department_id: str) -> str:
    """Namespace de checkpoint aislado por ticket y departamento."""
    return f"rfp-{ticket_id}:{department_id}"


class SqliteCheckpointSaver(InMemorySaver):
    """
    Checkpointer persistente respaldado en SQLite para LangGraph.
    Garantiza que las interrupciones HITL sobrevivan reinicios del servidor
    sin mezclar checkpoints de tickets o departamentos concurrentes.
    """

    def __init__(self, db_path: str | Path = DEFAULT_CHECKPOINT_DB) -> None:
        super().__init__()
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._init_db()
        self._load_all_from_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rfp_thread_checkpoints (
                    thread_id TEXT PRIMARY KEY,
                    storage_blob BLOB NOT NULL,
                    writes_blob BLOB NOT NULL,
                    blobs_blob BLOB NOT NULL
                )
                """
            )
            conn.commit()

    def _load_all_from_db(self) -> None:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT thread_id, storage_blob, writes_blob, blobs_blob FROM rfp_thread_checkpoints"
            ).fetchall()
        for thread_id, s_blob, w_blob, b_blob in rows:
            thread_storage = pickle.loads(s_blob)
            for ns, cps in thread_storage.items():
                self.storage[thread_id][ns] = cps
            thread_writes = pickle.loads(w_blob)
            self.writes.update(thread_writes)
            thread_blobs = pickle.loads(b_blob)
            self.blobs.update(thread_blobs)

    def _persist_thread(self, thread_id: str) -> None:
        with self._lock:
            thread_storage = {
                ns: dict(cps) for ns, cps in self.storage.get(thread_id, {}).items()
            }
            thread_writes = {
                k: dict(v) for k, v in self.writes.items() if k[0] == thread_id
            }
            thread_blobs = {
                k: v for k, v in self.blobs.items() if k[0] == thread_id
            }
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO rfp_thread_checkpoints
                        (thread_id, storage_blob, writes_blob, blobs_blob)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        thread_id,
                        pickle.dumps(thread_storage),
                        pickle.dumps(thread_writes),
                        pickle.dumps(thread_blobs),
                    ),
                )
                conn.commit()

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        with self._lock:
            cfg = super().put(config, checkpoint, metadata, new_versions)
            thread_id = str(config["configurable"]["thread_id"])
            self._persist_thread(thread_id)
            return cfg

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Any,
        task_id: str,
        task_path: str = "",
    ) -> None:
        with self._lock:
            super().put_writes(config, writes, task_id, task_path)
            thread_id = str(config["configurable"]["thread_id"])
            self._persist_thread(thread_id)

    def delete_thread(self, thread_id: str) -> None:
        with self._lock:
            super().delete_thread(thread_id)
            with self._connect() as conn:
                conn.execute(
                    "DELETE FROM rfp_thread_checkpoints WHERE thread_id = ?",
                    (thread_id,),
                )
                conn.commit()


_default_checkpointer: Optional[SqliteCheckpointSaver] = None


def get_default_checkpointer() -> SqliteCheckpointSaver:
    global _default_checkpointer
    if _default_checkpointer is None:
        _default_checkpointer = SqliteCheckpointSaver(DEFAULT_CHECKPOINT_DB)
    return _default_checkpointer


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
        result = rfp_generation_app.invoke(initial_state)

        with Session(active_engine) as session:
            ticket = session.get(RFPTicket, ticket_id)
            sections = session.exec(
                select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
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
                sec.approval_status = dept_statuses.get(sec.department_id, "borrador_generado")
                session.add(sec)

            ticket.status = result.get("status", "needs_human_review")
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


# ===========================================================================
# Hito 9 · Parte 3: Subgrafos HITL con Interrupt/Resume, Arbitraje y Cierre
# ===========================================================================

def create_department_approval_graph(checkpointer=None):
    """
    Subgrafo aislado para la aprobación humana de un único departamento.
    Utiliza `interrupt()` y checkpointer persistente para pausar solo esta rama
    sin bloquear a los demás departamentos activos.
    """
    workflow = StateGraph(DepartmentApprovalBranchState)
    workflow.add_node("prepare_approval", prepare_department_approval_node)
    workflow.add_node("human_approval", department_human_approval_node)
    workflow.add_node("regenerate_on_rejection", department_regenerate_on_rejection_node)

    workflow.set_entry_point("prepare_approval")
    workflow.add_edge("prepare_approval", "human_approval")
    workflow.add_conditional_edges(
        "human_approval",
        route_after_human_approval,
        {
            "regenerate_on_rejection": "regenerate_on_rejection",
            END: END,
        },
    )
    workflow.add_edge("regenerate_on_rejection", "human_approval")

    active_cp = checkpointer if checkpointer is not None else get_default_checkpointer()
    return workflow.compile(checkpointer=active_cp)


def _route_after_arbitration(state: RFPIntakeState) -> str:
    """
    Solo permite pasar al Ultimate Document Synthesizer cuando todos los
    departamentos activos están aprobados y no hay bloqueos activos de arbitraje.
    """
    approvals = state.get("department_approvals", {})
    departments_needed = state.get("departments_needed", list(approvals.keys()))
    triggers = state.get("conflict_triggers", [])

    all_approved = bool(departments_needed) and all(
        approvals.get(d, {}).get("status") == "approved" for d in departments_needed
    )
    blocking_actions = {
        "sequenced_and_requested_changes",
        "blocked_for_headcount_review",
        "blocked_until_sla_24h_explicit",
        "rejected_after_iteration_limit",
    }
    has_blocking_trigger = any(
        t.get("detected") and t.get("applied_action") in blocking_actions
        for t in triggers
    )

    if all_approved and not has_blocking_trigger:
        return "ultimate_synthesizer"
    return END


def create_rfp_completion_graph(checkpointer=None):
    """
    Subgrafo de arbitraje estructurado (§7) y síntesis final del documento.
    """
    workflow = StateGraph(RFPIntakeState)
    workflow.add_node("arbitration", arbitration_node)
    workflow.add_node("ultimate_synthesizer", ultimate_document_synthesizer_node)

    workflow.set_entry_point("arbitration")
    workflow.add_conditional_edges(
        "arbitration",
        _route_after_arbitration,
        {
            "ultimate_synthesizer": "ultimate_synthesizer",
            END: END,
        },
    )
    workflow.add_edge("ultimate_synthesizer", END)

    active_cp = checkpointer if checkpointer is not None else get_default_checkpointer()
    return workflow.compile(checkpointer=active_cp)


def _build_ticket_metadata(ticket: RFPTicket) -> Dict[str, Any]:
    handoff = {}
    if ticket.handoff_payload:
        try:
            handoff = json.loads(ticket.handoff_payload)
        except Exception:
            handoff = {}
    return {
        "client_name": ticket.client_name or handoff.get("client_name") or "Cliente",
        "client_hq": ticket.client_hq or handoff.get("client_hq") or "España",
        "currency": ticket.currency or handoff.get("currency") or "EUR",
        "scope": ticket.scope,
        "deadline": ticket.deadline,
        "budget_range": ticket.budget_range,
    }


def start_rfp_approval_pipeline(
    ticket_id: str,
    db_engine=None,
    checkpointer=None,
) -> Dict[str, Any]:
    """
    Inicia la Parte 3 para un ticket cuyas secciones ya tienen borrador:
    1. Ejecuta arbitraje inicial sobre estado estructurado (§7).
    2. Lanza en paralelo las ramas de aprobación departamental bajo checkpoints
       aislados `rfp-{ticket_id}:{department_id}`, dejándolas pausadas en `interrupt`.
    3. Deja el ticket en estado `esperando_aprobación`.
    """
    active_engine = db_engine or default_engine
    active_cp = checkpointer if checkpointer is not None else get_default_checkpointer()
    dept_app = create_department_approval_graph(checkpointer=active_cp)

    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise ValueError(f"RFPTicket {ticket_id} no encontrado")
        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()
        if not sections:
            raise ValueError(f"El ticket {ticket_id} no tiene secciones departamentales.")

        metadata = _build_ticket_metadata(ticket)
        departments_needed = [s.department_id for s in sections]
        drafts_map: Dict[str, Dict[str, Any]] = {}
        approvals_map: Dict[str, Dict[str, Any]] = {}
        section_snapshots: List[Dict[str, Any]] = []

        for s in sections:
            eval_obj = json.loads(s.evaluation_results) if s.evaluation_results else {}
            draft_txt = s.draft_content or ""
            drafts_map[s.department_id] = {
                "department_id": s.department_id,
                "department_name": s.department_name,
                "owner_name": s.owner_name,
                "draft_content": draft_txt,
                "currency": metadata["currency"],
            }
            approvals_map[s.department_id] = {
                "status": "esperando_aprobación",
                "approver": s.owner_name,
            }
            section_snapshots.append({
                "id": s.id,
                "department_id": s.department_id,
                "department_name": s.department_name,
                "owner_name": s.owner_name,
                "key_aspects": json.loads(s.key_aspects or "[]"),
                "draft_content": draft_txt,
                "evaluation": eval_obj,
            })

        synthesizer_summary = ticket.synthesizer_summary or ""
        rfp_id = ticket.rfp_id

    # Arbitraje inicial previo al sign-off humano
    arb_state: RFPIntakeState = {
        "ticket_id": ticket_id,
        "rfp_id": rfp_id,
        "metadata": metadata,
        "departments_needed": departments_needed,
        "department_drafts": drafts_map,
        "department_approvals": approvals_map,
        "arbitration_iterations": 0,
        "synthesizer_summary": synthesizer_summary,
        "trace_entries": [],
        "execution_trace": [],
    }
    arb_updates = arbitration_node(arb_state)
    updated_drafts = arb_updates["department_drafts"]
    conflict_triggers = arb_updates["conflict_triggers"]

    # Lanza en paralelo cada rama departamental hasta su punto de interrupt()
    def _invoke_branch(sec_snap: Dict[str, Any]) -> tuple[str, str, Dict[str, Any]]:
        dept_id = sec_snap["department_id"]
        thread_id = get_department_thread_id(ticket_id, dept_id)
        branch_state: DepartmentApprovalBranchState = {
            "ticket_id": ticket_id,
            "rfp_id": rfp_id,
            "department_id": dept_id,
            "department_name": sec_snap["department_name"],
            "owner_name": sec_snap["owner_name"],
            "metadata": arb_updates["metadata"],
            "key_aspects": sec_snap["key_aspects"],
            "draft_content": updated_drafts.get(dept_id, {}).get("draft_content", sec_snap["draft_content"]),
            "evaluation": sec_snap["evaluation"],
            "approval_status": "esperando_aprobación",
            "approval_iteration": 0,
            "trace_entries": [],
        }
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        out = dept_app.invoke(branch_state, config=config)
        return dept_id, thread_id, out

    branch_results: Dict[str, Any] = {}
    thread_ids: Dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=max(1, len(section_snapshots))) as pool:
        for dept_id, thread_id, out in pool.map(_invoke_branch, section_snapshots):
            branch_results[dept_id] = out
            thread_ids[dept_id] = thread_id

    # Persistimos en SQLModel el estado `esperando_aprobación`
    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()
        for s in sections:
            s.draft_content = updated_drafts.get(s.department_id, {}).get("draft_content", s.draft_content)
            s.approval_status = "esperando_aprobación"
            session.add(s)

        if ticket:
            ticket.status = "esperando_aprobación"
            ticket.currency = arb_updates["metadata"].get("currency", ticket.currency)
            ticket.updated_at = datetime.now(timezone.utc).isoformat()
            session.add(ticket)
        session.commit()

    return {
        "ticket_id": ticket_id,
        "status": "esperando_aprobación",
        "thread_ids": thread_ids,
        "conflict_triggers": conflict_triggers,
        "trace_entries": arb_updates.get("trace_entries", []),
        "branches": branch_results,
    }


def submit_department_approval(
    ticket_id: str,
    department_id: str,
    decision: str,
    approver_name: Optional[str] = None,
    comments: Optional[str] = None,
    db_engine=None,
    checkpointer=None,
) -> Dict[str, Any]:
    """
    Punto de entrada explícito `resume` para un departamento específico:
    1. Valida la respuesta humana antes de reanudar el grafo.
    2. Reanuda exclusivamente el thread `rfp-{ticket_id}:{department_id}` sin bloquear otros departamentos.
    3. Si todos los departamentos activos están aprobados, ejecuta arbitraje + síntesis final (`terminado`).
    """
    active_engine = db_engine or default_engine
    active_cp = checkpointer if checkpointer is not None else get_default_checkpointer()

    # Validación temprana estricta antes de entrar al grafo
    validated = validate_human_approval_input(
        {"decision": decision, "approver_name": approver_name, "comments": comments},
        department_id,  # type: ignore[arg-type]
    )

    dept_app = create_department_approval_graph(checkpointer=active_cp)
    dept_thread_id = get_department_thread_id(ticket_id, department_id)
    dept_config: RunnableConfig = {"configurable": {"thread_id": dept_thread_id}}

    # Si la rama aún no fue iniciada en el checkpointer, la iniciamos primero hasta su interrupt
    snapshot = dept_app.get_state(dept_config)
    if not snapshot.next:
        start_rfp_approval_pipeline(ticket_id, db_engine=active_engine, checkpointer=active_cp)
        snapshot = dept_app.get_state(dept_config)

    # Reanudamos únicamente la rama de este departamento desde el punto exacto de interrupt()
    resumed_branch = dept_app.invoke(
        Command(
            resume={
                "decision": validated.decision,
                "approver_name": validated.approver_name,
                "comments": validated.comments,
            }
        ),
        config=dept_config,
    )

    branch_status = resumed_branch.get("approval_status", "esperando_aprobación")

    # Actualizamos la sección en base de datos
    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        if not ticket:
            raise ValueError(f"RFPTicket {ticket_id} no encontrado")

        sec = session.exec(
            select(RFPDepartmentSection)
            .where(RFPDepartmentSection.ticket_id == ticket_id)
            .where(RFPDepartmentSection.department_id == department_id)
        ).first()
        if not sec:
            raise ValueError(f"Sección '{department_id}' no encontrada en ticket {ticket_id}")

        sec.approval_status = branch_status
        sec.approver = resumed_branch.get("approver") or validated.approver_name
        sec.approved_at = resumed_branch.get("approved_at")
        if resumed_branch.get("draft_content"):
            sec.draft_content = resumed_branch["draft_content"]
        if resumed_branch.get("evaluation"):
            sec.evaluation_results = json.dumps(resumed_branch["evaluation"], ensure_ascii=False)
        session.add(sec)
        session.commit()

        # Recargamos todas las secciones del ticket para verificar si ya aprobaron todas
        all_sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()

        all_approved = bool(all_sections) and all(
            s.approval_status == "approved" for s in all_sections
        )

        if not all_approved:
            ticket.status = "esperando_aprobación"
            ticket.updated_at = datetime.now(timezone.utc).isoformat()
            session.add(ticket)
            session.commit()
            return {
                "ticket_id": ticket_id,
                "department_id": department_id,
                "department_status": branch_status,
                "status": ticket.status,
                "thread_id": dept_thread_id,
                "branch_state": resumed_branch,
                "final_document": None,
            }

        # Todos los departamentos aprobados -> ejecutar grafo de Arbitraje y Cierre Final
        metadata = _build_ticket_metadata(ticket)
        drafts_map: Dict[str, Dict[str, Any]] = {}
        approvals_map: Dict[str, Dict[str, Any]] = {}
        combined_trace: List[Dict[str, Any]] = []

        for s in all_sections:
            drafts_map[s.department_id] = {
                "department_id": s.department_id,
                "department_name": s.department_name,
                "owner_name": s.owner_name,
                "draft_content": s.draft_content or "",
                "currency": metadata["currency"],
            }
            approvals_map[s.department_id] = {
                "status": s.approval_status,
                "approver": s.approver or s.owner_name,
                "approved_at": s.approved_at,
            }
            d_snap = dept_app.get_state(
                {"configurable": {"thread_id": get_department_thread_id(ticket_id, s.department_id)}}
            )
            if d_snap.values and d_snap.values.get("trace_entries"):
                combined_trace.extend(d_snap.values["trace_entries"])

        combined_trace.append(
            _make_trace_entry(
                node="approval_convergence",
                agent="CompletionCoordinator",
                input_summary=f"approved_depts={[s.department_id for s in all_sections]}",
                output_summary="dispatching to arbitration & ultimate_synthesizer",
            )
        )

        synthesizer_summary = ticket.synthesizer_summary or ""
        rfp_id = ticket.rfp_id

    completion_app = create_rfp_completion_graph(checkpointer=active_cp)
    ticket_config: RunnableConfig = {"configurable": {"thread_id": get_ticket_thread_id(ticket_id)}}
    completion_state: RFPIntakeState = {
        "ticket_id": ticket_id,
        "rfp_id": rfp_id,
        "metadata": metadata,
        "departments_needed": [s.department_id for s in all_sections],
        "department_drafts": drafts_map,
        "department_approvals": approvals_map,
        "arbitration_iterations": 0,
        "synthesizer_summary": synthesizer_summary,
        "trace_entries": combined_trace,
        "execution_trace": [],
    }
    completion_result = completion_app.invoke(completion_state, config=ticket_config)

    final_status = completion_result.get("status", "esperando_aprobación")
    final_doc_dict = completion_result.get("final_document")
    full_trace = completion_result.get("trace_entries", combined_trace)
    triggers = completion_result.get("conflict_triggers", [])

    with Session(active_engine) as session:
        ticket = session.get(RFPTicket, ticket_id)
        all_sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == ticket_id)
        ).all()

        # Sincronizamos posibles correcciones del árbitro en secciones
        arb_approvals = completion_result.get("department_approvals", {})
        arb_drafts = completion_result.get("department_drafts", {})
        for s in all_sections:
            if s.department_id in arb_drafts and arb_drafts[s.department_id].get("draft_content"):
                s.draft_content = arb_drafts[s.department_id]["draft_content"]
            if s.department_id in arb_approvals and arb_approvals[s.department_id].get("status") != s.approval_status:
                s.approval_status = arb_approvals[s.department_id]["status"]
            session.add(s)

        if final_status == "terminado" and final_doc_dict:
            existing_doc = session.exec(
                select(RFPFinalDocument).where(RFPFinalDocument.ticket_id == ticket_id)
            ).first()
            if existing_doc:
                existing_doc.sections = json.dumps(final_doc_dict.get("sections", []), ensure_ascii=False)
                existing_doc.currency = final_doc_dict.get("currency", "EUR")
                existing_doc.markdown_content = final_doc_dict.get("markdown_content", "")
                existing_doc.arbitration_log = json.dumps(triggers, ensure_ascii=False)
                existing_doc.trace_log = json.dumps(full_trace, ensure_ascii=False)
                existing_doc.generated_at = final_doc_dict.get("generated_at", datetime.now(timezone.utc).isoformat())
                session.add(existing_doc)
            else:
                new_doc = RFPFinalDocument(
                    ticket_id=ticket_id,
                    rfp_id=final_doc_dict.get("rfp_id", rfp_id),
                    client_name=final_doc_dict.get("client_name"),
                    client_hq=final_doc_dict.get("client_hq"),
                    currency=final_doc_dict.get("currency", "EUR"),
                    sections=json.dumps(final_doc_dict.get("sections", []), ensure_ascii=False),
                    markdown_content=final_doc_dict.get("markdown_content", ""),
                    arbitration_log=json.dumps(triggers, ensure_ascii=False),
                    trace_log=json.dumps(full_trace, ensure_ascii=False),
                    generated_at=final_doc_dict.get("generated_at", datetime.now(timezone.utc).isoformat()),
                )
                session.add(new_doc)
            if ticket:
                ticket.status = "terminado"
                ticket.updated_at = datetime.now(timezone.utc).isoformat()
                session.add(ticket)
        else:
            if ticket:
                ticket.status = "esperando_aprobación"
                ticket.updated_at = datetime.now(timezone.utc).isoformat()
                session.add(ticket)

        session.commit()

    return {
        "ticket_id": ticket_id,
        "department_id": department_id,
        "department_status": branch_status,
        "status": final_status if final_doc_dict else "esperando_aprobación",
        "thread_id": dept_thread_id,
        "conflict_triggers": triggers,
        "trace_entries": full_trace,
        "final_document": final_doc_dict,
    }


def get_ticket_trace_and_conflicts(
    ticket_id: str,
    departments: List[str],
    checkpointer=None,
) -> Dict[str, Any]:
    """Recupera trazabilidad y conflictos del checkpointer para cualquier estado del ticket."""
    active_cp = checkpointer if checkpointer is not None else get_default_checkpointer()
    dept_app = create_department_approval_graph(checkpointer=active_cp)
    completion_app = create_rfp_completion_graph(checkpointer=active_cp)

    trace_entries: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []

    for dept_id in departments:
        snap = dept_app.get_state(
            {"configurable": {"thread_id": get_department_thread_id(ticket_id, dept_id)}}
        )
        if snap.values and snap.values.get("trace_entries"):
            trace_entries.extend(snap.values["trace_entries"])

    t_snap = completion_app.get_state(
        {"configurable": {"thread_id": get_ticket_thread_id(ticket_id)}}
    )
    if t_snap.values:
        if t_snap.values.get("trace_entries"):
            trace_entries = t_snap.values["trace_entries"]
        if t_snap.values.get("conflict_triggers"):
            triggers = t_snap.values["conflict_triggers"]

    trace_entries_sorted = sorted(trace_entries, key=lambda e: e.get("timestamp", ""))
    return {"trace_entries": trace_entries_sorted, "conflict_triggers": triggers}
        