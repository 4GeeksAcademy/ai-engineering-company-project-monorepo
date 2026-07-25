# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

## Available scripts

### `analyze.py`

CLI utility to analyze an incidents CSV file, detect invalid rows, and compute summary metrics from valid records.

- **Usage**: `python3 scripts/analyze.py incidents.csv`
- **Accepted headers**: `categoria` or `category`, `estado` or `status`, `satisfaccion` or `satisfaction`
- **Validation rules**: category and status are required, status must be `abierto`, `cerrado`, or `descartado`, and closed cases require a satisfaction value between `0` and `5`
- **Output**: readable console summary plus an optional `results.csv` export after interactive confirmation

> _Spanish version: [README.es.md](./README.es.md)._
