"""
Suite de Tests Unitarios Aislados para el Pipeline de Desempeño de Negocio (Nexova Solutions).
Fase 2 de la Parte 3 de Telemetría y Data Pipelines.
Ejecución: uv run pytest tests/pipelines/test_pipeline.py
"""

import os
import sys
import pytest
import pandas as pd

# Añadir la raíz del monorepo para importaciones absolutas
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from data.process.transformations import (
    calculate_customer_support_kpis,
    calculate_talent_acquisition_kpis,
    transform_events_to_business_kpis,
    parse_tags_payload
)
from data.pipelines.pipeline import transform_business_kpis_task


# =====================================================================
# FIXTURES SINTÉTICAS EN MEMORIA (SIN RED NI BASE DE DATOS)
# =====================================================================

@pytest.fixture
def target_date():
    return "2026-10-15"


@pytest.fixture
def mock_support_events(target_date):
    """Eventos de resolución de tickets de soporte con tiempos de resolución conocidos."""
    return [
        {
            "id": "sup-1",
            "timestamp": f"{target_date}T10:00:00Z",
            "event_type": "support_ticket_resolved",
            "tags": {"resolution_time_minutes": 720, "priority": "high"}  # 12 horas
        },
        {
            "id": "sup-2",
            "timestamp": f"{target_date}T14:30:00Z",
            "event_type": "support_ticket_resolved",
            "tags": {"resolution_time_minutes": 1080, "priority": "medium"}  # 18 horas
        }
    ]


@pytest.fixture
def mock_chatbot_events(target_date):
    """Eventos de incidencias resueltas autónomamente por el chatbot de Nexova."""
    return [
        {
            "id": "bot-1",
            "timestamp": f"{target_date}T09:15:00Z",
            "event_type": "chatbot_issue_resolved",
            "tags": {"topic": "faq_benefits", "confidence": 0.95}
        },
        {
            "id": "bot-2",
            "timestamp": f"{target_date}T11:45:00Z",
            "event_type": "chatbot_issue_resolved",
            "tags": {"topic": "login_issue", "confidence": 0.88}
        }
    ]


@pytest.fixture
def mock_talent_events(target_date):
    """Eventos de scoring de candidatos calculados por el modelo de IA para selección."""
    return [
        {
            "id": "tal-1",
            "timestamp": f"{target_date}T12:00:00Z",
            "event_type": "candidate_score_calculated",
            "tags": {"candidate_id": "cand-001", "score_value": 80.0, "role": "Senior SDR"}
        },
        {
            "id": "tal-2",
            "timestamp": f"{target_date}T15:20:00Z",
            "event_type": "candidate_score_calculated",
            "tags": {"candidate_id": "cand-002", "score_value": 90.0, "role": "Account Exec"}
        }
    ]


# =====================================================================
# TEST 1: TRANSFORMACIÓN DE SOPORTE AL CLIENTE Y SLAs (MTTR)
# =====================================================================
def test_customer_support_mttr_and_sla_breach(target_date):
    """
    Verifica el cálculo de MTTR (horas) y el estado del SLA (meta contractual Nexova: <= 24h).
    Prueba tanto un caso dentro de SLA como uno que excede el SLA (48h histórico).
    """
    # Caso 1: Dentro de SLA (promedio de 15h)
    df_on_track = pd.DataFrame([
        {"event_type": "support_ticket_resolved", "tags": {"resolution_time_minutes": 600}},   # 10h
        {"event_type": "support_ticket_resolved", "tags": {"resolution_time_minutes": 1200}},  # 20h
    ])
    kpis_on_track = calculate_customer_support_kpis(df_on_track, target_date)
    mttr_kpi = next(k for k in kpis_on_track if k["metric_name"] == "mttr_hours")
    
    assert mttr_kpi["metric_value"] == 15.0
    assert mttr_kpi["target_value"] == 24.0
    assert mttr_kpi["sla_status"] == "ON_TRACK"
    assert mttr_kpi["department"] == "customer_support"

    # Caso 2: SLA Incumplido (promedio de 36h)
    df_breached = pd.DataFrame([
        {"event_type": "support_ticket_resolved", "tags": {"resolution_time_minutes": 2160}}   # 36h
    ])
    kpis_breached = calculate_customer_support_kpis(df_breached, target_date)
    mttr_breached = next(k for k in kpis_breached if k["metric_name"] == "mttr_hours")
    
    assert mttr_breached["metric_value"] == 36.0
    assert mttr_breached["sla_status"] == "BREACHED"


