-- =====================================================================
-- Migración: Creación de la tabla job_runs para orquestación y distributed locks
-- Ticket: #DEV-53 — Procesos en Segundo Plano
-- =====================================================================

-- 1. Creación de la tabla job_runs
CREATE TABLE IF NOT EXISTS job_runs (
    id UUID PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    target_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índice compuesto para consultas eficientes de idempotencia por fecha y job
CREATE INDEX IF NOT EXISTS idx_job_runs_name_date 
    ON job_runs (job_name, target_date);

-- 3. Índice para acelerar la detección de distributed locks activos ('processing')
CREATE INDEX IF NOT EXISTS idx_job_runs_status 
    ON job_runs (job_name, status);
