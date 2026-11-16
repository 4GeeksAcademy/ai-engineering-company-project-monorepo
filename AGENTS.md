# AGENTS.md — Mandatory rules for coding agents

> This file defines the rules that any coding agent (AI or human) must automatically
> follow when opening this repository. Based on `README.md`, `CONTEXT.md`,
> `memory-bank/`, and the monorepo structure.

---

> **🌐 Language rule:** All new code, documentation, comments, commit messages, and
> any other content generated in this repository must be written in **English**,
> unless the developer explicitly states otherwise.

---

## 1. Files you must read at the start of each session

When opening the repository for the first time in a session, **mandatorily** read
the following files in this order to establish full context:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `CONTEXT.md` | Single source of truth for the company domain (README.md: *"Single source of truth for your company"*) |
| 2 | `README.md` | Monorepo structure guide, purpose of each folder, and organization rules |
| 3 | `memory-bank/projectbrief.md` | Mission, vision, business model, and problems the company solves |
| 4 | `memory-bank/techContext.md` | Technology stack, architectural decisions, and constraints |
| 5 | `memory-bank/progress.md` | Current development status, next steps checklist, and pending problems |

---

## 2. Mandatory flow before each commit

Before creating any commit, execute these **5 steps in order**:

### Step 1 — Validate target folder
Read the root `README.md` and the *"Where should I put this?"* section
to confirm that the changes are being made in the correct folder.

**Expected application routes (future code):**
- Frontend public website → `uis/website/`
- Frontend internal admin → `uis/backoffice/`
- Backend APIs and workers → `services/`

If a new file is not in its corresponding folder, do not continue
until it is relocated.

### Step 2 — Verify language compliance
Check that all new or modified files in the change set are written in **English**.
Review code identifiers, comments, documentation, and any user-facing text.
If any content is in a language other than English (unless explicitly requested
by the developer), stop and request confirmation.

### Step 3 — Verify coherence with `CONTEXT.md`
Review that any term, field name, constraint, or decision mentioned in the new
code is coherent with `CONTEXT.md`. `CONTEXT.md` is the single source of truth
for the domain. If you introduce a concept that is not in `CONTEXT.md`, stop
and ask for confirmation.

### Step 4 — Document what was added
According to `README.md`: *"Document what you add: each new app, service, agent,
or pipeline gets a subfolder + README."* Verify that every new element has its
own subfolder with a `README.md` describing its purpose. If documentation is
missing, do not continue.

### Step 5 — Update `memory-bank/progress.md`
If the change completes or advances any of the items marked with `[ ]`
in the *"Next Steps"* section of `progress.md`, update the status of that
item to `[x]` and add a note about what was implemented.

---

## 3. Protected files and folders

The following files and folders **must not be modified without explicit
confirmation from the developer**:

| Path | Reason |
|------|--------|
| `CONTEXT.md` | It is the single source of truth for the domain. Any change here alters the context of the entire project. |
| `memory-bank/` | Contains the verified project record (audit trail). Any modification must be validated against repository evidence. |
| `AGENTS.md` | This very file. Must not be modified without developer approval. |
| `README.md` / `README.es.md` | Official monorepo structure guide. Changes here affect all future agents. |
| `docker-compose.yml` (when it exists) | Local orchestration of the entire infrastructure. Uncoordinated changes can break the development environment. |

**General rule:** Any file in the repository root that is not application code
(`.md`, `.yml`, `.json` configuration files) requires confirmation before being
modified, unless the developer explicitly requests it.

---

*This file will be updated as the repository evolves, always with developer approval.*