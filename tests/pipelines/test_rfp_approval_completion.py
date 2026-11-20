"""
tests/pipelines/test_rfp_approval_completion.py
Tests unitarios, de concurrencia bajo interrupt, arbitraje estructurado (§7)
y flujo reproducible End-to-End (Partes 1 -> 2 -> 3) para Hito 9.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from data.pipelines.rfp_intake import graph as rfp_graph
from data.pipelines.rfp_intake import nodes as rfp_nodes
from services.api.models import RFPDepartmentSection, RFPFinalDocument, RFPTicket
from services.api.routes import rfps as rfps_route
from services.api.routes.auth import get_current_user


@pytest.fixture(autouse=True)
def _force_deterministic_mode(monkeypatch):
    """Fuerza modo determinista sin llamadas externas a OpenAI."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


@pytest.fixture()
def temp_env(tmp_path: Path):
    db_path = tmp_path / "test_rfp_part3.db"
    cp_path = tmp_path / "test_rfp_checkpoints.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    checkpointer = rfp_graph.SqliteCheckpointSaver(cp_path)
    return engine, checkpointer, cp_path


def _seed_ticket_with_drafts(engine, ticket_id: str = "ticket-hitl-001") -> None:
    ticket = RFPTicket(
        ticket_id=ticket_id,
        rfp_id=f"RFP-{ticket_id[-3:].upper()}",
        filename="nexova-request-1.pdf",
        raw_pdf_path="data/raw/nexova-request-1.pdf",
        status="listo_para_aprobacion",
        client_name="Vantex Retail Group",
        client_hq="España",
        currency="EUR",
        departments_needed=json.dumps(["seleccion", "capacitacion"]),
        synthesizer_summary="Propuesta para Vantex Retail Group (Madrid, EUR): Selección + Capacitación.",
    )
    sec_sel = RFPDepartmentSection(
        ticket_id=ticket_id,
        department_id="seleccion",
        department_name="Talent Selection Operations",
        owner_name="Javier Almeida",
        key_aspects=json.dumps(["5 mandos medios para retail"]),
        draft_content=(
            "Propuesta Selección en EUR. Tiempo estimado de cierre: 18 días hábiles. "
            "Incluye garantía de satisfacción estándar de 90 días para cliente del sector retail."
        ),
        evaluation_results=json.dumps({"overall_pass": True, "iteration": 1}),
        approval_status="aprobado_evaluacion",
    )
    sec_cap = RFPDepartmentSection(
        ticket_id=ticket_id,
        department_id="capacitacion",
        department_name="Corporate Training",
        owner_name="Elena Vargas",
        key_aspects=json.dumps(["Programa trimestral de liderazgo"]),
        draft_content=(
            "Propuesta Capacitación en EUR. Inicio en 25 días tras cierre de selección. "
            "Incluye garantía de satisfacción estándar de 90 días para cliente del sector retail."
        ),
        evaluation_results=json.dumps({"overall_pass": True, "iteration": 1}),
        approval_status="aprobado_evaluacion",
    )
    with Session(engine) as session:
        session.add(ticket)
        session.add(sec_sel)
        session.add(sec_cap)
        session.commit()


# ---------------------------------------------------------------------------
# 1. Namespacing de thread_id y persistencia real del Checkpointer SQLite
# ---------------------------------------------------------------------------

def test_thread_namespacing_and_sqlite_checkpoint_recovery(temp_env):
    engine, checkpointer, cp_path = temp_env
    _seed_ticket_with_drafts(engine, "ticket-ns-A")
    _seed_ticket_with_drafts(engine, "ticket-ns-B")

    res_a = rfp_graph.start_rfp_approval_pipeline("ticket-ns-A", db_engine=engine, checkpointer=checkpointer)
    res_b = rfp_graph.start_rfp_approval_pipeline("ticket-ns-B", db_engine=engine, checkpointer=checkpointer)

    assert res_a["thread_ids"]["seleccion"] == "rfp-ticket-ns-A:seleccion"
    assert res_b["thread_ids"]["seleccion"] == "rfp-ticket-ns-B:seleccion"
    assert res_a["thread_ids"]["seleccion"] != res_b["thread_ids"]["seleccion"]

    # Simulamos reinicio creando un nuevo SqliteCheckpointSaver sobre el mismo archivo
    restarted_cp = rfp_graph.SqliteCheckpointSaver(cp_path)
    dept_app = rfp_graph.create_department_approval_graph(checkpointer=restarted_cp)

    snap_a = dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-ns-A:seleccion"}})
    snap_b = dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-ns-B:seleccion"}})
    assert snap_a.next == ("human_approval",)
    assert snap_b.next == ("human_approval",)