# =====================================================================
# TEST 2: TRANSFORMACIÓN DE CHATBOT (TASA DE AUTOMATIZACIÓN)
# =====================================================================
def test_chatbot_automation_rate_threshold(target_date):
    """
    Verifica el cálculo de la tasa de resolución del Chatbot frente al objetivo del 40%.
    Ratio = (tickets_chatbot / (tickets_chatbot + tickets_soporte_humano)) * 100.
    """
    # Caso 1: Meta superada (2 chatbot + 2 soporte humano = 50% de automatización)
    df_success = pd.DataFrame([
        {"event_type": "chatbot_issue_resolved", "tags": {}},
        {"event_type": "chatbot_issue_resolved", "tags": {}},
        {"event_type": "support_ticket_resolved", "tags": {"resolution_time_minutes": 300}},
        {"event_type": "support_ticket_resolved", "tags": {"resolution_time_minutes": 300}},
    ])
    kpis = calculate_customer_support_kpis(df_success, target_date)
    bot_kpi = next(k for k in kpis if k["metric_name"] == "chatbot_automation_rate")

    assert bot_kpi["metric_value"] == 50.0
    assert bot_kpi["target_value"] == 40.0
    assert bot_kpi["sla_status"] == "ON_TRACK"

    # Caso 2: Meta por debajo del objetivo (1 chatbot + 4 soporte humano = 20% -> AT_RISK)
    df_low = pd.DataFrame([
        {"event_type": "chatbot_issue_resolved", "tags": {}},
        {"event_type": "support_ticket_resolved", "tags": {}},
        {"event_type": "support_ticket_resolved", "tags": {}},
        {"event_type": "support_ticket_resolved", "tags": {}},
        {"event_type": "support_ticket_resolved", "tags": {}},
    ])
    kpis_low = calculate_customer_support_kpis(df_low, target_date)
    bot_kpi_low = next(k for k in kpis_low if k["metric_name"] == "chatbot_automation_rate")

    assert bot_kpi_low["metric_value"] == 20.0
    assert bot_kpi_low["sla_status"] == "AT_RISK"


# =====================================================================
# TEST 3: TRANSFORMACIÓN DE SELECCIÓN Y TALENTO (SCORING IA)
# =====================================================================
def test_talent_acquisition_scoring_metrics(target_date):
    """
    Verifica la métrica de volumen de CVs evaluados y promedio de scoring de compatibilidad.
    """
    df_talent = pd.DataFrame([
        {"event_type": "candidate_score_calculated", "tags": {"score_value": 70.0}},
        {"event_type": "candidate_score_calculated", "tags": {"score_value": 85.0}},
        {"event_type": "candidate_score_calculated", "tags": {"score_value": 91.0}},
    ])
    kpis = calculate_talent_acquisition_kpis(df_talent, target_date)

    count_kpi = next(k for k in kpis if k["metric_name"] == "cvs_ai_scored_count")
    avg_kpi = next(k for k in kpis if k["metric_name"] == "avg_candidate_score")

    assert count_kpi["metric_value"] == 3.0
    assert count_kpi["department"] == "talent_acquisition"
    # Promedio esperado: (70 + 85 + 91) / 3 = 246 / 3 = 82.0
    assert avg_kpi["metric_value"] == 82.0
    assert avg_kpi["target_value"] == 70.0


