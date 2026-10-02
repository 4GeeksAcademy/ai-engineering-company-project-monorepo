# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Scripts

### `analyze.py` — Nexova incident CSV analyzer

Validates and computes metrics on a Nexova support-incident CSV export, per the rules in [`CONTEXT-nexova.md`](./CONTEXT-nexova.md).

- **What it does**: loads the CSV, flags invalid records (missing/out-of-range fields, one rule type per issue), and prints totals, an invalid-records breakdown by rule, category/status distribution with percentages, and the average satisfaction score for closed tickets. Offers to export the results to `results.csv` (one metric per row).
- **Requirements**: Python 3.10+, no third-party packages — install the shared validation/metrics package in editable mode once: `pip install -e packages/incidents_analyzer`.
- **Usage**:
  ```bash
  python scripts/analyze.py data/raw/incidents-nexova.csv
  ```
- **Same logic as the API**: the validation/metrics code lives in [`packages/incidents_analyzer`](../packages/incidents_analyzer) and is reused as-is by the `incidents` domain in [`services/api`](../services/api), so the script and the API can never drift apart.
- **Privacy**: never prints, logs, or exports individual `customer_email` values, per the stakeholder note in `CONTEXT-nexova.md`.
