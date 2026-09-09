-- Migration 001: Create job_runs table
-- Tabla de control de ejecuciones para el script nocturno de telemetría
-- Máquina de estados: pending → processing → completed | failed
-- El estado 'processing' actúa como distributed lock natural

CREATE TABLE IF NOT EXISTS job_runs (
    id              TEXT PRIMARY KEY,
    job_name        TEXT NOT NULL,
    target_date     TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at      TEXT,
    finished_at     TEXT,
    error_message   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name_date ON job_runs (job_name, target_date);
CREATE INDEX IF NOT EXISTS idx_job_runs_name_status ON job_runs (job_name, status);