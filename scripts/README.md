# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Scripts

### `analyze.py` — Nexova incident CSV analyzer

Validates and computes metrics on a Nexova support-incident CSV export, per the rules in [`CONTEXT-nexova.md`](./CONTEXT-nexova.md).

- **What it does**: loads the CSV, flags invalid records (missing/out-of-range fields, one rule type per issue), and prints totals, an invalid-records breakdown by rule, category/status distribution with percentages, and the average satisfaction score for closed tickets. Offers to export the results to `results.csv` (one metric per row).
- **Requirements**: Python 3.10+, no third-party packages — install the shared validation/metrics package in editable mode once: `pip install -e packages/shared/incidents_analyzer`.
- **Usage**:
  ```bash
  python scripts/analyze.py data/raw/incidents-nexova.csv
  ```
- **Same logic as the API**: the validation/metrics code lives in [`packages/shared/incidents_analyzer`](../packages/shared/incidents_analyzer) and is reused as-is by the `incidents` domain in [`services/api`](../services/api), so the script and the API can never drift apart.
- **Privacy**: never prints, logs, or exports individual `customer_email` values, per the stakeholder note in `CONTEXT-nexova.md`.

### `seed_incidents.py` — load the CSV history into the incident manager

Loads the historical helpdesk export into the incident manager's database (`services/api/incidents/db.json`).

- **What it does**: validates every row with the shared `incidents_analyzer` rules, transforms it (`description → title`, `date → created_at`, status and category maps, optional `location`/`ubicacion` column → `branch`, default `central`) and inserts it with `origin: "customer"`. Invalid rows are **not** inserted: they are listed with their line, id and broken rules (never the email). Idempotent: ids already stored are skipped, never overwritten. It ends by checking that `/api/incidents/summary` matches the metrics expected from the transformed CSV (exit code `1` if not).
- **Requirements**: the API's environment (pydantic, tinydb…): `cd services/api && python -m venv .venv && .venv/bin/pip install -r requirements.txt`.
- **Usage**:
  ```bash
  services/api/.venv/bin/python scripts/seed_incidents.py              # data/raw/incidents-nexova.csv
  services/api/.venv/bin/python scripts/seed_incidents.py --reset      # wipe the incidents first
  services/api/.venv/bin/python scripts/seed_incidents.py --csv other.csv --db /tmp/incidents.json
  ```
- **Details and mapping table**: [`services/api/README.md`](../services/api/README.md#incident-manager). The CONTEXT does not define the maps; they live in [`packages/shared/incidents/contract.json`](../packages/shared/incidents/contract.json).
