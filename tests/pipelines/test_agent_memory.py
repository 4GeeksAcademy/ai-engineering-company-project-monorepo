"""
tests/pipelines/test_agent_memory.py
Suite EDD y Red Teaming para Memoria Persistente y Auto-mejora del Agente (Hito 8 · Parte 1).
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from services.agent.memory import AgentMemoryStore, MemoryProposal, validate_memory_candidate
from services.agent.memory_evaluator import classify_pending_decision, evaluate_turn_for_memory
import services.agent.nodes as agent_nodes
from services.agent.graph import run_agent


@pytest.fixture
def isolated_memory(tmp_path, monkeypatch):
    """Proporciona un AgentMemoryStore aislado en disco temporal y modo determinista sin red."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    store = AgentMemoryStore(redis_url="redis://127.0.0.1:1/0", local_path=tmp_path / "mem.json", max_per_line=3)
    monkeypatch.setattr(agent_nodes, "memory_store", store)
    return store


# =====================================================================
# 1. CRITERIOS DE AUTO-EVALUACIÓN (3 POSITIVOS vs 3 NEGATIVOS DEL BRIEFING)
# =====================================================================

@pytest.mark.parametrize("message", [
    "En realidad los tickets de nómina para clientes de retail ahora se resuelven en 24 horas, no en 48 como decía el SLA anterior.",
    "Ese cliente de finanzas siempre pide que le confirmemos por email antes de cerrar un ticket, aunque el sistema permita cerrarlo directo.",
    "Los tickets marcados como 'urgente' de clientes con contrato premium deben ir directo a un agente senior, no a la cola general — eso cambió este mes.",
])
def test_memorable_interactions_generate_proposal(isolated_memory, message):
    res = evaluate_turn_for_memory(message, "Entendido.", memory_context=[], has_pending_proposal=False)
    assert res.should_propose_memory is True
    assert res.proposed_fact == message


@pytest.mark.parametrize("message", [
    "¿Cuántos tickets abiertos hay ahora mismo?",
    "Perfecto, gracias por la explicación.",
    "Resume este ticket en dos líneas para el reporte de Laura.",
])
def test_non_memorable_interactions_do_not_propose(isolated_memory, message):
    res = evaluate_turn_for_memory(message, "Respuesta normal.", memory_context=[], has_pending_proposal=False)
    assert res.should_propose_memory is False
    assert res.proposed_fact is None


# =====================================================================
# 2. PRIVACIDAD NEXOVA & ANTI-POISONING
# =====================================================================

@pytest.mark.parametrize("forbidden_fact", [
    "El candidato Juan Pérez tiene calificación 9.5 en la entrevista del ATS y su CV está en Drive.",
    "La banda salarial acordada en la negociación salarial de headhunting es de 65.000 euros.",
    "Caso aislado: solo para este ticket #991 hay que responder por WhatsApp.",
])
def test_forbidden_nexova_data_never_enters_memory(isolated_memory, forbidden_fact):
    allowed, reason = validate_memory_candidate(forbidden_fact)
    assert allowed is False
    assert reason is not None

    saved, _ = isolated_memory.save_pending_proposal(
        MemoryProposal(thread_id="t-sec", fact=forbidden_fact, reason="test", source_message=forbidden_fact)
    )
    assert saved is False


# =====================================================================
# 3. INVARIANTES: PROPUESTA ÚNICA, DEFAULT-DENY, MENSAJE MIXTO, CONSOLIDACIÓN
# =====================================================================

def test_only_one_pending_proposal_allowed_per_thread(isolated_memory):
    p1 = MemoryProposal(thread_id="t-1", fact="Los tickets urgentes de retail escalan en 24 horas.", reason="SLA", source_message="msg1")
    p2 = MemoryProposal(thread_id="t-1", fact="El cliente de tecnología siempre prefiere email.", reason="Pref", source_message="msg2")

    ok1, _ = isolated_memory.save_pending_proposal(p1)
    ok2, err2 = isolated_memory.save_pending_proposal(p2)
    assert ok1 is True
    assert ok2 is False
    assert "pendiente" in (err2 or "").lower()


