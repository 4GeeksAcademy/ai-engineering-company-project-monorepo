"""
tests/pipelines/test_rfp_intake.py
Tests unitarios y de integración deterministas para Hito 9 (Parte 1: Recepción y Enrutamiento de RFPs).
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
from services.api.models import RFPDepartmentSection, RFPTicket
from services.api.routes import rfps as rfps_route
from services.api.routes.auth import get_current_user


@pytest.fixture(autouse=True)
def _force_deterministic_mode(monkeypatch):
    """Fuerza fallback determinista sin llamadas externas a OpenAI."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


@pytest.fixture()
def temp_engine(tmp_path: Path):
    db_path = tmp_path / "test_rfp_intake.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    return engine


# ---------------------------------------------------------------------------
# 1. Tests del Clasificador (Triage)
# ---------------------------------------------------------------------------

def test_classifier_accepts_formal_rfp():
    doc = (
        "# Solicitud de Propuesta (RFP) - TechRetail España\n"
        "Buscamos un proveedor para búsqueda ejecutiva (headhunting) de 4 mandos medios "
        "y capacitación corporativa para equipos comerciales. Alcance en Madrid. "
        "Presupuesto estimado: 45.000 EUR."
    )
    result = rfp_nodes.classify_rfp_document(doc)
    assert result.is_valid_rfp is True
    assert result.rfp_format == "formal"


def test_classifier_accepts_informal_client_email():
    doc = (
        "Hola equipo de Nexova,\n"
        "Les escribo desde Miami porque necesitamos contratar un equipo de soporte "
        "con agentes de soporte dedicados y nos gustaría recibir una cotización esta semana."
    )
    result = rfp_nodes.classify_rfp_document(doc)
    assert result.is_valid_rfp is True
    assert result.rfp_format == "informal"


def test_classifier_rejects_vendor_pitch():
    doc = (
        "Estimados, somos proveedores de software RRHH y ofrecemos nuestro ATS con IA. "
        "Nos gustaría agendar una demo gratuita de nuestro software para su equipo."
    )
    result = rfp_nodes.classify_rfp_document(doc)
    assert result.is_valid_rfp is False
    assert result.rfp_format == "invalid"


# ---------------------------------------------------------------------------
# 2. Tests de Workers Aislados (Cero alucinaciones de cifras)
# ---------------------------------------------------------------------------

def test_worker_records_open_questions_when_volumes_missing():
    task = {
        "department_id": "capacitacion",
        "relevant_excerpts": [
            "Requerimos un programa de capacitación en liderazgo para nuestro equipo."
        ],
    }
    output = rfp_nodes.run_department_worker(
        metadata={"client_name": "Acme", "currency": "EUR"},
        task=task,
    )
    assert output.department_id == "capacitacion"
    assert output.owner_name == "Elena Vargas"
    assert len(output.open_questions) >= 1
    assert not any(
        "participantes" in asp.lower() and any(c.isdigit() for c in asp)
        for asp in output.key_aspects
    )


def test_worker_extracts_explicit_volumes_without_inventing():
    task = {
        "department_id": "soporte",
        "relevant_excerpts": [
            "Necesitamos 8 agentes de soporte bilingües con cobertura 24/7 para clientes en Miami."
        ],
    }
    output = rfp_nodes.run_department_worker(
        metadata={"client_name": "SunCoast", "currency": "USD"},
        task=task,
    )
    assert output.department_id == "soporte"
    assert output.owner_name == "Roberto Díaz"
    assert any("8 agentes" in asp.lower() for asp in output.key_aspects)
    assert any("24/7" in asp for asp in output.key_aspects)


# ---------------------------------------------------------------------------
# 3. Tests del Grafo + Runner + Persistencia SQLModel
# ---------------------------------------------------------------------------

