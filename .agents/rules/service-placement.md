# Rule: Service and Component Placement

> Based on the root `README.md` folder guide, the *"Where should I put this?"*
> decision guide, and the `README.md` of each top-level folder.

**Scope:** 🔁 Always active — applies whenever creating any new file, component, service, agent, or folder anywhere in the monorepo.

## Principle

This monorepo follows a **layer-based structure**. Each top-level folder has a
**single responsibility**. Every new component must be placed in the folder
that matches its responsibility, as defined in the root `README.md`.

## Quick decision table

| If the component...                                       | Then it goes in... |
|-----------------------------------------------------------|--------------------|
| Has buttons and screens (a human sees and clicks it)      | `uis/` |
| Runs on a server, exposes an API, or consumes a queue     | `services/` |
| Is raw or transformed data                                | `data/raw/` or `data/process/` |
| Moves data between systems (ETL/ELT)                      | `data/pipelines/` |
| Measures AI or pipeline quality                           | `data/eval/` |
| Is an AI assistant with a goal                            | `agents/` |
| Is a reusable AI capability or instruction                | `skills/` |
| AI needs to call external tools or APIs                   | `mcps/` |
| Is n8n or scheduled automation                            | `workflows/` |
| Will be imported by 2+ folders                            | `packages/` |
| Is a schema, template, or loose asset (not a library)     | `shared/` |
| Is architecture or team-wide documentation                | `docs/` |
| Is Docker, deploy, or cloud config                        | `infra/` |
| Is a one-off script                                       | `scripts/` |
| Is a CLI tool with its own package                        | `internal/` |

## Mandatory validation before creating a file

1. Read the root `README.md` and the *"Where should I put this?"* section.
2. Read the `README.md` of the target folder before coding there (as stated in
   the root `README.md`: *"Read the linked README.md inside each folder before
   you start coding there"*).
3. If no existing folder matches the component's purpose, **ask the developer**
   before creating a new top-level folder.

## Consequences of misplacement

- Code in the wrong folder breaks the monorepo's layer isolation.
- Future agents will have a harder time finding and reusing components.
- The automated orchestration (`docker-compose.yml`, `workflows/`) may not
  correctly wire misplaced components.

## References

- Root `README.md` — full folder guide and *"Where should I put this?"* section
- `uis/README.md` — user interfaces
- `services/README.md` — backend API (FastAPI) and workers
- `data/README.md` — datasets, pipelines, evaluation
- `agents/README.md` — AI agents
- `skills/README.md` — reusable agent capabilities
- `mcps/README.md` — MCP servers
- `workflows/README.md` — automation and orchestration
- `packages/README.md` — shared libraries
- `shared/README.md` — loose shared assets
- `docs/README.md` — cross-cutting documentation
- `infra/README.md` — infrastructure and deployment
- `scripts/README.md` — helper scripts
- `internal/README.md` — internal developer tools