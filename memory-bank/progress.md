# Progress — TrackFlow

> Based exclusively on information from `CONTEXT.md` and `README.md`. Date: 2026-10-17.

---

## Current Development Status

### Organization

Daniel has created an internal unit called **TrackFlow Tech** with a clear mandate: build the systems, integrations, and intelligent automations that allow TrackFlow to operate as the modern logistics company it needs to become.

### Repository Status

> The repository currently provides a **base folder structure and documentation skeleton** only. It does not include runnable apps or global scripts.

- `CONTEXT.md` already contains the full TrackFlow context (replacing the original template placeholder).
- `AGENTS.md` exists at root with rules for coding agents.
- `pre-commit-validation` workflow skill exists in `.agents/skills/` for automating the AGENTS.md pre-commit flow.
- 3 business skills (`carrier-performance-analysis`, `returns-condition-classifier`, `weekly-executive-report`) are located in `skills/` alongside the existing development skills.
- Shared package metadata exists in `packages/shared/package.json` (`@repo/shared-types`), but **no workspace runner is configured at root**.

### What Already Exists (Structure)

| Folder       | Purpose                                  | Status    |
| ------------ | ---------------------------------------- | --------- |
| `uis/website`    | Public-facing web presence (frontend)     | Skeleton  |
| `uis/backoffice` | Internal admin application (frontend)     | Skeleton  |
| `services/`      | Centralized FastAPI API                    | Skeleton  |
| `data/`      | Data, pipelines, evaluation              | Skeleton  |
| `agents/`    | AI agents (+ `_template/`)               | Skeleton  |
| `skills/`    | Reusable agent capabilities              | Skeleton (includes `data-analysis`, `carrier-performance-analysis`, `returns-condition-classifier`, `weekly-executive-report`, and `code-review` skills) |
| `mcps/`      | MCP servers (Model Context Protocol)     | Skeleton  |
| `workflows/` | Automation flows (n8n)                   | Skeleton  |
| `packages/`  | Shared libraries                         | Skeleton (with real shared types in `packages/shared/`) |
| `shared/`    | Loose shared assets                      | Skeleton  |
| `docs/`      | Cross-cutting documentation              | Skeleton  |
| `infra/`     | Infrastructure and deployment            | Skeleton  |
| `scripts/`   | Helper scripts                           | Skeleton  |
| `internal/`  | Internal developer tools                 | Skeleton  |

### Current Company Problems (Unsolved)

1. **No global inventory visibility** — The two warehouses cannot see each other's stock.
2. **Manual inbound orders** — They arrive by email in different formats and are manually transcribed.
3. **Paper-based picking** — Printed lists, no digitization.
4. **Manual carrier assignment** — No objective criteria or historical performance data.
5. **Fragmented tracking** — Each carrier has its own portal; no unified endpoint.
6. **Returns reviewed one by one** — No automatic approval criteria.
7. **Subjective inspection** — No AI assistance to classify returned product condition.
8. **80% of CX queries automatically resolvable** — But all are answered by a human.
9. **No CRM** — Account managers use personal spreadsheets and email threads.
10. **Manual reporting** — The CEO receives a consolidated report on Mondays with data 1–2 days old.
11. **No centralized telemetry** — When something fails, the team finds out via WhatsApp.
12. **Slow deployment** — 1–2 weeks to deploy a new feature.
13. **No knowledge base** — CX agents consult a Word document on Google Drive.

---

## Next Steps

Based on the needs expressed by each department in `CONTEXT.md`:

### 1. 🚚 Warehouse Operations

- [ ] Unified inventory API (real-time stock for any SKU in both warehouses)
- [ ] Order ingestion pipeline (automatic email parsing)
- [ ] Warehouse operations dashboard
- [ ] Low-stock alerts (notifications to client and procurement team)

### 2. 📦 Last Mile and Carriers

- [ ] Carrier selection engine (optimal recommendation based on destination, weight, and urgency)
- [ ] Unified tracking endpoint (aggregation from 8 carriers)
- [ ] Public tracking portal for recipients
- [ ] Carrier performance dashboard

### 3. 🔄 Reverse Logistics

- [ ] Automatic returns approval engine (configurable per-client rules)
- [ ] Automated collection flow (approval → label → carrier schedule)
- [ ] AI-assisted inspection system (photograph → condition classification)
- [ ] Returns dashboard with pattern analysis

### 4. 📞 Customer Experience (CX)

- [ ] First-line CX agent (automatic resolution of tracking and returns queries)
- [ ] Semantic knowledge base indexed for RAG
- [ ] Unified ticketing system
- [ ] Real-time CX dashboard
- [ ] Sentiment analysis (detection of frustrated customers)
- [ ] Multilingual support (Spanish + English, starting from one base language)

### 5. 🤝 Commercial and Clients

- [ ] CRM with unified client profiles
- [ ] Automatic client PDF reports (agent-generated)
- [ ] Client health dashboard (renewal risk score)
- [ ] 90 and 30-day renewal alerts
- [ ] Commercial agent (suggest relevant services and pricing for prospects)

### 6. 💻 Technology

- [ ] Centralized telemetry and logging (both countries)
- [ ] Data pipeline (feeding all company dashboards)
- [ ] Real-time monitoring with automatic alerts
- [ ] Technical documentation agent
- [ ] Operations task automation (backups, health checks, incident notifications)

### 7. 📊 Executive Direction

- [ ] Global executive dashboard with real-time KPIs
- [ ] Automatically generated weekly report (Monday at 7:00)
- [ ] Country comparison views
- [ ] Threshold alerts
- [ ] Natural language AI assistant for the CEO

---

## Notes

- This record will be updated as the different systems, agents, and integrations are developed.
- Priorities must be defined with the team (no priority order is specified in `CONTEXT.md`).
- Each new service, agent, or pipeline must be documented in its own subfolder with its `README.md`.

---

_Source: [CONTEXT.md](../CONTEXT.md), [README.md](../README.md) — Internal document of 4Geeks Academy · AI Engineering Track._