# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

## Brasaland incident analyzer

- Main script: `analyze.py`
- Validated fixture: `incidents-brasaland.csv`
- Run command: `python3 scripts/analyze.py scripts/incidents-brasaland.csv`
- Behavior: validates invalid records, prints the operational summary to the console, and optionally exports `results.csv` with `metric`, `value`, and `percentage` columns.

> _Spanish version: [README.es.md](./README.es.md)._
