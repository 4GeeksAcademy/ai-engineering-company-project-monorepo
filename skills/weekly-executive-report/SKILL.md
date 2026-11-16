---
name: weekly-executive-report
description: Use when you need to generate the consolidated weekly report for TrackFlow with operational KPIs from both countries (US and Spain), ready by Monday 7am.
---

# Weekly Executive Report

Based on `CONTEXT.md` — Executive Direction department (CEO Daniel Espinoza). Currently directors spend 3–4 hours each Sunday evening compiling this manually.

## Rules

1. Gather the following metrics for the last 7 days (Monday to Sunday):
   - Shipment volume (total and per country)
   - On-time delivery rate
   - Total logistics costs and per carrier
   - Returns volume and returns rate
   - Average CSAT score
2. Compute weekly aggregates per country and total:
   - Shipment volume (weekly total and % change vs previous week)
   - On-time delivery rate (overall and per carrier)
   - Total logistics cost and cost per shipment
   - Returns volume and returns rate (returns / shipments × 100)
   - Average CSAT score
3. Compare each metric against the previous week and flag **threshold alerts** for those that deviate beyond a configured threshold.
4. Assemble the report in a structured format (PDF or JSON) with:
   - Executive summary
   - US KPIs
   - Spain KPIs
   - Country comparison table
   - Alerts section

## Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Shipment volume | Total shipments per country (US / Spain) per day | Unified tracking system / carriers |
| On-time delivery rate | Percentage of deliveries completed on or before the promised date | Carrier performance analysis skill |
| Cost data | Total logistics cost per country and per carrier | ERP / carrier invoices |
| Returns volume | Number of returned products and total value per country | Reverse logistics system |
| CSAT score | Customer satisfaction score from CX surveys | CX system / ticketing |

## Expected output

```json
{
  "report_week": "2026-W42",
  "generated_at": "2026-10-17T07:00:00Z",
  "summary": {
    "total_shipments": 8450,
    "global_ontime_rate": 93.5,
    "total_cost": 285000,
    "returns_rate": 21.3,
    "csat_avg": 4.2
  },
  "countries": {
    "us": { "shipments": 5100, "ontime_rate": 94.1, "cost": 175000, "returns_rate": 19.8, "csat": 4.3 },
    "spain": { "shipments": 3350, "ontime_rate": 92.7, "cost": 110000, "returns_rate": 23.5, "csat": 4.0 }
  },
  "alerts": [
    { "metric": "returns_rate_spain", "value": 23.5, "threshold": 22.0, "severity": "warning" }
  ]
}
```

## Verification criteria

- [ ] Report includes KPIs from both countries (US and Spain) plus a global summary.
- [ ] Each KPI includes a week-over-week comparison (current vs previous week).
- [ ] Threshold alerts are generated when a metric exceeds a configurable threshold.
- [ ] Report is produced in a structured format (PDF or JSON) ready for the executive dashboard.
- [ ] El timestamp de generación es anterior al lunes 07:00 (el objetivo marcado en `CONTEXT.md`).