def test_pipeline_persists_only_needed_departments_and_handoff(
    monkeypatch, temp_engine, tmp_path: Path
):
    fake_pdf = tmp_path / "rfp_formal.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 dummy")

    markdown_rfp = (
        "# Solicitud de Propuesta (RFP) - Iberia Logistics\n"
        "Sede: Madrid, España. Presupuesto: 60.000 EUR. Plazo: 30 de noviembre.\n\n"
        "Requerimos servicios de headhunting para contratar 3 mandos medios de operaciones.\n\n"
        "Adicionalmente solicitamos capacitación corporativa presencial para 25 participantes."
    )
    monkeypatch.setattr(rfp_nodes, "convert_pdf_to_markdown", lambda _path: markdown_rfp)

    ticket = RFPTicket(
        ticket_id="ticket-001",
        rfp_id="RFP-TEST001",
        filename="rfp_formal.pdf",
        raw_pdf_path=str(fake_pdf),
        status="analizando",
    )
    with Session(temp_engine) as session:
        session.add(ticket)
        session.commit()

    result = rfp_graph.run_rfp_intake_pipeline("ticket-001", db_engine=temp_engine)
    assert result["status"] == "analisis_completo"
    assert result["handoff_payload"]["ticket_id"] == "ticket-001"
    assert set(result["departments_needed"]) == {"seleccion", "capacitacion"}

    with Session(temp_engine) as session:
        saved_ticket = session.get(RFPTicket, "ticket-001")
        assert saved_ticket is not None
        assert saved_ticket.status == "analisis_completo"
        assert saved_ticket.currency == "EUR"
        sections = session.exec(
            select(RFPDepartmentSection).where(RFPDepartmentSection.ticket_id == "ticket-001")
        ).all()
        assert len(sections) == 2
        assert {s.department_id for s in sections} == {"seleccion", "capacitacion"}
        assert json.loads(saved_ticket.handoff_payload or "{}")["ticket_id"] == "ticket-001"


def test_pipeline_marks_ticket_error_on_ingestion_failure(
    monkeypatch, temp_engine, tmp_path: Path
):
    fake_pdf = tmp_path / "corrupt.pdf"
    fake_pdf.write_bytes(b"not-a-real-pdf")

    def _boom(_path: str) -> str:
        raise RuntimeError("PDF ilegible")

    monkeypatch.setattr(rfp_nodes, "convert_pdf_to_markdown", _boom)

    ticket = RFPTicket(
        ticket_id="ticket-err",
        rfp_id="RFP-ERR001",
        filename="corrupt.pdf",
        raw_pdf_path=str(fake_pdf),
        status="analizando",
    )
    with Session(temp_engine) as session:
        session.add(ticket)
        session.commit()

    result = rfp_graph.run_rfp_intake_pipeline("ticket-err", db_engine=temp_engine)
    assert result["status"] == "error"

    with Session(temp_engine) as session:
        saved = session.get(RFPTicket, "ticket-err")
        assert saved is not None
        assert saved.status == "error"
        assert "PDF ilegible" in (saved.error_detail or "")


# ---------------------------------------------------------------------------
# 4. Tests de Endpoints FastAPI (Auth Guard + Upload Async 202 + Polling GET)
# ---------------------------------------------------------------------------

