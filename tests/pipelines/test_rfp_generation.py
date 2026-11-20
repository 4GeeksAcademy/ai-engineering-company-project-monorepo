"""
tests/pipelines/test_rfp_generation.py
Tests unitarios y de integración deterministas para Hito 9 (Parte 2: Generación y Evaluación de Respuestas).
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
from data.pipelines.rfp_intake.schemas import DepartmentDraft
from services.api.models import RFPDepartmentSection, RFPTicket
from services.api.routes import rfps as rfps_route
from services.api.routes.auth import get_current_user


@pytest.fixture(autouse=True)
def _force_deterministic_mode(monkeypatch):
    """Fuerza fallback determinista sin llamadas externas a OpenAI."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


@pytest.fixture()
def temp_engine(tmp_path: Path):
    db_path = tmp_path / "test_rfp_gen.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    return engine


# ---------------------------------------------------------------------------
# 1. Tests de Agentes Generadores Departamentales
# ---------------------------------------------------------------------------

def test_generate_department_draft_creates_compliant_section():
    metadata = {
        "client_name": "Vantex Retail Group",
        "client_hq": "España",
        "currency": "EUR",
        "scope": "Búsqueda ejecutiva y capacitación",
    }
    task = {
        "department_id": "seleccion",
        "key_aspects": ["Contratación de 5 mandos medios para retail"],
    }
    draft = rfp_nodes.generate_department_draft(metadata, task)

    assert draft.department_id == "seleccion"
    assert draft.owner_name == "Javier Almeida"
    assert "EUR" in draft.draft_content
    assert "90 días" in draft.draft_content
    assert "18 días hábiles" in draft.draft_content  # >= 15 días


# ---------------------------------------------------------------------------
# 2. Tests de Evaluadores y Fallos de Compliance (BRIEFING §5)
# ---------------------------------------------------------------------------

def test_evaluate_compliance_passes_on_valid_draft():
    metadata = {"client_hq": "España", "currency": "EUR"}
    valid_text = (
        "Propuesta para cliente del sector retail en España. "
        "Garantía de satisfacción estándar de 90 días en todos los servicios. "
        "Cotización formal en EUR. Tiempo estimado de cierre: 20 días hábiles."
    )
    comp = rfp_nodes.evaluate_compliance(valid_text, metadata, "seleccion")
    assert comp.passed is True
    assert len(comp.violations) == 0


def test_evaluate_compliance_fails_on_missing_warranty():
    metadata = {"client_hq": "España", "currency": "EUR"}
    text_without_warranty = "Propuesta económica en EUR. Plazo de cierre: 20 días hábiles."
    comp = rfp_nodes.evaluate_compliance(text_without_warranty, metadata, "seleccion")

    assert comp.passed is False
    assert any("RULE-WARRANTY" in v for v in comp.violations)


def test_evaluate_compliance_fails_on_currency_mismatch():
    metadata = {"client_hq": "España", "currency": "EUR"}
    text_with_usd = (
        "Propuesta formal para España con garantía de 90 días. "
        "Precios cotizados en USD."
    )
    comp = rfp_nodes.evaluate_compliance(text_with_usd, metadata, "seleccion")

    assert comp.passed is False
    assert any("RULE-CURRENCY" in v for v in comp.violations)


def test_evaluate_compliance_fails_on_short_ttc():
    metadata = {"client_hq": "España", "currency": "EUR"}
    text_with_short_ttc = (
        "Búsqueda ejecutiva garantizada en 10 días hábiles. "
        "Garantía a 90 días y cotización en EUR."
    )
    comp = rfp_nodes.evaluate_compliance(text_with_short_ttc, metadata, "seleccion")

    assert comp.passed is False
    assert any("RULE-TTC-MIN" in v for v in comp.violations)


def test_evaluate_compliance_fails_on_missing_support_sla():
    metadata = {"client_hq": "Miami", "currency": "USD"}
    text_without_sla = (
        "Servicio de outsourcing para Miami en USD con garantía a 90 días. "
        "Equipo de 10 agentes disponibles."
    )
    comp = rfp_nodes.evaluate_compliance(text_without_sla, metadata, "soporte")

    assert comp.passed is False
    assert any("RULE-SUPPORT-SLA" in v for v in comp.violations)


def test_evaluate_section_parallel_synthesizes_feedback():
    draft = DepartmentDraft(
        department_id="seleccion",
        department_name="Talent Selection",
        owner_name="Javier Almeida",
        draft_content="Texto breve sin garantía ni plazo.",
        iteration=1,
    )
    res = rfp_nodes.evaluate_section_parallel(
        draft,
        metadata={"client_hq": "España", "currency": "EUR"},
        key_aspects=["Contratar directores"],
    )
    assert res.overall_pass is False
    assert res.compliance.passed is False
    assert len(res.feedback_for_generator) > 0


# ---------------------------------------------------------------------------
# 3. Tests del Ciclo Generador-Evaluador y Límite de Iteraciones
# ---------------------------------------------------------------------------

