# TrackFlow Context

TrackFlow is a logistics technology company focused on last-mile delivery and warehouse operations across Mexico and Spain. The company operates a public website and an internal backoffice, both backed by a shared TypeScript business logic module.

## Business objective

Build a consistent operational platform to:

- Track inventory in real time.
- Optimize carrier selection per shipment.
- Surface low-stock and shipment-risk alerts early.
- Standardize decision rules so website and backoffice always use the same logic.

## Product scope

- `uis/website`: public-facing experience for product discovery and shipment visibility.
- `uis/backoffice`: internal operations for inventory, shipment decisions, and execution support.
- `packages/logic`: single source of truth for business rules (cost, scoring, filters, validations, reports).

## Core domain entities

TrackFlow data contracts are defined in `packages/logic/src/trackflow/contracts.ts` and include:

- `Product`: SKU-based inventory item with dimensions, stock, status, warehouse, and unit cost.
- `Carrier`: logistics provider with pricing, reliability, capacity, fragility support, and priority support.
- `Shipment`: operational order with origin, destination, priority, status, and declared value.

Related operational enums:

- Warehouse locations: `Los Angeles`, `Zaragoza`.
- Product statuses: `Active`, `Low stock`, `Out of stock`.
- Shipment priorities: `Standard`, `Express`, `Same-day`.
- Shipment statuses: `Pending`, `Assigned`, `In transit`, `Delivered`, `Failed`.

## Operational rules and constraints

1. Business logic must live in `packages/logic`.
2. UI layers must not duplicate calculations, scoring rules, or validation logic.
3. Data transformations must be immutable.
4. Carrier selection must consider capability and cost, not just one dimension.
5. Validation errors must be explicit and traceable.

## Key business KPIs

- Low-stock ratio by warehouse and category.
- Inventory value at risk (low stock + high value SKUs).
- On-time reliability by carrier.
- Average shipment distance and cost trend.
- Shipment status distribution and failure rate.

## Architecture direction

- Monorepo with npm workspaces.
- Next.js + TypeScript on UI apps.
- Shared package import (`@trackflow/logic`) from source location.
- No copy-paste of core logic between apps.

## AI engineering alignment

All AI-assisted development must read this context and the memory bank first, then follow:

- `memory-bank/projectbrief.md`
- `memory-bank/techContext.md`
- `memory-bank/progress.md`
- `AGENTS.md`

This context is the domain source of truth for milestone decisions and future increments.
