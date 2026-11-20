"""
tests/api/test_rfp_sse.py
Pruebas de integración para el endpoint SSE de notificaciones de tickets RFP.
Valida Auth Guard (401), headers SSE, framing wire-protocol, payload del dominio y keep-alive
sobre un servidor HTTP real (uvicorn efímero).
"""
from __future__ import annotations

import asyncio
import json
import os
import socket
import sys
import threading
import time
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient
from sqlmodel import create_engine

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.api.main import app
from services.api.routes import rfps as rfps_route
from services.api.routes.auth import get_current_user
from services.api.sse_manager import rfp_broadcaster
from services.api.models import RFPTicket


@pytest.fixture
def isolated_rfp_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Aísla la base de datos, el directorio de PDFs y desactiva el pipeline agéntico."""
    test_db = create_engine(
        f"sqlite:///{tmp_path / 'test_sse.db'}",
        connect_args={"check_same_thread": False},
    )
    with test_db.begin() as conn:
        conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS rfp_tickets (
                ticket_id TEXT PRIMARY KEY,
                rfp_id TEXT,
                filename TEXT NOT NULL,
                raw_pdf_path TEXT NOT NULL,
                status TEXT NOT NULL,
                classification_reason TEXT,
                client_name TEXT,
                client_hq TEXT,
                currency TEXT,
                services_requested TEXT,
                scope TEXT,
                deadline TEXT,
                budget_range TEXT,
                departments_needed TEXT,
                readability_metrics TEXT,
                synthesizer_summary TEXT,
                handoff_payload TEXT,
                error_detail TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

    monkeypatch.setattr(rfps_route, "engine", test_db)
    monkeypatch.setattr(rfps_route, "RAW_RFP_DIR", tmp_path / "raw")
    monkeypatch.setattr(rfps_route, "run_rfp_intake_pipeline", lambda ticket_id: None)
    yield test_db


@pytest.fixture
def live_server_url():
    """Levanta una instancia efímera de uvicorn en localhost para probar streaming HTTP real."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    deadline = time.time() + 5.0
    while not server.started and time.time() < deadline:
        time.sleep(0.05)

    yield f"http://127.0.0.1:{port}"

    server.should_exit = True
    thread.join(timeout=3.0)


def test_sse_stream_requires_authentication():
    """Verifica Auth Guard Standard: un cliente sin JWT recibe 401 Unauthorized."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        response = client.get("/api/rfps/stream")
    assert response.status_code == 401


def test_sse_stream_emits_rfp_ticket_created_wire_format(isolated_rfp_env, live_server_url):
    """
    Verifica de punta a punta sobre HTTP real:
    1. Headers SSE correctos (`text/event-stream`, `no-cache`, `X-Accel-Buffering: no`).
    2. Al subir un PDF en POST /api/rfps/upload, el stream emite `event: rfp_ticket_created`.
    3. `data:` es JSON válido con los campos exigidos por el BRIEFING de Nexova.
    """
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "sales-1",
        "email": "marcos@nexova.com",
        "role": "manager",
    }

    async def _run():
        async with httpx.AsyncClient(base_url=live_server_url, timeout=10.0) as client:
            async def trigger_upload():
                while rfp_broadcaster.active_connections == 0:
                    await asyncio.sleep(0.02)
                res = await client.post(
                    "/api/rfps/upload",
                    files={"file": ("nexova-request-1.pdf", b"%PDF-1.4 test content", "application/pdf")},
                )
                assert res.status_code == 202
                return res.json()

            upload_task = asyncio.create_task(trigger_upload())

            received_lines: list[str] = []
            async with client.stream("GET", "/api/rfps/stream") as sse_resp:
                assert sse_resp.status_code == 200
                assert "text/event-stream" in sse_resp.headers.get("content-type", "")
                assert sse_resp.headers.get("cache-control") == "no-cache"
                assert sse_resp.headers.get("x-accel-buffering") == "no"

                async for line in sse_resp.aiter_lines():
                    received_lines.append(line)
                    if line == "" and any(l.startswith("data:") for l in received_lines):
                        break

            upload_data = await upload_task

            event_lines = [l for l in received_lines if l.startswith("event:")]
            data_lines = [l for l in received_lines if l.startswith("data:")]
            id_lines = [l for l in received_lines if l.startswith("id:")]

            assert event_lines == ["event: rfp_ticket_created"]
            assert len(id_lines) == 1
            assert id_lines[0] == f"id: {upload_data['ticket_id']}"
            assert len(data_lines) == 1

            payload = json.loads(data_lines[0].removeprefix("data:").strip())
            assert payload["ticket_id"] == upload_data["ticket_id"]
            assert payload["rfp_id"] == upload_data["rfp_id"]
            assert payload["filename"] == "nexova-request-1.pdf"
            assert payload["status"] == "analizando"
            assert "created_at" in payload

    try:
        asyncio.run(_run())
    finally:
        app.dependency_overrides.clear()
        # Breve respiro para que uvicorn procese el cierre TCP y ejecute `finally`
        time.sleep(0.1)
        assert rfp_broadcaster.active_connections == 0


def test_sse_stream_emits_keepalive_ping_on_timeout(live_server_url):
    """Verifica que el endpoint emita un frame de comentario `: ping` cuando no hay eventos."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "sales-1",
        "email": "marcos@nexova.com",
        "role": "manager",
    }

    async def fake_wait_for(coro, timeout):
        coro.close()
        await asyncio.sleep(0.05)
        raise asyncio.TimeoutError()

    async def _run():
        with patch("services.api.routes.rfps.asyncio.wait_for", side_effect=fake_wait_for):
            async with httpx.AsyncClient(base_url=live_server_url, timeout=10.0) as client:
                async with client.stream("GET", "/api/rfps/stream") as sse_resp:
                    assert sse_resp.status_code == 200
                    lines: list[str] = []
                    async for line in sse_resp.aiter_lines():
                        lines.append(line)
                        if line == "" and ": ping" in lines:
                            break
                    assert ": ping" in lines

    try:
        asyncio.run(_run())
    finally:
        app.dependency_overrides.clear()
        time.sleep(0.1)
        assert rfp_broadcaster.active_connections == 0