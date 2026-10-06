create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null,
  service text not null,
  event_type text not null,
  level text default 'info' check (level in ('info','warn','error')),
  value numeric,
  message text,
  tags jsonb not null default '{}'::jsonb
);
create index if not exists telemetry_events_timestamp_idx on public.telemetry_events ("timestamp");
create index if not exists telemetry_events_event_type_idx on public.telemetry_events (event_type);
create index if not exists telemetry_events_tags_gin_idx on public.telemetry_events using gin (tags);
alter table public.telemetry_events enable row level security;
revoke update, delete, truncate on public.telemetry_events from anon, authenticated;
create or replace function public.telemetry_events_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'telemetry_events is append-only';
end;
$$;
drop trigger if exists telemetry_events_no_update_delete on public.telemetry_events;
create trigger telemetry_events_no_update_delete before update or delete on public.telemetry_events for each row execute function public.telemetry_events_immutable();
