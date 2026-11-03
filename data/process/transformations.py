"""
Transformaciones y agregaciones de métricas de negocio para Nexova Solutions.
Módulo reutilizable desacoplado de la orquestación de Prefect.
"""

from typing import List, Dict, Any
import json
import pandas as pd


def parse_tags_payload(tags_value: Any) -> Dict[str, Any]:
    """Parsea el payload de tags/properties admitiendo dict o string JSON."""
    if isinstance(tags_value, dict):
        return tags_value
    if isinstance(tags_value, str):
        try:
            return json.loads(tags_value)
        except Exception:
            return {}
    return {}


def calculate_customer_support_kpis(df_events: pd.DataFrame, window_date: str) -> List[Dict[str, Any]]:
    """
    Calcula los KPIs del departamento de Atención al Cliente (Roberto Díaz):
    1. MTTR en horas (Meta: < 24h, actual histórico: 48h).
    2. Tasa de automatización del Chatbot (Meta: >= 40%).
    """
    kpis: List[Dict[str, Any]] = []

    # 1. MTTR y Tickets Resueltos
    support_df = df_events[df_events["event_type"] == "support_ticket_resolved"].copy()
    if not support_df.empty:
        support_props = [parse_tags_payload(t) for t in support_df["tags"]]
        res_minutes = [p.get("resolution_time_minutes", 0) for p in support_props if isinstance(p, dict)]

        if res_minutes:
            avg_minutes = sum(res_minutes) / len(res_minutes)
            mttr_hours = round(avg_minutes / 60.0, 2)
            sla_status = "ON_TRACK" if mttr_hours <= 24.0 else "BREACHED"
        else:
            mttr_hours = 0.0
            sla_status = "ON_TRACK"

        kpis.append({
            "window_date": window_date,
            "window_granularity": "daily",
            "department": "customer_support",
            "metric_name": "mttr_hours",
            "metric_value": mttr_hours,
            "target_value": 24.0,
            "sla_status": sla_status
        })
    else:
        # Fallback informativo si no hubo tickets en la ventana
        kpis.append({
            "window_date": window_date,
            "window_granularity": "daily",
            "department": "customer_support",
            "metric_name": "mttr_hours",
            "metric_value": 0.0,
            "target_value": 24.0,
            "sla_status": "ON_TRACK"
        })

    # 2. Tasa de Automatización del Chatbot
    bot_df = df_events[df_events["event_type"] == "chatbot_issue_resolved"].copy()
    total_tickets = len(support_df) + len(bot_df)

    if total_tickets > 0:
        bot_rate = round((len(bot_df) / total_tickets) * 100.0, 2)
        bot_status = "ON_TRACK" if bot_rate >= 40.0 else "AT_RISK"
    else:
        bot_rate = 0.0
        bot_status = "ON_TRACK"

    kpis.append({
        "window_date": window_date,
        "window_granularity": "daily",
        "department": "customer_support",
        "metric_name": "chatbot_automation_rate",
        "metric_value": bot_rate,
        "target_value": 40.0,
        "sla_status": bot_status
    })

    return kpis


def calculate_talent_acquisition_kpis(df_events: pd.DataFrame, window_date: str) -> List[Dict[str, Any]]:
    """
    Calcula los KPIs de Operaciones de Selección (Javier Almeida):
    1. Volumen de CVs evaluados mediante scoring de IA (Meta: >= 50 por día).
    2. Puntuación promedio de scoring IA (0 - 100).
    """
    kpis: List[Dict[str, Any]] = []
    talent_df = df_events[df_events["event_type"] == "candidate_score_calculated"].copy()

    if not talent_df.empty:
        talent_props = [parse_tags_payload(t) for t in talent_df["tags"]]
        scores = [p.get("score_value") for p in talent_props if isinstance(p, dict) and p.get("score_value") is not None]
        cv_count = float(len(talent_df))
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        cv_status = "ON_TRACK" if cv_count >= 50.0 else "AT_RISK"

        kpis.append({
            "window_date": window_date,
            "window_granularity": "daily",
            "department": "talent_acquisition",
            "metric_name": "cvs_ai_scored_count",
            "metric_value": cv_count,
            "target_value": 50.0,
            "sla_status": cv_status
        })
        kpis.append({
            "window_date": window_date,
            "window_granularity": "daily",
            "department": "talent_acquisition",
            "metric_name": "avg_candidate_score",
            "metric_value": avg_score,
            "target_value": 70.0,
            "sla_status": "ON_TRACK"
        })
    else:
        kpis.append({
            "window_date": window_date,
            "window_granularity": "daily",
            "department": "talent_acquisition",
            "metric_name": "cvs_ai_scored_count",
            "metric_value": 0.0,
            "target_value": 50.0,
            "sla_status": "AT_RISK"
        })
    return kpis


def transform_events_to_business_kpis(raw_events: List[Dict[str, Any]], window_date: str) -> List[Dict[str, Any]]:
    """
    Punto de entrada principal de transformación:
    Convierte la lista de eventos en filas de KPIs ejecutivos consolidados.
    """
    if not raw_events:
        # Si no hay eventos, genera la plantilla base con valores cero
        return (
            calculate_customer_support_kpis(pd.DataFrame(columns=["event_type", "tags"]), window_date)
            + calculate_talent_acquisition_kpis(pd.DataFrame(columns=["event_type", "tags"]), window_date)
        )

    df = pd.DataFrame(raw_events)
    # Deduplicación por id de evento por seguridad si viene duplicado
    if "id" in df.columns:
        df = df.drop_duplicates(subset=["id"], keep="last")

    support_kpis = calculate_customer_support_kpis(df, window_date)
    talent_kpis = calculate_talent_acquisition_kpis(df, window_date)

    return support_kpis + talent_kpis
