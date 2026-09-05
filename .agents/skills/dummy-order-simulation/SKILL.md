# TrackFlow Dummy Order Simulation Skill

## Purpose

Simulate how TrackFlow would process a dummy customer order from intake through warehouse handling, carrier choice, dispatch, and expected delivery, then write the result to a hidden text file at the root of the repository.

## When to use this skill

Use this skill when the user or developer wants to:

- create a realistic example order for TrackFlow
- explain how a TrackFlow order would move through operations
- test whether a planned UI, workflow, or agent output matches the business flow in `CONTEXT.md`
- generate a simple operations narrative before backend services or real integrations exist

Do not use this skill for:

- real carrier booking
- real inventory reservation
- production ETA promises
- return authorization decisions based on live systems

## Required inputs

Collect or infer these inputs before generating the simulation:

- order ID
- client or brand name
- destination country
- destination city or region
- urgency level: `standard` or `express`
- total shipment weight in kg
- ordered items with SKU, quantity, and item description

Optional but useful inputs:

- preferred warehouse if the user wants to force a scenario
- fragility or special handling notes
- customer type: `B2B` or `B2C`
- requested ship date

If the user omits values, the agent may choose sensible dummy values, but it must label them as assumptions.

## TrackFlow simulation rules

The simulation must stay grounded in `CONTEXT.md` and current repo memory.

### 1. Intake

- Treat the order as arriving through a TrackFlow client intake channel.
- State whether the order was assumed to arrive by email, manual entry, or a future automated pipeline.
- Note that order ingestion is currently manual in the business context and that the simulation represents the intended improved flow.

### 2. Warehouse assignment

- Use Los Angeles for United States destinations by default.
- Use Zaragoza for Spain destinations by default.
- If the user forces a cross-border or split-stock scenario, say so explicitly as an exception.
- If stock availability is unknown, state that warehouse assignment assumes stock is available at the selected site.

### 3. Fulfillment steps

List the operational flow in this order:

1. order received
2. order validated
3. warehouse assigned
4. picking scheduled
5. items picked
6. packing completed
7. carrier selected
8. label created
9. shipment dispatched
10. tracking shared
11. expected delivery window calculated

### 4. Carrier selection

Choose a carrier using TrackFlow's geography from `CONTEXT.md`:

- United States: `UPS`, `FedEx`, or `DHL`
- Spain: `MRW`, `SEUR`, or `DHL`
- local carrier option: only when the user explicitly wants a same-city or special local-delivery scenario

Selection heuristics:

- prefer `FedEx` or `SEUR` for faster express-style delivery assumptions
- prefer `UPS` or `MRW` for standard domestic ground assumptions
- use `DHL` for cross-border or fallback scenarios
- if the weight is high or the urgency conflicts with the route, explain the tradeoff used in the choice

The skill must always include a one-line rationale for the carrier choice.

### 5. ETA estimation

Use assumption-based delivery windows, not exact promises:

- same-country `standard`: 2 to 4 business days
- same-country `express`: 1 to 2 business days
- cross-border within TrackFlow's two-country footprint: 3 to 5 business days
- same-city local scenario: same day or next business day, if explicitly requested

If a holiday, weekend, customs, stock transfer, or manual review assumption affects the ETA, mention it clearly.

### 6. Tracking and CX notes

- Include a dummy tracking reference.
- State that the status would be visible through a future unified tracking endpoint or CX workflow.
- If useful, mention what a customer support agent would tell the client or end customer at this stage.

## Output file requirement

Write the result to this file at the repository root:

- `.trackflow-dummy-order.txt`

Overwrite the file unless the user explicitly asks to preserve previous simulations.

## How to invoke

Ask the agent to use `.agents/skills/dummy-order-simulation/SKILL.md` and provide the order details you want simulated. If you provide only partial details, the agent should fill the rest with explicit assumptions.

## Required output format

The file must contain these sections in plain text:

1. `TRACKFLOW DUMMY ORDER`
2. `Input Summary`
3. `Assumptions`
4. `Warehouse Assignment`
5. `Carrier Decision`
6. `Operational Steps`
7. `Tracking and Delivery`
8. `Risks or Exceptions`

## Example structure

```text
TRACKFLOW DUMMY ORDER

Input Summary
- Order ID: TF-ORDER-001
- Client: Demo Brand
- Destination: Madrid, Spain
- Urgency: Express
- Total Weight: 4.2 kg
- Items:
  - SKU TF-1001 | 2 units | Running shoes

Assumptions
- Order arrived through a future automated intake flow.
- Stock is available in Zaragoza.

Warehouse Assignment
- Assigned warehouse: Zaragoza
- Reason: Spain destination with assumed local stock availability.

Carrier Decision
- Selected carrier: SEUR
- Reason: Express domestic delivery in Spain with moderate parcel weight.

Operational Steps
1. Order received from client intake.
2. Order validated for destination and item completeness.
3. Zaragoza warehouse assigned.
4. Picking scheduled for next warehouse wave.
5. Items picked and quality-checked.
6. Parcel packed and labeled.
7. SEUR selected for final-mile delivery.
8. Shipment dispatched.
9. Tracking shared with CX and client.
10. ETA calculated at 1 to 2 business days.

Tracking and Delivery
- Dummy tracking ID: TF-SEUR-0001
- Expected delivery window: 1 to 2 business days
- CX note: Customer can be told the parcel has left Zaragoza and is in express domestic transit.

Risks or Exceptions
- ETA depends on stock actually being available in Zaragoza.
- No live carrier API or inventory confirmation was used.
```

## Acceptance criteria

- The skill uses TrackFlow business context rather than generic ecommerce logic.
- The skill selects a warehouse and carrier with a stated rationale.
- The skill provides an assumption-based expected delivery window.
- The skill writes the final simulation to `.trackflow-dummy-order.txt` at the repo root.
- The output is understandable by a developer, operator, or reviewer without extra explanation.