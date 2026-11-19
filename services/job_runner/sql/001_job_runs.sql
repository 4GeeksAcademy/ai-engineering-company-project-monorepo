-- Tabla `job_runs`: registro de ejecución de los jobs programados (hito 21, ticket #DEV-53).
--
-- Una fila por ejecución real de un job (hoy, `nightly_export`): qué día procesó (`target_date`),
-- en qué estado está y, si falló, por qué. Máquina de estados:
--
--     pending ──► processing ──► completed
--        │             │
--        └─────────────┴───────► failed
--
-- No se fusiona con `reporting.pipeline_runs` (hito 19): esa tabla la escribe el pipeline durante
-- su propia corrida; esta la escribe el script nocturno que lo lanza. Son capas distintas.
--
-- Idempotente: la ejecuta `services.job_runner.ensure_job_runs_table()` al arrancar el script, y
-- también se puede pegar en el SQL Editor de Supabase. Nunca borra ni altera datos.

create table if not exists public.job_runs (
  id             uuid primary key default gen_random_uuid(),
  job_name       text not null,
  target_date    date not null,                       -- día procesado: la clave de la idempotencia
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'completed', 'failed')),
  started_at     timestamptz,                         -- cuándo pasó a processing
  finished_at    timestamptz,                         -- cuándo pasó a completed o failed
  error_message  text,                                -- la excepción, si failed
  details        jsonb not null default '{}',         -- qué hizo: CSV, filas, comando, run del pipeline
  created_at     timestamptz not null default now(),  -- cuándo se registró (pending)
  check (status <> 'processing' or started_at is not null),
  check (status not in ('completed', 'failed') or finished_at is not null),
  check (status <> 'failed' or error_message is not null)
);

-- Consultas de idempotencia: «¿hay un completed de este job para este día?».
create index if not exists ix_job_runs_job_name_target_date
  on public.job_runs (job_name, target_date);

-- El estado `processing` ES el lock: como mucho una ejecución en curso por job. Una segunda
-- instancia que intente pasar a processing a la vez falla al escribir (no hay tabla de locks).
create unique index if not exists ux_job_runs_one_processing
  on public.job_runs (job_name) where status = 'processing';

-- Idempotencia garantizada también por la base: un solo completed por (job, día).
create unique index if not exists ux_job_runs_one_completed_per_date
  on public.job_runs (job_name, target_date) where status = 'completed';

-- Igual que telemetry_events: la API REST pública de Supabase no la lee ni la escribe.
alter table public.job_runs enable row level security;
