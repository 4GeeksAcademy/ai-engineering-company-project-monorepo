# AI Engineering Company Project — Student Template

[![4Geeks Academy](https://img.shields.io/badge/4Geeks-Academy-blue)](https://4geeksacademy.com)
[![AI Engineering](https://img.shields.io/badge/track-AI%20Engineering-green)](https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia)

_Base template for transversal projects in the AI Engineering Career Program — 4Geeks Academy._

> _Instrucciones disponibles en español en [README.es.md](./README.es.md)._

---

## Purpose

This repository is the **active workspace** for the HealthCore transversal project, with deliverables mapped to course milestones (Web, Programming, Backend, Telemetry, RAG, Agents, Workflows, Real-time).

- Use `CONTEXT.md` for milestone 1 (public website scope).
- Use `CONTEXT-healthcore.es .md` for milestone 2 (TypeScript business logic scope).
- Use `skills/` and the directory-level `README.md` files as working guidance.

---

## Current repository status

The repository contains the base monorepo structure plus project-specific documentation for HealthCore.

- `CONTEXT.md` is already project-specific (HealthCore, milestone 1).
- `CONTEXT-healthcore.es .md` defines milestone 2 requirements for TypeScript logic.
- Shared package metadata exists in `packages/shared/package.json` (`@repo/shared-types`).

---

## Repository structure

```text
ai-engineering-company-project-monorepo/
├── README.md
├── README.es.md
├── CONTEXT.md                # HealthCore context (milestone 1)
├── agents/                   # Agent patterns/templates and tools docs
├── data/                     # raw, process, pipelines, eval
├── docs/                     # Project and architecture documentation
├── infra/                    # Docker, Terraform, deployment configs
├── internal/                 # CLIs, packaged migration scripts, internal utilities
├── mcps/                     # Model Context Protocol (MCP) Servers
├── packages/
│   └── shared/               # Shared package (@repo/shared-types)
├── scripts/                  # Script conventions/documentation
├── services/                 # APIs and background workers
├── shared/                   # Shared assets/conventions at repo level
├── skills/                   # Reusable agent skills
├── uis/                      # User interfaces (React, Next.js, Streamlit, HTML)
└── workflows/                # Automation/orchestration documentation
```

---

## How to start

1. **Use this repository as a template** and create your own project repo.
2. **Clone** your repository (or open it in Codespaces).
3. **Read** `CONTEXT.md` and `CONTEXT-healthcore.es .md` before implementing features.
4. **Review** each top-level folder `README.md` to understand intended responsibilities (`uis/`, `services/`, `data/`, `skills/`, etc.).
5. **Start implementing** milestone deliverables in `uis/` and `services/`, reusing `packages/shared/` and `data/` as needed.

---

## Milestones (reference)

| Milestone | Focus        | Typical deliverables                        |
| --------- | ------------ | ------------------------------------------- |
| 0         | Prework      | Environment setup, first prompts            |
| 1         | Web          | Corporate website, forms, SEO               |
| 2         | Programming  | Business logic, scoring, calculations       |
| 3         | AI-driven UI | AI-generated interfaces                     |
| 4         | Next.js      | Portals, loyalty app, operations UI         |
| 5         | Backend      | Central API (locations, menus, sales, etc.) |
| 6         | Telemetry    | Data pipeline, dashboards                   |
| 7         | RAG & Memory | Semantic knowledge base, search             |
| 8         | Agents       | Support, onboarding, training agents        |
| 9         | Workflows    | n8n automations                             |
| 10        | Real-time    | Live dashboards, alerts, streaming          |

---

## Links

- [4Geeks Academy — AI Engineering](https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia)
- [How to start a coding project](https://4geeks.com/lesson/how-to-start-a-project)

---

## Contributors

This template was built as part of the 4Geeks Academy AI Engineering Career Program by [@marcogonzalo](https://www.linkedin.com/in/marcogonzalo) and [@alezanchezr](https://x.com/alesanchezr) and many other contributors. Find out more about our [AI Engineering Course](https://4geeksacademy.com/en/career-programs/ai-engineering), and [other courses](https://4geeksacademy.com/en/program-comparison).

You can find other templates and resources like this at the [4Geeks Academy GitHub page](https://github.com/4geeksacademy).

_This template is maintained by 4Geeks Academy for the AI Engineering track. For exclusive use in the programme._