def test_topic_change_or_ambiguity_rejects_by_default_and_audits(isolated_memory):
    p = MemoryProposal(thread_id="t-amb", fact="Los tickets de nómina retail ahora van en 24 horas.", reason="SLA", source_message="msg1")
    isolated_memory.save_pending_proposal(p)

    cls = classify_pending_decision("Por cierto, ¿qué horario tiene formación corporativa?", p.fact)
    assert cls.decision == "ambiguous_or_unrelated"

    audit = isolated_memory.resolve_proposal("t-amb", cls.decision, source_message="Por cierto...")
    assert audit is not None
    assert audit.decision == "ambiguous_or_unrelated"
    assert isolated_memory.read_memory() == []
    assert len(isolated_memory.get_audit_log("t-amb")) == 1


def test_consolidation_deduplicates_and_caps_max_per_line(isolated_memory):
    for i, fact in enumerate([
        "Regla uno de soporte para clientes retail en España.",
        "Regla dos de soporte para clientes banca en Miami.",
        "Regla tres de soporte para tickets urgentes premium.",
        "Regla cuatro de soporte para escalación a Tom Callahan.",
    ]):
        p = MemoryProposal(thread_id=f"t-cap-{i}", business_line="outsourcing", fact=fact, reason="test", topic_key=f"topic-{i}", source_message=fact)
        isolated_memory.save_pending_proposal(p)
        isolated_memory.resolve_proposal(f"t-cap-{i}", "approve", source_message="sí")

    stored = isolated_memory.read_memory("outsourcing")
    assert len(stored) == 3  # max_per_line=3


# =====================================================================
# 4. DOS CICLOS COMPLETOS END-TO-END CON LANGGRAPH (APROBADO Y RECHAZADO)
# =====================================================================

@patch("services.agent.nodes.retrieve", return_value=[])
@patch("services.agent.nodes.generate_answer", return_value="Según la memoria operativa de Nexova, se aplica el SLA actualizado.")
def test_e2e_cycle_approved_persists_across_threads(mock_gen, mock_ret, isolated_memory):
    # Turno 1 (Hilo 1): Agente detecta regla y propone en su respuesta
    r1 = run_agent(
        "En realidad los tickets de nómina para clientes de retail ahora se resuelven en 24 horas, no en 48 como decía el SLA anterior.",
        thread_id="hilo-aprobado",
    )
    assert r1.get("memory_proposal") is not None
    assert "Propuesta de memoria" in r1["answer"]
    assert isolated_memory.read_memory() == []  # Todavía NO escrita sin confirmar

    # Turno 2 (Hilo 1): Usuario aprueba explícitamente
    r2 = run_agent("Sí, recuérdalo", thread_id="hilo-aprobado")
    assert r2.get("memory_decision") == "approve"
    assert len(isolated_memory.read_memory("outsourcing")) == 1
    assert len(isolated_memory.get_audit_log("hilo-aprobado")) == 1

    # Turno 3 (NUEVO Hilo 2): Otra sesión ya recuerda el hecho aprobado sin tocar RAG *_knowledge
    r3 = run_agent("¿Cuál es el SLA de nómina para retail?", thread_id="hilo-nuevo-otro-agente")
    assert len(r3.get("memory_context", [])) == 1
    assert "24 horas" in r3["memory_context"][0]


@patch("services.agent.nodes.retrieve", return_value=[])
def test_e2e_cycle_rejected_leaves_memory_unchanged_but_audited(mock_ret, isolated_memory):
    # Turno 1: Propuesta
    r1 = run_agent(
        "Ese cliente de finanzas siempre pide que le confirmemos por email antes de cerrar un ticket.",
        thread_id="hilo-rechazado",
    )
    assert r1.get("memory_proposal") is not None

    # Turno 2: Usuario rechaza
    r2 = run_agent("No, descártalo", thread_id="hilo-rechazado")
    assert r2.get("memory_decision") == "reject"
    assert isolated_memory.read_memory() == []  # Memoria intacta
    audit = isolated_memory.get_audit_log("hilo-rechazado")
    assert len(audit) == 1
    assert audit[0].decision == "reject"
    assert audit[0].final_fact is None


@patch("services.agent.nodes.retrieve", return_value=[{"text": "Manual de escalación.", "source": "slas.md", "score": 0.9}])
@patch("services.agent.nodes.generate_answer", return_value="El escalado urgente va a soporte senior.")
def test_mixed_message_approves_and_answers_followup_question(mock_gen, mock_ret, isolated_memory):
    run_agent(
        "Los tickets marcados como 'urgente' de clientes con contrato premium deben ir directo a un agente senior, no a la cola general — eso cambió este mes.",
        thread_id="hilo-mixto",
    )
    r2 = run_agent("Sí, guárdalo. ¿Cómo escalo un caso urgente?", thread_id="hilo-mixto")
    assert r2.get("memory_decision") == "approve"
    assert "Memoria actualizada" in r2["answer"]
    assert "soporte senior" in r2["answer"]


