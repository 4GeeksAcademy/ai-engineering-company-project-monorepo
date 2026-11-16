# Tech Context — TrackFlow

> Based exclusively on information from `CONTEXT.md`. Date: 2026-10-17.

---

## Technology Stack

### Current State (Legacy Architecture)

| Component                    | Description                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| **WMS — Los Angeles**        | Commercial warehouse management software                                                             |
| **WMS — Zaragoza**           | Advanced spreadsheet                                                                                 |
| **Corporate ERP**            | System from the early 2010s                                                                          |
| **Integrations**             | Point-to-point Python scripts, undocumented                                                          |
| **Databases**                | In two different cloud providers                                                                     |
| **Telemetry**                | No centralized system. When something fails in Los Angeles, the Zaragoza team finds out via WhatsApp |
| **Deployment**               | A new feature takes one to two weeks to deploy                                                       |

### Target Stack (What the Company Needs)

TrackFlow Tech's mandate includes building:

- **Unified Inventory API** — real-time stock for any SKU in either warehouse.
- **Order Ingestion Pipeline** — automatic parsing of emails with varying client formats.
- **Carrier Selection Engine** — optimal recommendation based on destination, weight, and urgency.
- **Unified Tracking Endpoint** — status aggregation from 8 different carrier APIs.
- **Public Tracking Portal** — for package recipients.
- **Automatic Returns Approval Engine** — with configurable per-client rules.
- **AI-Assisted Inspection System** — image-based classification of returned product condition.
- **First-Line CX Agent** — automatic resolution of tracking and returns queries.
- **Semantic Knowledge Base** — indexed for RAG, multilingual support (Spanish + English).
- **Unified Ticketing System** — for customer support.
- **CRM with Unified Client Profiles** — automatic PDF reports and health dashboard.
- **Centralized Telemetry and Logging** — both countries.
- **Data Pipeline** — feeding all company dashboards.
- **Real-Time Monitoring** — automatic alerts.
- **Global Executive Dashboard** — real-time KPIs, country comparisons, automatic weekly report.
- **Natural Language AI Assistant** — for the CEO.
- **Technical Documentation Agent** — for the technology team.
- **Operations Task Automation** — backups, health checks, incident notifications.

## Architectural Decisions (Implicit in the Context)

1. **Monorepo** — The current repository is a monorepo with layer-based folders (`uis/`, `services/`, `agents/`, `data/`, `workflows/`, etc.).
2. **Centralized API (FastAPI)** — According to `README.md`, a single FastAPI backend is recommended as the entry point.
3. **AI Agents** — Agents live in `agents/` with reusable skills in `skills/` and MCP servers in `mcps/`.
4. **Automation Flows** — n8n for cross-system orchestration (`workflows/`).
5. **Shared Types** — `packages/shared/` with `@repo/shared-types` for common interfaces.
6. **Docker Compose** — Described in `README.md` as local orchestration from the repository root, but the `docker-compose.yml` file does not exist yet (pending creation).

## Constraints

- **Two countries, two languages** — Systems must work in the US and Spain, with optional but recommended support for Spanish and English.
- **8 different carriers** — Each with its own API and tracking format (UPS, FedEx, DHL, MRW, SEUR, etc.).
- **Undocumented legacy** — The ERP, Python scripts, and existing databases lack documentation.
- **No centralized telemetry** — No real-time visibility into system status.
- **Small team** — The technology team is 7 people in Zaragoza.
- **24/7 systems** — Clients expect their parcels without interruption; the CX agent, tracking portal, and dashboards must be always available.
- **18–25% returns volume** — Reverse logistics represents a significant fraction of total volume.

## Technology Team

| Role                  | Detail                                                      |
| --------------------- | ---------------------------------------------------------- |
| **CTO**               | Andrés Kim, based in Zaragoza                              |
| **Team size**         | 7 people (developers, data engineers, systems)             |
| **Location**          | Zaragoza, Spain (technology office)                        |

---

_Source: [CONTEXT.md](../CONTEXT.md), [README.md](../README.md) — Internal document of 4Geeks Academy · AI Engineering Track._
