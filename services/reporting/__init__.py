"""Brasaland reporting HTTP shell (Phase 5).

Separate from ``services/telemetry`` and from ``GET /telemetry/report``.
Routes only call ``data/pipelines/`` helpers — no ETL arithmetic here.
"""
