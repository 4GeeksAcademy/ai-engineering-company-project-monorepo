-- Reporting schema — Fases 3/4 de docs/PIPELINE_DESIGN.md (secciones 6, 8, 9).
--
-- Dos tablas nuevas, ambas aditivas (CREATE SCHEMA/TABLE IF NOT EXISTS):
--   reporting.weekly_location_performance — tabla de destino aprobada por
--     negocio, DDL copiado literal de docs/company-briefing.md sección 5
--     (nombre, columnas y el UNIQUE(location_id, week_start) del que
--     depende la idempotencia del pipeline — ver
--     data/pipelines/weekly-location-performance/load.py).
--   reporting.pipeline_runs — log de ejecución propuesto en
--     docs/PIPELINE_DESIGN.md sección 9, extendido aquí con
--     optional_step_error (no está en esa sección) para distinguir una
--     falla del paso opcional/no crítico del pipeline de una falla en las
--     etapas imprescindibles (extract/transform/load), tal como exige esta
--     fase explícitamente.
--
-- Nunca toca telemetry_events — este pipeline solo lee esa tabla
-- (docs/company-briefing.md sección 7); nada aquí la altera.

CREATE SCHEMA IF NOT EXISTS reporting;

-- ── reporting.weekly_location_performance (DDL aprobado, sección 5) ─────
CREATE TABLE IF NOT EXISTS reporting.weekly_location_performance (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id               text NOT NULL,
    country                   text NOT NULL,
    week_start                date NOT NULL,
    total_purchase_cost       numeric NOT NULL DEFAULT 0,
    total_waste_cost          numeric NOT NULL DEFAULT 0,
    waste_ratio               numeric NOT NULL DEFAULT 0,
    stockout_events_count     integer NOT NULL DEFAULT 0,
    price_alert_events_count  integer NOT NULL DEFAULT 0,
    currency                  text NOT NULL,
    computed_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (location_id, week_start)
);

COMMENT ON TABLE reporting.weekly_location_performance IS
    'KPIs semanales de costo/merma por local — docs/company-briefing.md. '
    'Una fila por (location_id, week_start); una re-ejecución reemplaza '
    'esa misma fila vía este UNIQUE '
    '(data/pipelines/weekly-location-performance/load.py), nunca la duplica.';

-- ── reporting.pipeline_runs (log de ejecución, sección 9) ───────────────
CREATE TABLE IF NOT EXISTS reporting.pipeline_runs (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prefect_flow_run_id    uuid,
    pipeline_name          text NOT NULL,
    pipeline_version       text NOT NULL,
    requested_week_start   date NOT NULL,
    scope                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                 text NOT NULL
        CHECK (status IN ('running', 'succeeded', 'failed')),
    started_at             timestamptz NOT NULL DEFAULT now(),
    finished_at            timestamptz,
    records_read           integer,
    records_rejected       integer,
    records_transformed    integer,
    records_loaded         integer,
    failed_stage           text
        CHECK (failed_stage IS NULL OR failed_stage IN ('extract', 'transform', 'load', 'log')),
    error_summary          text,
    optional_step_error    text,
    triggered_by           text NOT NULL
);

COMMENT ON TABLE reporting.pipeline_runs IS
    'Una fila inmutable por intento de corrida (nunca vuelve a running — '
    'una re-ejecución siempre inserta una fila nueva). error_summary es '
    'para fallas de etapas imprescindibles (extract/transform/load); '
    'optional_step_error se registra aparte cuando solo falla el paso '
    'opcional/no crítico, para no mezclar ambos conceptos.';

CREATE INDEX IF NOT EXISTS ix_pipeline_runs_name_started_at
    ON reporting.pipeline_runs USING btree (pipeline_name, started_at DESC);
