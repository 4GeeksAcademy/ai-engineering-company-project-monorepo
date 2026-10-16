# Backend Architecture Proposal

## Context and Objective

TrackFlow operates logistics workflows across the United States and Spain, with high operational dependence on inventory visibility, carrier orchestration, reverse logistics, customer support, and executive reporting.

This document proposes a backend architecture before implementation starts, so the engineering team can align on:

- architectural pattern and technical reasoning
- domain-driven module and folder organization
- API endpoint and router grouping criteria
- implications of frontend/backend separation in this monorepo
- key risks if structure is not followed

The goal is to optimize for maintainability, integration flexibility, and predictable growth rather than short-term speed only.

## Evaluated Options

### 1. Layered Architecture

**Definition (for this project):**

- Presentation layer: API routes/controllers (FastAPI routers)
- Application layer: use-case orchestration and workflow services
- Domain layer: business rules and core entities
- Data access/infrastructure layer: repositories, persistence, external APIs, messaging, and provider SDKs

**Pros for TrackFlow**

- Clear separation of responsibilities for a multi-team environment.
- Easy to reason about when implementing operations workflows end to end.
- Good fit for the assignment requirement to explain folder/module criteria.
- Supports gradual growth from current milestone artifacts toward production services.

**Cons / risks**

- Can introduce boilerplate if applied too rigidly.
- Logic can still leak into controllers/services without discipline.
- Teams may create thin pass-through layers with little value.

### 2. MVC (Model-View-Controller)

**Pros for TrackFlow**

- Familiar pattern with quick startup for simple CRUD.
- Low initial cognitive overhead for smaller features.

**Cons / risks**

- Less natural for API-first backend serving multiple frontends.
- Tends to produce large controllers as business logic grows.
- Usually requires later refactoring into service/repository boundaries for complex domains.

### 3. Serverless-first

**Pros for TrackFlow**

- Useful elasticity for event bursts (webhooks, notifications, scheduled tasks).
- Lower infrastructure operations for small isolated functions.

**Cons / risks**

- Operational complexity shifts to observability, retries, idempotency, and tracing.
- Cold starts and latency variance can impact synchronous logistics workflows.
- High risk of fragmented business logic if adopted as the primary architecture too early.

### 4. Hexagonal Architecture (Ports and Adapters)

**Pros for TrackFlow**

- Strong isolation of core business logic from external providers.
- Excellent fit for multi-carrier and partner integration churn.
- Improves testability by mocking adapters at port boundaries.

**Cons / risks**

- Additional abstraction can slow delivery when applied universally from day one.
- Requires team discipline in dependency direction and interface ownership.

## Architecture Decision

TrackFlow should adopt **Layered Architecture as the backbone**, with **Hexagonal boundaries at integration-heavy seams**.

This is a hybrid, pragmatic decision:

- Layered provides structure clarity and straightforward implementation governance.
- Hexagonal principles are applied where external variability is expected (carriers, partner APIs, persistence technology, queues, notification providers).

### Why this fits TrackFlow specifically

- Carrier/provider landscape will evolve; adapter-based integration reduces ripple effects.
- Core workflows (inventory, shipment, returns, support) should remain stable even when vendors change.
- Two-country operations need predictable architecture for collaboration and incident handling.
- The current monorepo already separates product surfaces (`uis/website`, `uis/backoffice`) and has domain utilities in `src/`, making a layered service foundation a natural next step.

## Proposed Backend Organization (FastAPI-oriented)

No code is included by design; this section defines target structure and responsibility criteria.

```text
services/
  logistics-api/
    app/
      main.py
      api/
        routers/
          inventory.py
          shipments.py
          carriers.py
          returns.py
          support.py
          health.py
      application/
        inventory/
        shipments/
        carriers/
        returns/
        support/
      domain/
        inventory/
        shipments/
        carriers/
        returns/
        support/
      ports/
        repositories/
        providers/
        messaging/
      infrastructure/
        db/
        repositories/
        providers/
          carriers/
          notifications/
        messaging/
      schemas/
      core/
        config.py
        security.py
        observability.py
```

