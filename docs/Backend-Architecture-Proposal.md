 # Nexova Backend Architecture Proposal

 **Status:** Proposed

 **Scope:** Initial backend for Nexova's internal People and Talent operations, with room to evolve into a broader talent selection platform.

 ## 1. Executive Summary

 Nexova needs to replace spreadsheet-driven candidate management with a reliable backend that can support candidate records, hiring stages, internal notes, vacancies, and selection workflows. The recommended solution is a **modular monolith built with FastAPI and organized using layered architecture**.

 The first release should be one deployable API with clear boundaries between HTTP delivery, application use cases, domain rules, persistence, and cross-cutting concerns. This keeps the initial system understandable for Nexova's six-person Technology team while avoiding the coupling that would make later scoring, semantic search, integrations, or candidate-facing features difficult to add.

 This proposal describes the intended architecture only. It does not create a FastAPI service or select a final database or identity provider.

 ## 2. Business Context and Architectural Drivers

 Nexova is a human resources consulting and talent acquisition company operating in Spain and the United States. Talent Selection Operations is its core business: 40 consultants manage recruitment processes for clients, while candidate communication, screening, interviews, and status updates are currently heavily manual. The current People and Talent tracker already demonstrates the first operational slice: staff need to list, filter, inspect, update, and annotate candidates.

 The backend must therefore prioritize:

 - Clear candidate lifecycle operations for internal consultants.
 - Consistent validation for personal and application data.
 - Traceability for status, stage, and note changes.
 - A stable API contract that can be consumed by separate Next.js interfaces.
 - A path toward vacancies, selection processes, deterministic scoring, and AI-assisted search.
 - Appropriate protection for sensitive candidate and internal note data.

 The existing frontend calls an externally hosted Talent Tracker API through [`PROJECT_API_URL`](../uis/talent-pipeline-tracker/lib/api/client.ts). Its current contract includes candidate records and nested notes. The repository does not yet contain the backend implementation, so this proposal treats the frontend contract as integration evidence rather than as an existing server design.

 ## 3. Recommended Architectural Pattern

 ### Modular layered Architecture

 The initial backend should use one FastAPI application with the following logical layers:

 1. **API/transport layer:** FastAPI routers, request parsing, response models, authentication dependencies, and HTTP error translation.
 2. **Application layer:** use cases such as registering a candidate, changing a stage, adding a note, or ranking candidates for a vacancy.
 3. **Domain layer:** candidate, vacancy, selection-process, and note concepts plus business rules and state transitions.
 4. **Persistence layer:** repository interfaces, database implementations, transactions, and migrations.
 5. **Infrastructure and cross-cutting layer:** settings, logging, security, CORS, database sessions, and external integrations.

 This is a modular monolith rather than a collection of microservices. The modules are separated in code and by responsibility, but they initially share one deployment and one controlled persistence boundary.

 ### Why this fits Nexova

 Nexova's first backend needs are workflow-heavy CRUD operations with validation and authorization, not independently scalable services. A layered modular monolith gives consultants a consistent API quickly and gives the Technology team a single place to operate, test, and observe. It also prevents business rules from being duplicated across the tracker, future candidate portal, and automation jobs.

 The pattern supports future growth. Candidate scoring can become an application service that uses domain rules, while a later search or AI integration can be added behind an explicit interface. If one domain eventually has independent scaling or ownership needs, its boundary is already visible before extracting a service.

 A single large `main.py` would be fast to start but would mix routing, validation, persistence, and business decisions. MVC terminology alone would not provide enough guidance for separating domain rules from data access. Serverless functions could be useful for isolated background jobs, but they would add deployment and observability complexity before Nexova has a stable central contract.

 ## 4. Proposed Backend Structure

 The backend should live as a separately deployable service in the repository's backend area, while remaining in the monorepo with the UIs. A representative structure is:

 ```text
 services/talent-api/
 ├── pyproject.toml
 ├── migrations/
 ├── tests/
 │   ├── api/
 │   ├── application/
 │   └── domain/
 └── app/
	 ├── __init__.py
	 ├── main.py
	 ├── api/
	 │   ├── dependencies.py
	 │   ├── errors.py
	 │   ├── routers/
	 │   │   ├── candidates.py
	 │   │   ├── notes.py
	 │   │   ├── vacancies.py
	 │   │   ├── selection_processes.py
	 │   │   └── health.py
	 │   └── schemas/
	 │       ├── candidates.py
	 │       ├── notes.py
	 │       ├── vacancies.py
	 │       └── selection_processes.py
	 ├── application/
	 │   ├── candidates.py
	 │   ├── notes.py
	 │   ├── vacancies.py
	 │   └── matching.py
	 ├── domain/
	 │   ├── candidates/
	 │   ├── notes/
	 │   ├── vacancies/
	 │   └── selection_processes/
	 ├── repositories/
	 │   ├── candidates.py
	 │   ├── notes.py
	 │   └── vacancies.py
	 ├── db/
	 │   ├── session.py
	 │   └── models/
	 └── core/
		 ├── config.py
		 ├── logging.py
		 └── security.py
 ```

 The structure follows a domain-first rule inside each responsibility: candidate behavior belongs with candidate concepts, while HTTP concerns remain in routers and schemas. A route handler should validate the request, call an application use case, and serialize the result. It should not contain SQL, scoring algorithms, or decisions about whether a stage transition is valid.

 The `schemas` package contains API contracts such as `RecordCreate`, `RecordOut`, `RecordPatch`, and `NoteCreate`. Domain entities and database models should remain separate from those schemas so that a database migration does not automatically become a breaking API change.

 ## 5. FastAPI Routers and Endpoint Organization

 The public API should be versioned under `/api/v1`. `app/main.py` should create the FastAPI application, configure middleware, and include routers. Each router should own one domain or closely related subresource and should define a prefix, tags, shared dependencies, response models, and documented error responses.

 ### Candidate records

 The initial candidate router should expose the contract already consumed by the tracker:

 - `GET /api/v1/records`: paginated records with `status`, `stage`, and `search` filters.
 - `POST /api/v1/records`: register a candidate after validating required contact and application fields.
 - `GET /api/v1/records/{record_id}`: retrieve one candidate.
 - `PUT /api/v1/records/{record_id}`: replace editable candidate data.
 - `PATCH /api/v1/records/{record_id}`: apply a partial update such as a status or stage transition.

 ### Candidate notes

 Notes should remain a separate router because they have their own lifecycle and authorization rules:

 - `GET /api/v1/records/{record_id}/notes`
 - `POST /api/v1/records/{record_id}/notes`
 - `DELETE /api/v1/records/{record_id}/notes/{note_id}`

 ### Future domains

 Future routers should be added deliberately rather than expanding the candidate router indefinitely:

 - `vacancies.py` for client roles and vacancy lifecycle.
 - `selection_processes.py` for candidate-vacancy relationships, stages, scores, and process history.
 - `matching.py` or a dedicated search router for explainable ranking and later semantic search.
 - `auth.py` or shared security dependencies for internal users and roles.
 - `health.py` for liveness and readiness checks.

 This organization follows FastAPI's official [Bigger Applications - Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/) guidance. FastAPI documents a package containing `main.py`, shared dependencies, and separate router modules. `APIRouter` allows related path operations to share prefixes, tags, dependencies, and responses, while `app.include_router()` assembles them into the application and its generated OpenAPI documentation.

 Request and response validation should use typed Pydantic models. Query parameters should define pagination limits and filter values explicitly. Common errors should have a stable JSON shape containing an error code, human-readable message, and optional field details so the Next.js clients can render useful feedback instead of reducing every failure to a generic exception.

 ## 6. Data and Persistence Decisions

 A relational database is the recommended initial persistence model because candidates, notes, vacancies, selection processes, users, and audit events have clear relationships and transactional updates. Candidates and notes should be separate records with a foreign-key relationship rather than an unbounded notes array. Status and stage changes should be validated as domain operations and should be eligible for an audit trail.

 The repository currently contains two different domain contracts:

 - The tracker-facing [`CandidateRecord`](../uis/talent-pipeline-tracker/types/candidate.ts) uses fields such as `experience_years`, `in_progress`, and `offer_presented`.
 - The selection utilities model [`Candidate`, `Vacancy`, and `SelectionProcess`](../scripts/src/models/models.ts) with skills, salary, availability, seniority, and scoring concepts.

 These models should not be merged by convention. The first API can preserve the tracker contract, while a future domain design can define how candidate profiles, vacancies, and selection processes relate. A canonical contract should be agreed before scoring or migration work begins.

 Database vendor, migration tool, retention policy, and backup strategy are next-sprint decisions. They should be documented before implementation and kept behind repository interfaces so the application layer is not coupled directly to a database library.

 ## 7. Frontend and Backend Separation

 The Next.js tracker and FastAPI service should be separate applications with independent build and deployment lifecycles inside this monorepo. The UI should receive its API base URL from environment-specific configuration, consistent with the current [`PROJECT_API_URL`](../uis/talent-pipeline-tracker/README.md) setup. Secrets must remain server-side and must not be committed to the repository or exposed through public frontend variables.

 During local development, the browser may load the tracker from one origin and call the API from another. The backend must configure FastAPI's `CORSMiddleware` with explicit development, staging, and production origins, allowed methods, and allowed headers. The official [FastAPI CORS guidance](https://fastapi.tiangolo.com/tutorial/cors/) explains that protocol, host, and port together define an origin, and that preflight requests must be authorized for cross-origin methods such as `PUT`, `PATCH`, and `DELETE`. The browser-level behavior is described in [MDN's CORS documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

 Wildcard origins should not be used for authenticated production traffic. If the service later uses cookies or bearer credentials, the allowlist and credential settings must be explicit and compatible. The API should also return the required CORS headers on error responses so a frontend can distinguish a backend failure from a browser policy failure.

 For production, the team should evaluate a server-side proxy or backend-for-frontend. Direct browser calls are simple and match the current tracker, but a proxy can keep tokens, internal service addresses, and integration details out of the browser. This is an architectural option, not a current implementation decision.

 ## 8. Security and Operations

 Candidate records and internal notes contain personal and operational information. The backend should require authentication for People and Talent users and authorize actions by role or team. At minimum, read access, candidate editing, stage changes, note deletion, and administrative operations should be distinguishable. A future candidate portal must never expose internal notes or other candidates' data.

 The first operational baseline should include structured logs, request IDs, health and readiness endpoints, validation error logging without personal-data leakage, and audit events for status, stage, and note changes. Metrics and distributed tracing can be introduced with the rest of Nexova's telemetry work. These concerns belong in shared dependencies and middleware rather than being reimplemented in each router.

 ## 9. Risks and Points of Attention

 | Risk | Consequence | Mitigation |
 | --- | --- | --- |
 | The tracker contract and the richer selection models drift apart. | Statuses, field names, or scoring behavior become inconsistent across products. | Define explicit API, domain, and persistence schemas; agree on a canonical model before adding vacancies or scoring. |
 | Direct browser access is deployed without authentication or a narrow CORS allowlist. | Internal candidate data may be exposed, or legitimate requests may fail unpredictably. | Add authentication and role checks; configure explicit environment-specific origins; evaluate a server-side proxy. |
 | Business rules are implemented inside router functions. | The same lifecycle or scoring rule is duplicated and becomes difficult to test. | Keep routers thin and move use cases and domain rules into application and domain modules. |
 | Persistence and migrations are treated as implementation details. | Data relationships, notes, and history become difficult to change safely. | Define relational ownership, transactions, migrations, backups, and retention before production rollout. |
 | The external API or a future integration is assumed to be always available. | The tracker fails silently or leaves consultants without reliable feedback. | Define timeouts, stable error contracts, health checks, logging, and retry behavior only where operations are safe to repeat. |

 ## 10. Evolution Path

 The recommended delivery sequence is:

 1. Candidate and note CRUD with validation, authentication, persistence, and audit events.
 2. Vacancy and selection-process domains with explicit candidate-vacancy relationships.
 3. Deterministic scoring and explainable ranking using the existing selection utilities as reference material.
 4. Integrations for candidate communication, client visibility, and reporting.
 5. Semantic search, AI-assisted matching, and a separate candidate-facing portal with stricter data isolation.

 Each phase should preserve the API versioning and module boundaries established in the first release. New capabilities should be added behind application services and domain contracts rather than directly coupled to the UI.

 ## 11. Initial Decisions to Confirm

 Before implementation begins, the team should confirm the database vendor and migration tool, identity provider, role model, production deployment topology, canonical candidate contract, data retention rules, and whether the first production UI will call the API directly or through a server-side proxy. These are deliberate follow-up decisions because the repository currently contains the frontend consumer but no backend service implementation.

 ## Sources and Repository Evidence

 - [FastAPI: Bigger Applications - Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
 - [FastAPI: CORS](https://fastapi.tiangolo.com/tutorial/cors/)
 - [MDN: Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
 - [Nexova company context](../CONTEXT.md)
 - [Tracker API client](../uis/talent-pipeline-tracker/lib/api/client.ts)
 - [Candidate API operations](../uis/talent-pipeline-tracker/lib/api/candidates.ts)
 - [Notes API operations](../uis/talent-pipeline-tracker/lib/api/notes.ts)
 - [Tracker candidate types](../uis/talent-pipeline-tracker/types/candidate.ts)
 - [Nexova selection domain models](../scripts/src/models/models.ts)
 - [Talent Pipeline Tracker README](../uis/talent-pipeline-tracker/README.md)
