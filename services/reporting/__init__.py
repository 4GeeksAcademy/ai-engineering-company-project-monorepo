"""
services/reporting/__init__.py — Módulo de reporting para el pipeline

Propósito:
    Expone los resultados del pipeline de desempeño de negocio a través
    de una API REST independiente del servicio de telemetría.
    
    Este módulo contiene:
    - reporting_routes.py: Endpoints de consulta y disparo del pipeline
    
    Los endpoints importan funciones desde data/pipelines/ — no duplican
    lógica del pipeline (principio DRY).
"""

from __future__ import annotations