# ---------------------------------------------------------------------------
# 2. Paralelismo real bajo interrupt: aprobar B mientras A sigue interrumpido
# ---------------------------------------------------------------------------

def test_parallel_interrupt_approves_b_while_a_remains_paused_then_completes(temp_env):
    engine, checkpointer, _ = temp_env
    ticket_id = "ticket-par-001"
    _seed_ticket_with_drafts(engine, ticket_id)

    start_res = rfp_graph.start_rfp_approval_pipeline(ticket_id, db_engine=engine, checkpointer=checkpointer)
    assert start_res["status"] == "esperando_aprobación"

    dept_app = rfp_graph.create_department_approval_graph(checkpointer=checkpointer)
    assert dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-par-001:seleccion"}}).next == ("human_approval",)
    assert dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-par-001:capacitacion"}}).next == ("human_approval",)

    # Departamento B (capacitacion -> Elena Vargas) aprueba primero
    step1 = rfp_graph.submit_department_approval(
        ticket_id=ticket_id,
        department_id="capacitacion",
        decision="approve",
        approver_name="Elena Vargas",
        comments="Programa validado",
        db_engine=engine,
        checkpointer=checkpointer,
    )
    assert step1["department_status"] == "approved"
    assert step1["status"] == "esperando_aprobación"
    assert step1["final_document"] is None

    # Verificamos que capacitacion terminó su rama, mientras seleccion SIGUE interrumpida
    assert dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-par-001:capacitacion"}}).next == ()
    assert dept_app.get_state({"configurable": {"thread_id": "rfp-ticket-par-001:seleccion"}}).next == ("human_approval",)

    # Ahora Departamento A (seleccion -> Javier Almeida) reanuda y aprueba
    step2 = rfp_graph.submit_department_approval(
        ticket_id=ticket_id,
        department_id="seleccion",
        decision="approve",
        approver_name="Javier Almeida",
        db_engine=engine,
        checkpointer=checkpointer,
    )
    assert step2["department_status"] == "approved"
    assert step2["status"] == "terminado"
    assert step2["final_document"] is not None
    assert "Vantex Retail Group" in step2["final_document"]["markdown_content"]
    assert "Javier Almeida" in step2["final_document"]["markdown_content"]
    assert "Elena Vargas" in step2["final_document"]["markdown_content"]

    with Session(engine) as session:
        saved_ticket = session.get(RFPTicket, ticket_id)
        assert saved_ticket.status == "terminado"
        saved_doc = session.exec(
            select(RFPFinalDocument).where(RFPFinalDocument.ticket_id == ticket_id)
        ).first()
        assert saved_doc is not None
        assert saved_doc.currency == "EUR"
        trace_log = json.loads(saved_doc.trace_log or "[]")
        assert len(trace_log) >= 4
        assert all({"node", "agent", "input_summary", "output_summary", "timestamp"} <= set(e.keys()) for e in trace_log)


# ---------------------------------------------------------------------------
# 3. Validación humana + Ciclo de Request Changes con límite de iteraciones
# ---------------------------------------------------------------------------

def test_human_validation_rejects_invalid_decision(temp_env):
    engine, checkpointer, _ = temp_env
    with pytest.raises(ValueError, match="Decisión humana inválida"):
        rfp_graph.submit_department_approval(
            ticket_id="any-ticket",
            department_id="seleccion",
            decision="tal_vez",
            db_engine=engine,
            checkpointer=checkpointer,
        )


