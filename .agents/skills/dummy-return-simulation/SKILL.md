# TrackFlow Dummy Return Simulation Skill

## Purpose

Simulate how TrackFlow would process a dummy return request from intake through approval review, warehouse receiving, inspection, and final disposition, then write the result to a hidden text file at the root of the repository.

## When to use this skill

Use this skill when the user or developer wants to:

- create a realistic return scenario for TrackFlow
- explain how reverse logistics should work before production services exist
- test whether a UI, workflow, or agent output matches the reverse-logistics process in `CONTEXT.md`
- produce a simple approval and inspection narrative for demos or planning

Do not use this skill for:

- real return authorization
- real carrier collection scheduling
- live refund or disposal decisions
- actual image-based inspection results

## Required inputs

Collect or infer these inputs before generating the simulation:

- return request ID
- original order ID
- client or brand name
- return country
- return city or region
- item or items being returned
- return reason
- package condition at pickup assumption: `sealed`, `opened`, or `damaged`

Optional but useful inputs:

- customer type: `B2B` or `B2C`
- days since delivery
- client policy assumption
- preferred return warehouse
- high-value or fragile item flag

If the user omits values, the agent may choose sensible dummy values, but it must label them as assumptions.

## TrackFlow reverse-logistics simulation rules

The simulation must stay grounded in `CONTEXT.md` and current repo memory.

### 1. Intake

- Treat the return as entering TrackFlow through a support or client request.
- State whether the request was assumed to come from a brand client, end customer, or support agent.
- Note that the current business context says returns are manually reviewed one by one and that this simulation represents the intended improved flow.

### 2. Return warehouse assignment

- Use Los Angeles for United States returns by default.
- Use Zaragoza for Spain returns by default.
- If the user forces a different destination, state the exception clearly.

### 3. Approval logic

The skill must choose one of these outcomes and explain why:

- `approved automatically`
- `approved with manual review note`
- `escalated for manual review`
- `rejected in simulation`

Suggested heuristics:

- approve automatically for low-risk reasons like wrong size or standard customer remorse when the item is assumed unopened and within a short return window
- add manual review when the item is opened, high value, or near the edge of the assumed policy window
- escalate when the package is damaged, the reason conflicts with condition, or policy assumptions are unclear
- reject only when the scenario clearly falls outside the assumed policy and say it is still a simulation outcome, not a real business decision

### 4. Operational flow

List the reverse-logistics flow in this order:

1. return request received
2. request validated
3. approval decision produced
4. collection or drop-off path assigned
5. label generated
6. parcel received at warehouse
7. inspection performed
8. disposition decided
9. client and CX status updated

### 5. Inspection and disposition

Choose one disposition and explain it:

- `restock`
- `recondition`
- `dispose`
- `hold for manual review`

Base the result on the assumed condition and return reason.

### 6. Carrier and timing notes

- If a collection is needed, choose a plausible domestic carrier based on country.
- United States: `UPS`, `FedEx`, or `DHL`
- Spain: `MRW`, `SEUR`, or `DHL`
- Use assumption-based timing such as `1 to 2 business days for collection` and `1 business day for warehouse inspection`.

### 7. CX note

- Include a brief CX-facing message explaining what the customer or client would be told next.

## Output file requirement

Write the result to this file at the repository root:

- `.trackflow-dummy-return.txt`

Overwrite the file unless the user explicitly asks to preserve previous simulations.

## Required output format

The file must contain these sections in plain text:

1. `TRACKFLOW DUMMY RETURN`
2. `Input Summary`
3. `Assumptions`
4. `Approval Decision`
5. `Warehouse Assignment`
6. `Operational Steps`
7. `Inspection and Disposition`
8. `Tracking and CX Notes`
9. `Risks or Exceptions`

## How to invoke

Ask the agent to use `.agents/skills/dummy-return-simulation/SKILL.md` and provide the return details you want simulated. If you provide only partial details, the agent should fill the rest with explicit assumptions.

## Acceptance criteria

- The skill uses TrackFlow reverse-logistics context rather than a generic returns flow.
- The skill produces an approval outcome with a stated rationale.
- The skill assigns a warehouse and a plausible collection carrier when needed.
- The skill provides inspection and disposition steps.
- The skill writes the final simulation to `.trackflow-dummy-return.txt` at the repo root.