# =====================================================================
# TEST 4: COMPORTAMIENTO DEFENSIVO ANTE DATOS MALFORMADOS O NULOS
# =====================================================================
def test_defensive_behavior_on_malformed_inputs(target_date):
    """
    Verifica que la transformación no lance excepciones no controladas
    ante datos corruptos, payloads None, strings JSON inválidos o listas vacías.
    """
    # 1. Lista completamente vacía
    empty_result = transform_events_to_business_kpis([], target_date)
    assert isinstance(empty_result, list)
    assert len(empty_result) >= 3  # Genera métricas por defecto de ambos departamentos

    # 2. Eventos con tags nulos, strings inválidos o tipos incorrectos
    corrupt_events = [
        {"id": "c-1", "event_type": "support_ticket_resolved", "tags": None},
        {"id": "c-2", "event_type": "support_ticket_resolved", "tags": "invalid-json{{{"},
        {"id": "c-3", "event_type": "candidate_score_calculated", "tags": "null"},
        {"id": "c-4", "event_type": "candidate_score_calculated", "tags": {"score_value": None}},
        {"id": "c-5", "event_type": "unknown_domain_event", "tags": {"foo": "bar"}},
    ]
    corrupt_result = transform_events_to_business_kpis(corrupt_events, target_date)
    assert isinstance(corrupt_result, list)
    
    # Comprobar que todos los KPIs producidos tienen la estructura esperada
    for kpi in corrupt_result:
        assert "metric_name" in kpi
        assert "metric_value" in kpi
        assert "sla_status" in kpi
        assert isinstance(kpi["metric_value"], (int, float))

    # 3. Comprobación de helper parse_tags_payload
    assert parse_tags_payload(None) == {}
    assert parse_tags_payload("not-json") == {}
    assert parse_tags_payload(12345) == {}
    assert parse_tags_payload('{"key": "value"}') == {"key": "value"}


# =====================================================================
# TEST 5: VALIDACIÓN DETERMINISTA EXACTA CON CÁLCULO MANUAL
# =====================================================================
def test_deterministic_kpi_calculation_with_known_hand_calculated_inputs(
    mock_support_events,
    mock_chatbot_events,
    mock_talent_events,
    target_date
):
    """
    Validación determinista: se pasa un conjunto combinado de eventos conocidos
    y se valida que cada KPI coincida EXACTAMENTE con el valor calculado a mano:
    
    - Soporte: 720 min (12h) + 1080 min (18h) = 1800 min / 2 = 900 min = 15.0 horas -> MTTR = 15.0h
    - Chatbot: 2 eventos chatbot y 2 eventos soporte -> total 4 tickets -> (2/4)*100 = 50.0%
    - Talento: 2 eventos con score 80.0 y 90.0 -> count = 2.0, avg_score = (80+90)/2 = 85.0
    """
    all_events = mock_support_events + mock_chatbot_events + mock_talent_events
    kpis = transform_events_to_business_kpis(all_events, target_date)

    kpi_map = {k["metric_name"]: k for k in kpis}

    # 1. MTTR exacto
    assert kpi_map["mttr_hours"]["metric_value"] == 15.0
    assert kpi_map["mttr_hours"]["sla_status"] == "ON_TRACK"

    # 2. Tasa de automatización chatbot exacta
    assert kpi_map["chatbot_automation_rate"]["metric_value"] == 50.0
    assert kpi_map["chatbot_automation_rate"]["sla_status"] == "ON_TRACK"

    # 3. Conteo de CVs evaluados exacto
    assert kpi_map["cvs_ai_scored_count"]["metric_value"] == 2.0

    # 4. Puntuación promedio exacta
    assert kpi_map["avg_candidate_score"]["metric_value"] == 85.0


# =====================================================================
# TEST 6: VALIDACIÓN DE LA TASK DE PREFECT (TRANSFORM_BUSINESS_KPIS_TASK)
# =====================================================================
def test_prefect_transform_task_isolated_execution(mock_support_events, target_date):
    """
    Verifica que la task de Prefect `transform_business_kpis_task` pueda invocarse
    de forma aislada (.fn) sin requerir orquestador externo y devuelva la estructura completa.
    """
    task_output = transform_business_kpis_task.fn(mock_support_events, target_date)

    assert isinstance(task_output, list)
    assert len(task_output) >= 3
    for item in task_output:
        assert item["window_date"] == target_date
        assert item["window_granularity"] == "daily"
        assert item["department"] in ("customer_support", "talent_acquisition")
