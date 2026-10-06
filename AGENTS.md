# Agent Guidance

This is the **Brasaland** company monorepo (`CONTEXT.md`: grilled food, 14 locations, Colombia + Florida). Work across the **full repository** using existing top-level folders. Do not invent another company or treat the four-company template placeholder as valid context.

Canonical file name: `AGENTS.md` (this file).

## Session start (mandatory reads)

Before analyzing code, editing files, or proposing architecture, read **all** of the following, in this order:

1. `CONTEXT.md` — **Brasaland company briefing** (must start with “Welcome to Brasaland”). If the four-company placeholder is back, stop and restore the briefing.
2. `memory-bank/README.md` — index (must point at `CONTEXT.md` as source of truth).
3. `memory-bank/Projectbrief.md` — maps `CONTEXT.md` departments to monorepo objectives.
4. `memory-bank/Techcontext.md` — stack + `CONTEXT.md` constraints (COP/USD, central API nouns, Executive needs).
5. `memory-bank/Progress.md` — coverage vs each `CONTEXT.md` department need.
6. `.agents/rules/00-operating-loop.md` — always-active rule (department map).

Then read the `README.md` of **every top-level folder you will touch**. Prefer `.agents/skills/verify-brasaland-api` (or another skill under `.agents/skills/`) over inventing a workflow.

## Mandatory workflow before each commit

Do not commit until every step below has been completed **in this order**. Do not skip, merge, or reorder them.

1. **Re-read Brasaland context.** Open `CONTEXT.md` and the three memory-bank files. Name which department need the change serves (Operations, Procurement, Marketing, People, Training, Technology, or Executive).
2. **Audit the change set.** Run `git status` and `git diff`. Every path must be required for the task. If any path is in the protected list below, **stop** unless the developer already confirmed that path in this session.
3. **Verify.** For API/agent work, run `.agents/skills/verify-brasaland-api` (or the documented checks for the surface you touched). Do not commit on a red or unrun check. Do not claim Technology’s full central API if locations/menus/sales/customers/suppliers are still missing.
4. **Record evidence.** Update `memory-bank/Progress.md` (coverage table + commands). Then commit only the intended files with a message that states **why**, tied to Brasaland — only if the developer asked for a commit.

## Do not modify without explicit developer confirmation

Do **not** create, edit, delete, or rewrite these paths unless the developer named them in this session:

| Path | Why |
| --- | --- |
| `CONTEXT.md`, `CONTEXT.es.md` | Company identity (official Brasaland briefing) |
| `memory-bank/Projectbrief.md`, `memory-bank/Techcontext.md` | Setup decisions grounded in `CONTEXT.md`; `Progress.md` may be updated after a verified change |
| `AGENTS.md` | Agent contract |
| `.gitignore`, `.env`, `.env.*`, any credentials or API keys | Secrets and ignore policy |
| `.git/`, git config, hooks | History and identity |
| `docker-compose.yml`, `Dockerfile`, `pyproject.toml`, `requirements.txt`, `uv.lock`, `package.json`, `package-lock.json` | Shared stack and lockfiles |
| `.venv/`, `node_modules/`, `__pycache__/`, `*.pyc` | Generated / local installs |
| `data/uploads/`, `data/celery_dead_letters.sqlite3`, `conversation_log.csv`, `results.csv` | Runtime artifacts (gitignored) |
| Top-level folder **names** (`uis/`, `services/`, `data/`, `agents/`, `skills/`, …) | Do not rename, delete, or replace the monorepo layout |

Also requires confirmation: force-push, rewriting `main`, adding a new top-level application folder, or scaffolding a second repository.

## Placement (when you are allowed to write code)

- UI → `uis/` (`website/` public corporate site; `backoffice/` internal `/accessible`; `web/` is incident HTML, not marketing).
- API / workers → `services/` toward Technology nouns: locations, menus, sales, customers, suppliers (root `api/app.py` only loads `services/api/app.py`).
- ETL → `data/pipelines/` feeding ops/finance for 14 locations.
- New agent → `agents/` (start from `agents/_template/`); root `agent.py` is the inventory/assistant loop.
- Project skills → `.agents/skills/`; shared catalog skills may also live under `skills/`.