### Layer criteria

- `api/routers`: HTTP concerns only (request parsing, response mapping, status codes).
- `application`: orchestrates use cases and transactional workflows.
- `domain`: business invariants, policies, and core logic independent of transport/persistence.
- `ports`: interfaces consumed by application/domain for external dependencies.
- `infrastructure`: concrete implementations for database, carrier APIs, queue/event systems.
- `schemas`: API contracts (request/response models) and validation models.
- `core`: shared technical setup (configuration, auth, logging, telemetry hooks).

## Endpoint and Router Grouping Strategy

Routers should be grouped by **business domain/capability**, not by technical operation type.

### Proposed route groups

- `/inventory/*`: stock visibility, adjustments, cross-warehouse views
- `/shipments/*`: shipment creation, status lifecycle, tracking aggregation
- `/carriers/*`: carrier options, SLA/cost intelligence, assignment decisions
- `/returns/*`: return initiation, approval decisions, collection scheduling
- `/support/*`: customer support status queries and support tooling endpoints
- `/health/*`: service readiness/liveness and operational diagnostics

### Grouping criteria

- A route belongs to a domain if it represents that domain's primary business responsibility.
- Cross-domain workflows should be orchestrated in application services, not merged into one router file.
- Domain routers remain thin; orchestration complexity goes to `application`.

## FastAPI Structure Research and Its Influence

The proposed organization follows common FastAPI project conventions and recommended practices:

- Keep `APIRouter` modules split by feature/domain for readability and ownership.
- Keep Pydantic models/schemas explicit and close to API boundaries.
- Centralize app wiring and configuration in startup/core modules.
- Avoid monolithic `main.py` files by delegating behavior to internal packages.

Reference used:

- FastAPI official documentation (project structuring conventions, `APIRouter`, bigger applications guidance): https://fastapi.tiangolo.com/

How this influenced the proposal:

- Domain-based router separation is explicit.
- Startup/configuration concerns are isolated from business rules.
- API contracts are separated from domain logic.

## Frontend and Backend as Separate Systems

TrackFlow frontend surfaces (`uis/website`, `uis/backoffice`) and backend services should operate as separate systems inside one monorepo.

### Implications to design now

- API-first communication: frontends consume backend endpoints; no direct data-store access.
- Environment variable discipline: each app/service owns explicit runtime config (API base URL, auth, feature flags, secrets handling).
- CORS policy: strict allowed origins for website/backoffice environments and deployment stages.
- Contract stability: endpoint/versioning strategy to prevent frontend breaks during backend evolution.
- Failure handling: backend must return predictable error contracts to support UX resilience.

## Risks and Attention Points

If the proposed structure is not respected, the main risks are:

1. **Controller/route bloat**
- Business logic leaks into route handlers, reducing testability and readability.

2. **Integration ripple effects**
- Direct provider SDK usage in core logic causes widespread regressions when carriers or partners change.

3. **Domain fragmentation**
- Similar logic duplicated across routers/services leads to inconsistent business behavior.

4. **Operational blind spots**
- Missing observability conventions reduce reliability in multi-country operations.

5. **Frontend coupling to backend internals**
- Undisciplined contracts and CORS/env handling create deployment instability.

## Adoption Plan (Incremental)

1. Define domain boundaries and router ownership (`inventory`, `shipments`, `carriers`, `returns`, `support`).
2. Implement layered service skeleton for one domain (pilot: `shipments` + `carriers`).
3. Introduce ports/adapters only where variability is immediate (carrier providers, data persistence).
4. Add shared error and response conventions for frontend consumers.
5. Add telemetry and health endpoints before scaling endpoint surface.
6. Expand pattern domain by domain, validating architecture discipline each sprint.

## Final Recommendation

Adopt **Layered Architecture with Hexagonal integration boundaries** as TrackFlow's backend standard.

This approach balances short-term delivery needs with long-term scalability. It preserves stable core business workflows while allowing partner/carrier integrations to evolve with minimal ripple effects across the rest of the system.
