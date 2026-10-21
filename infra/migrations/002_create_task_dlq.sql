-- =====================================================================
-- Migración: Creación de la tabla task_dlq para Dead Letter Queue (DLQ)
-- Ticket: #DEV-55 — Colas de Mensajes y Tareas Asíncronas
-- =====================================================================

CREATE TABLE IF NOT EXISTS task_dlq (
    id UUID PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    task_name VARCHAR(150) NOT NULL,
    arguments TEXT,
    retry_count INTEGER NOT NULL,
    error_message TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_dlq_task_id ON task_dlq (task_id);
CREATE INDEX IF NOT EXISTS idx_task_dlq_failed_at ON task_dlq (failed_at);
