CREATE TABLE IF NOT EXISTS public.telemetry_events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    properties JSONB NOT NULL,
    session_id UUID,
    user_id UUID,
    schema_version TEXT NOT NULL,
    request_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS event_type
    ON public.telemetry_events (event_type);
CREATE INDEX IF NOT EXISTS "timestamp"
    ON public.telemetry_events (event_timestamp DESC);
CREATE INDEX IF NOT EXISTS tags
    ON public.telemetry_events USING GIN (properties jsonb_path_ops);