# =====================================================================
# 5. RESPUESTAS AMBIGUAS/CONTRADICTORIAS Y TTL/SILENCIO DE PROPUESTAS
# =====================================================================

@pytest.mark.parametrize("ambiguous_reply", [
    "Sí, pero no",
    "Sí, pero no estoy seguro",
    "Ok, aunque mejor no",
    "Tal vez luego",
    "No sé, déjame pensarlo",
    "Sí?",
])
def test_ambiguous_or_contradictory_replies_never_approve(isolated_memory, ambiguous_reply):
    p = MemoryProposal(
        thread_id="t-amb-strict",
        fact="Los tickets de nómina retail ahora van en 24 horas.",
        reason="SLA",
        source_message="msg1",
    )
    isolated_memory.save_pending_proposal(p)

    cls = classify_pending_decision(ambiguous_reply, p.fact)
    assert cls.decision in ("ambiguous_or_unrelated", "reject")
    assert cls.decision != "approve"

    audit = isolated_memory.resolve_proposal("t-amb-strict", cls.decision, source_message=ambiguous_reply)
    assert audit is not None
    assert audit.decision != "approve"
    assert audit.final_fact is None
    assert isolated_memory.read_memory() == []


@pytest.mark.parametrize("reply", ["Sí, pero no", "Sí, pero no estoy seguro", "No, mejor no"])
def test_e2e_ambiguous_or_negative_reply_does_not_write_memory(isolated_memory, reply):
    p = MemoryProposal(
        thread_id="hilo-duda",
        fact="Ese cliente de finanzas siempre pide confirmación por email antes de cerrar un ticket.",
        reason="Pref",
        source_message="msg1",
    )
    isolated_memory.save_pending_proposal(p)

    res = agent_nodes.validate_input_node({"question": reply, "thread_id": "hilo-duda"})
    assert res["memory_decision"] != "approve"
    assert isolated_memory.read_memory() == []
    audit = isolated_memory.get_audit_log("hilo-duda")
    assert len(audit) == 1
    assert audit[0].decision != "approve"
    assert audit[0].final_fact is None


def test_local_pending_proposal_ttl_expires_and_audits_abandonment(tmp_path, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    store = AgentMemoryStore(
        redis_url="redis://127.0.0.1:1/0",
        local_path=tmp_path / "mem_ttl.json",
        pending_ttl_seconds=3600,
    )

    past = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
    expired_proposal = MemoryProposal(
        thread_id="t-silent",
        fact="Los tickets urgentes de retail escalan en 24 horas.",
        reason="SLA",
        source_message="msg1",
        expires_at=past,
    )
    ok, _ = store.save_pending_proposal(expired_proposal)
    assert ok is True

    # Al consultar tras caducar el TTL (silencio del usuario), no sigue pendiente y deja auditoría
    assert store.get_pending_proposal("t-silent") is None
    assert store.read_memory() == []

    audit = store.get_audit_log("t-silent")
    assert len(audit) == 1
    assert audit[0].decision == "expired"
    assert audit[0].final_fact is None
    assert audit[0].proposal_id == expired_proposal.proposal_id

    # El hilo queda libre para una nueva propuesta sin quedar bloqueado
    fresh_proposal = MemoryProposal(
        thread_id="t-silent",
        fact="El cliente de tecnología siempre prefiere comunicación por email.",
        reason="Pref",
        source_message="msg2",
    )
    ok_fresh, err_fresh = store.save_pending_proposal(fresh_proposal)
    assert ok_fresh is True
    assert err_fresh is None


def test_get_audit_log_sweeps_abandoned_local_proposals(tmp_path):
    store = AgentMemoryStore(
        redis_url="redis://127.0.0.1:1/0",
        local_path=tmp_path / "mem_sweep.json",
    )
    past = (datetime.now(timezone.utc) - timedelta(minutes=65)).isoformat()
    p = MemoryProposal(
        thread_id="t-abandoned",
        fact="Los tickets de facturación escalan directo a Tom Callahan.",
        reason="Pattern",
        source_message="msg1",
        expires_at=past,
    )
    store.save_pending_proposal(p)

    # Incluso sin un nuevo mensaje en el hilo, consultar auditoría barre propuestas expiradas
    audit = store.get_audit_log("t-abandoned")
    assert len(audit) == 1
    assert audit[0].decision == "expired"
    assert store.read_memory() == []