def test_human_request_changes_loops_and_stops_at_iteration_limit(temp_env):
    engine, checkpointer, _ = temp_env
    ticket_id = "ticket-loop-001"
    _seed_ticket_with_drafts(engine, ticket_id)

    rfp_graph.start_rfp_approval_pipeline(ticket_id, db_engine=engine, checkpointer=checkpointer)
    dept_app = rfp_graph.create_department_approval_graph(checkpointer=checkpointer)
    sel_cfg = {"configurable": {"thread_id": "rfp-ticket-loop-001:seleccion"}}

    # Iteración 1: solicita cambios -> regenera y vuelve a pausar en human_approval
    r1 = rfp_graph.submit_department_approval(
        ticket_id=ticket_id,
        department_id="seleccion",
        decision="request_changes",
        approver_name="Javier Almeida",
        comments="Detallar horas de consultoría",
        db_engine=engine,
        checkpointer=checkpointer,
    )
    assert r1["department_status"] == "esperando_aprobación"
    assert dept_app.get_state(sel_cfg).next == ("human_approval",)

    # Iteración 2: vuelve a solicitar cambios -> sigue pausando
    r2 = rfp_graph.submit_department_approval(
        ticket_id=ticket_id,
        department_id="seleccion",
        decision="request_changes",
        approver_name="Javier Almeida",
        comments="Falta desglose senior",
        db_engine=engine,
        checkpointer=checkpointer,
    )
    assert r2["department_status"] == "esperando_aprobación"
    assert dept_app.get_state(sel_cfg).next == ("human_approval",)

    # Iteración 3 (límite MAX_APPROVAL_ITERATIONS = 3): detiene bucle en needs_human_review
    r3 = rfp_graph.submit_department_approval(
        ticket_id=ticket_id,
        department_id="seleccion",
        decision="request_changes",
        approver_name="Javier Almeida",
        comments="Escalar por discrepancia persistente",
        db_engine=engine,
        checkpointer=checkpointer,
    )
    assert r3["department_status"] == "needs_human_review"
    assert dept_app.get_state(sel_cfg).next == ()


# ---------------------------------------------------------------------------
# 4. Nodo de Arbitraje Estructurado (§7): Triggers y Árbitros Fijos
# ---------------------------------------------------------------------------

def test_arbitration_triggers_match_briefing_rules():
    # Caso A: ttc-vs-training-window + currency-mismatch (España con USD)
    sections_a = {
        "seleccion": {"draft_content": "Cierre en 10 días hábiles en USD.", "currency": "USD"},
        "capacitacion": {"draft_content": "Formación con inicio en 5 días en USD.", "currency": "USD"},
    }
    metadata_a = {"client_hq": "España", "currency": "USD"}
    res_a = rfp_nodes.detect_conflict_triggers(sections_a, metadata_a)
    by_id_a = {r.trigger_id: r for r in res_a}

    assert by_id_a["ttc-vs-training-window"].detected is True
    assert "Marcos Ibáñez" in by_id_a["ttc-vs-training-window"].arbitrator
    assert by_id_a["currency-mismatch"].detected is True
    assert by_id_a["currency-mismatch"].applied_action == "rewritten_to_EUR"

    # Caso B: support-sla-missing
    sections_b = {
        "soporte": {"draft_content": "Equipo de 12 agentes dedicados en USD.", "currency": "USD"},
    }
    metadata_b = {"client_hq": "Miami", "currency": "USD"}
    res_b = rfp_nodes.detect_conflict_triggers(sections_b, metadata_b)
    by_id_b = {r.trigger_id: r for r in res_b}

    assert by_id_b["support-sla-missing"].detected is True
    assert "Roberto Díaz" in by_id_b["support-sla-missing"].arbitrator
    assert by_id_b["currency-mismatch"].detected is False


# ---------------------------------------------------------------------------
# 5. Ruta End-to-End Reproducible (Partes 1 -> 2 -> 3 vía FastAPI + Resumes)
# ---------------------------------------------------------------------------

