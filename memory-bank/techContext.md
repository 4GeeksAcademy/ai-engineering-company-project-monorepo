# Brasaland - Technical Context

## Repository architecture

The project is an existing monorepo. Hito 4 must extend the current repository rather than creating a separate repository.

Target Hito 4 structure:

```text
.agents/
├── rules/
└── skills/

memory-bank/
├── projectbrief.md
├── techContext.md
└── progress.md

uis/
├── website/
└── backoffice/

services/
```

`uis/backoffice` contains the Hito 3 Talent Pipeline Tracker and remains a separate application from the public website and backend services.

## Existing technology

### Hito 2

The TypeScript/Vite Data Lab is located at `uis/backoffice/data-lab/`.

Its package configuration is isolated within that directory:

```json
{
  "name": "brasaland-data-lab",
  "type": "module",
  "scripts": {
    "dev": "vite src --host 0.0.0.0 --port 5173",
    "build": "vite build src",
    "preview": "vite preview --host 0.0.0.0 --port 4173"
  },
  "devDependencies": {
    "vite": "^5.4.10"
  }
}
```

Hito 2 provides reusable TypeScript utilities for managing, transforming, validating and analysing Brasaland operational information.

### Hito 3

The Talent Pipeline Tracker is a Next.js application located at:

```text
uis/backoffice/
```

It uses TypeScript and includes its own application configuration, components, services and types.

The Hito 3 application has already been validated with:

- typecheck
- lint
- build
- development server startup
- candidate listing and filtering
- candidate detail views
- candidate editing
- candidate status and stage updates
- candidate notes

## Hito 4 technical requirements

Hito 4 requires:

- agent configuration in `.agents/`
- persistent context in `memory-bank/`
- root-level `AGENTS.md`
- public frontend under `uis/website`
- internal frontend under `uis/backoffice`
- backend services under `services`

The exact framework/template conventions for the new Hito 4 applications should be reviewed from the repository and applicable template documentation before implementation.

## Architectural constraints

- Do not create a second repository.
- Do not unnecessarily duplicate existing Hito 2 or Hito 3 functionality.
- Keep the Hito 3 Talent Pipeline Tracker under `uis/backoffice`.
- Keep the Hito 2 Data Lab under `uis/backoffice/data-lab` unless a documented requirement requires a change.
- The website and backoffice must be separate applications with their own appropriate structure.
- The backoffice must have its own layout and landing view.
- Company-relevant data or logic must be visible in the backoffice UI, not only logged to the console.
- New configuration should be isolated to the application or service that needs it whenever possible.

## Validation expectations

Before considering Hito 4 complete, verify at minimum:

- website development command starts without errors
- website `/` renders correctly
- website follows Brasaland's documented company context and visual identity
- backoffice development command starts without errors
- backoffice `/` renders correctly
- backoffice has a distinct internal layout
- backoffice displays relevant Brasaland information or logic
- existing Hito 2 and Hito 3 functionality remains intact