def test_rfp_endpoints_auth_and_async_upload(monkeypatch, temp_engine, tmp_path: Path):
    app = FastAPI()
    app.include_router(rfps_route.router)

    monkeypatch.setattr(rfps_route, "engine", temp_engine)
    monkeypatch.setattr(rfps_route, "RAW_RFP_DIR", tmp_path / "raw")

    triggered: list[str] = []
    monkeypatch.setattr(
        rfps_route,
        "run_rfp_intake_pipeline",
        lambda ticket_id: triggered.append(ticket_id),
    )

    # Sin autenticación debe rechazar con 401
    unauth_client = TestClient(app)
    res_unauth = unauth_client.get("/api/rfps")
    assert res_unauth.status_code == 401

    # Con usuario autenticado debe aceptar PDF con 202 y permitir consulta GET
    app.dependency_overrides[get_current_user] = lambda: {"email": "ventas@nexova.com"}
    client = TestClient(app)

    res_upload = client.post(
        "/api/rfps/upload",
        files={"file": ("cliente.pdf", b"%PDF-1.4 contenido", "application/pdf")},
    )
    assert res_upload.status_code == 202
    payload = res_upload.json()
    assert payload["status"] == "analizando"
    ticket_id = payload["ticket_id"]
    assert triggered == [ticket_id]

    res_list = client.get("/api/rfps")
    assert res_list.status_code == 200
    assert any(t["ticket_id"] == ticket_id for t in res_list.json())

    res_detail = client.get(f"/api/rfps/{ticket_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["filename"] == "cliente.pdf"

# ---------------------------------------------------------------------------
# 5. Tests de Casos Reales del Briefing (Inglés Informal, '5 posiciones' y E2E PDF)
# ---------------------------------------------------------------------------

def test_classifier_accepts_english_informal_email_nubesoft():
    doc = (
        "From: ops@nubesoft.io\n"
        "Subject: Quote for 24/7 support team\n\n"
        "Hi Nexova team, we are based in Miami and looking for 12 support agents "
        "to cover customer support 24/7 with a 24h SLA. Could you send us pricing?"
    )
    result = rfp_nodes.classify_rfp_document(doc)
    assert result.is_valid_rfp is True
    assert result.rfp_format == "informal"


def test_seleccion_worker_captures_5_posiciones_without_open_question():
    task = {
        "department_id": "seleccion",
        "relevant_excerpts": [
            "Vantex Retail Group requiere búsqueda ejecutiva para cubrir 5 posiciones de mandos medios en Madrid."
        ],
    }
    output = rfp_nodes.run_department_worker(
        metadata={"client_name": "Vantex Retail Group", "currency": "EUR"},
        task=task,
    )
    assert any("5 posiciones" in asp.lower() for asp in output.key_aspects)
    assert not any("confirmar con el cliente el volumen exacto" in q.lower() for q in output.open_questions)


def test_e2e_briefing_pdfs_with_markitdown(temp_engine, tmp_path: Path):
    """Prueba E2E real generando PDFs en disco y extrayéndolos con MarkItDown."""
    import matplotlib.pyplot as plt

    def _write_pdf(filename: str, text: str) -> Path:
        pdf_path = tmp_path / filename
        fig, ax = plt.subplots(figsize=(8.5, 11))
        ax.axis("off")
        ax.text(0.05, 0.92, text, fontsize=11, family="monospace", va="top", ha="left")
        fig.savefig(pdf_path, format="pdf", bbox_inches="tight")
        plt.close(fig)
        return pdf_path

    pdf1 = _write_pdf(
        "nexova-request-1.pdf",
        "SOLICITUD DE PROPUESTA (RFP) - VANTEX RETAIL GROUP\n"
        "Sede Central: Madrid, España | Moneda: EUR\n"
        "Búsqueda ejecutiva de 5 posiciones de mandos medios.\n"
        "Programa trimestral de capacitación en liderazgo.",
    )
    pdf2 = _write_pdf(
        "nexova-request-2.pdf",
        "From: ops@nubesoft.io\n"
        "Hi team, we are in Miami and need a quote for 12 support agents 24/7 with SLA 24h.",
    )
    pdf3 = _write_pdf(
        "nexova-request-3.pdf",
        "PROPUESTA COMERCIAL - RECRUITAI\n"
        "Ofrecemos nuestro ATS con demo gratuita de nuestro software.",
    )

    with Session(temp_engine) as session:
        session.add(RFPTicket(ticket_id="e2e-1", rfp_id="RFP-E2E1", filename="nexova-request-1.pdf", raw_pdf_path=str(pdf1), status="analizando"))
        session.add(RFPTicket(ticket_id="e2e-2", rfp_id="RFP-E2E2", filename="nexova-request-2.pdf", raw_pdf_path=str(pdf2), status="analizando"))
        session.add(RFPTicket(ticket_id="e2e-3", rfp_id="RFP-E2E3", filename="nexova-request-3.pdf", raw_pdf_path=str(pdf3), status="analizando"))
        session.commit()

    r1 = rfp_graph.run_rfp_intake_pipeline("e2e-1", db_engine=temp_engine)
    assert r1["status"] == "analisis_completo"
    assert set(r1["departments_needed"]) == {"seleccion", "capacitacion"}
    sel_res = next(w for w in r1["worker_results"] if w["department_id"] == "seleccion")
    assert any("5 posiciones" in asp.lower() for asp in sel_res["key_aspects"])

    r2 = rfp_graph.run_rfp_intake_pipeline("e2e-2", db_engine=temp_engine)
    assert r2["status"] == "analisis_completo"
    assert "soporte" in r2["departments_needed"]
    assert r2["metadata"]["currency"] == "USD"
    sup_res = next(w for w in r2["worker_results"] if w["department_id"] == "soporte")
    assert any("12 support agents" in asp.lower() for asp in sup_res["key_aspects"])

    r3 = rfp_graph.run_rfp_intake_pipeline("e2e-3", db_engine=temp_engine)
    assert r3["status"] == "descartado"