def test_pipeline_generation_passes_and_updates_db(temp_engine):
    ticket = RFPTicket(
        ticket_id="ticket-gen-001",
        rfp_id="RFP-GEN001",
        filename="rfp_formal.pdf",
        raw_pdf_path="data/raw/rfp.pdf",
        status="analisis_completo",
        client_name="TechRetail",
        client_hq="España",
        currency="EUR",
        departments_needed=json.dumps(["seleccion"]),
    )
    sec = RFPDepartmentSection(
        ticket_id="ticket-gen-001",
        department_id="seleccion",
        department_name="Talent Selection Operations",
        owner_name="Javier Almeida",
        key_aspects=json.dumps(["Contratar 3 mandos medios"]),
    )
    with Session(temp_engine) as session:
        session.add(ticket)
        session.add(sec)
        session.commit()

    result = rfp_graph.run_rfp_generation_pipeline("ticket-gen-001", db_engine=temp_engine)
    assert result["status"] == "listo_para_aprobacion"

    with Session(temp_engine) as session:
        saved_ticket = session.get(RFPTicket, "ticket-gen-001")
        assert saved_ticket.status == "listo_para_aprobacion"
        saved_sec = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == "ticket-gen-001")
        ).first()
        assert saved_sec.draft_content is not None
        assert "90 días" in saved_sec.draft_content
        eval_data = json.loads(saved_sec.evaluation_results)
        assert eval_data["overall_pass"] is True


def test_pipeline_iteration_limit_sets_needs_human_review(monkeypatch, temp_engine):
    ticket = RFPTicket(
        ticket_id="ticket-limit-001",
        rfp_id="RFP-LIM001",
        filename="rfp_flawed.pdf",
        raw_pdf_path="data/raw/rfp.pdf",
        status="analisis_completo",
        client_name="FlawedClient",
        client_hq="España",
        currency="EUR",
        departments_needed=json.dumps(["seleccion"]),
    )
    sec = RFPDepartmentSection(
        ticket_id="ticket-limit-001",
        department_id="seleccion",
        department_name="Talent Selection Operations",
        owner_name="Javier Almeida",
        key_aspects=json.dumps(["Contratación urgente"]),
    )
    with Session(temp_engine) as session:
        session.add(ticket)
        session.add(sec)
        session.commit()

    # Forzamos un generador que siempre incumple una regla (cierre en 5 días)
    def _stub_bad_gen(metadata, task, feedback=None, iteration=1):
        return DepartmentDraft(
            department_id="seleccion",
            department_name="Talent Selection",
            owner_name="Javier Almeida",
            draft_content=f"Búsqueda prometida en 5 días hábiles. Iteración {iteration}.",
            iteration=iteration,
        )

    monkeypatch.setattr(rfp_nodes, "generate_department_draft", _stub_bad_gen)

    result = rfp_graph.run_rfp_generation_pipeline("ticket-limit-001", db_engine=temp_engine)
    assert result["status"] == "needs_human_review"

    with Session(temp_engine) as session:
        saved_ticket = session.get(RFPTicket, "ticket-limit-001")
        assert saved_ticket.status == "needs_human_review"
        saved_sec = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == "ticket-limit-001")
        ).first()
        # Conserva el último borrador generado
        assert "Iteración 3" in saved_sec.draft_content
        eval_data = json.loads(saved_sec.evaluation_results)
        assert eval_data["overall_pass"] is False
        assert eval_data["iteration"] == 3


# ---------------------------------------------------------------------------
# 4. Tests de Endpoints FastAPI (POST /{ticket_id}/generate)
# ---------------------------------------------------------------------------

def test_trigger_generation_endpoint(monkeypatch, temp_engine):
    app = FastAPI()
    app.include_router(rfps_route.router)
    monkeypatch.setattr(rfps_route, "engine", temp_engine)

    triggered: list[str] = []
    monkeypatch.setattr(
        rfps_route,
        "run_rfp_generation_pipeline",
        lambda ticket_id: triggered.append(ticket_id),
    )

    ticket = RFPTicket(
        ticket_id="ticket-endpoint-001",
        rfp_id="RFP-END001",
        filename="test.pdf",
        raw_pdf_path="data/raw/test.pdf",
        status="analisis_completo",
    )
    with Session(temp_engine) as session:
        session.add(ticket)
        session.commit()

    # Sin auth -> 401
    unauth_client = TestClient(app)
    assert unauth_client.post("/api/rfps/ticket-endpoint-001/generate").status_code == 401

    # Con auth -> 202
    app.dependency_overrides[get_current_user] = lambda: {"email": "ventas@nexova.com"}
    client = TestClient(app)
    res = client.post("/api/rfps/ticket-endpoint-001/generate")
    assert res.status_code == 202
    assert res.json()["status"] == "generando_borrador"
    assert triggered == ["ticket-endpoint-001"]