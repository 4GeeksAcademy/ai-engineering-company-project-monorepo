# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

## Scripts

Run them from the repository root.

- `nightly_export.py` — nightly telemetry job (milestone 21, ticket #DEV-53; `uv run python scripts/nightly_export.py`). For the previous UTC day (or `TARGET_DATE=YYYY-MM-DD`) it exports `telemetry_events` to `data/raw/telemetry_YYYY-MM-DD.csv` if the file does not exist yet (a backup; the pipeline does not read it), launches `data/pipelines/pipeline.py` as a subprocess and records the run in `job_runs` (`services/job_runner`). If another run is `processing` or the day is already `completed`, it exits without doing anything. The `nightly-export` container in `docker-compose.yml` triggers it every day at 02:30 UTC. Details in [hito_21.md](../hito_21.md).

> _Spanish version: [README.es.md](./README.es.md)._