def test_end_to_end_part1_to_part3_reproducible_http_flow(monkeypatch, temp_env, tmp_path: Path):
    engine, checkpointer, _ = temp_env

    markdown_rfp = (
        "# Solicitud de Propuesta (RFP) - Vantex Retail Group\n"
        "Sede: Madrid, España. Presupuesto: 85.000 EUR. Fecha límite: 30 de Noviembre.\n\n"
        "Búsqueda ejecutiva (headhunting) para contratar 5 mandos medios de operaciones retail.\n\n"
        "Programa trimestral de capacitación corporativa en liderazgo presencial para 20 participantes."
    )
    monkeypatch.setattr(rfp_nodes, "convert_pdf_to_markdown", lambda _path: markdown_rfp)

    # Conectamos el checkpointer aislado y engine temporal al router FastAPI
    monkeypatch.setattr(rfps_route, "engine", engine)
    monkeypatch.setattr(rfps_route, "RAW_RFP_DIR", tmp_path / "raw")
    monkeypatch.setattr(rfp_graph, "get_default_checkpointer", lambda: checkpointer)

    # Hacemos síncronos los runners en background dentro del router para test determinista
    monkeypatch.setattr(
        rfps_route,
        "run_rfp_intake_pipeline",
        lambda tid: rfp_graph.run_rfp_intake_pipeline(tid, db_engine=engine),
    )
    monkeypatch.setattr(
        rfps_route,
        "run_rfp_generation_pipeline",
        lambda tid: rfp_graph.run_rfp_generation_pipeline(tid, db_engine=engine),
    )

    app = FastAPI()
    app.include_router(rfps_route.router)
    app.dependency_overrides[get_current_user] = lambda: {"email": "ventas@nexova.com"}
    client = TestClient(app)

    # PARTE 1: Upload PDF -> 202 -> analisis_completo
    res_up = client.post(
        "/api/rfps/upload",
        files={"file": ("nexova-request-1.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert res_up.status_code == 202
    ticket_id = res_up.json()["ticket_id"]

    t_p1 = client.get(f"/api/rfps/{ticket_id}").json()
    assert t_p1["status"] == "analisis_completo"
    assert set(t_p1["departments_needed"]) == {"seleccion", "capacitacion"}

    # PARTE 2: Generación + Evaluación paralela -> listo_para_aprobacion
    res_gen = client.post(f"/api/rfps/{ticket_id}/generate")
    assert res_gen.status_code == 202

    t_p2 = client.get(f"/api/rfps/{ticket_id}").json()
    assert t_p2["status"] == "listo_para_aprobacion"
    assert all(sec["draft_content"] for sec in t_p2["sections"])

    # PARTE 3a: Inicio de puntos HITL -> esperando_aprobación
    res_start = client.post(f"/api/rfps/{ticket_id}/start-approval")
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "esperando_aprobación"
    assert client.get(f"/api/rfps/{ticket_id}/final-document").status_code == 404

    # PARTE 3b: Capacitación aprueba primero (Elena Vargas)
    res_cap = client.post(
        f"/api/rfps/{ticket_id}/approve",
        json={"department_id": "capacitacion", "decision": "approve", "approver_name": "Elena Vargas"},
    )
    assert res_cap.status_code == 200
    assert res_cap.json()["status"] == "esperando_aprobación"

    # PARTE 3c: Selección aprueba segundo (Javier Almeida) -> cierre automático a terminado
    res_sel = client.post(
        f"/api/rfps/{ticket_id}/approve",
        json={"department_id": "seleccion", "decision": "approve", "approver_name": "Javier Almeida"},
    )
    assert res_sel.status_code == 200
    final_ticket = res_sel.json()
    assert final_ticket["status"] == "terminado"
    assert final_ticket["final_document"] is not None

    # Consulta directa del documento final
    res_doc = client.get(f"/api/rfps/{ticket_id}/final-document")
    assert res_doc.status_code == 200
    doc_data = res_doc.json()
    assert doc_data["currency"] == "EUR"
    assert "Vantex Retail Group" in doc_data["markdown_content"]
    assert "90 días" in doc_data["markdown_content"]
    assert len(doc_data["sections"]) == 2
    assert len(doc_data["trace_log"]) >= 4
