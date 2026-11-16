---
name: carrier-performance-analysis
description: Use when you need to analyze TrackFlow's historical data for the 8 carriers (UPS, FedEx, DHL, MRW, SEUR, etc.) and compute structured performance KPIs.
---

# Carrier Performance Analysis

Based on `CONTEXT.md` — Last Mile and Carrier Management department (Carlos Vega, 6 logistics coordinators).

## Rules

1. Process shipment logs containing carrier, origin, destination, weight, promised delivery date, actual delivery date, and final status.
2. Classify each shipment as on-time (actual delivery ≤ promised date) or late.
3. Group by carrier and by route to compute aggregated indicators.
4. Compute the three base KPIs:
   - `on_time_delivery_rate` = (on-time deliveries / total deliveries) × 100
   - `incidents_per_route` = (incidents on route / total shipments on route) × 100
   - `cost_per_kg` = total carrier cost / total weight shipped
5. Return the result as structured JSON, ready for a performance dashboard.

## Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Shipment logs | Per-shipment record with carrier, origin, destination, weight, promised date, actual delivery date, final status | Carrier portals / unified tracking system |
| Incidents report | Lost parcels, failed deliveries, wrong addresses | Manual logs or carrier incident feeds |
| Cost data | Cost per shipment per carrier (€/kg or $/kg) | ERP or carrier invoices |

## Expected output

```json
{
  "carrier": "UPS",
  "period": { "from": "2026-01-01", "to": "2026-01-31" },
  "on_time_delivery_rate": 94.2,
  "incidents_per_route": [
    { "route": "LA-NY", "rate": 2.1 },
    { "route": "LA-CHI", "rate": 1.5 }
  ],
  "cost_per_kg": 3.45,
  "total_shipments": 1520
}
```

## Verification criteria

- [ ] Output contains `on_time_delivery_rate`, `incidents_per_route`, and `cost_per_kg` for each carrier.
- [ ] Results are aggregable by carrier, by route, and by period (week / month).
- [ ] The carrier name matches one of the 8 documented in `CONTEXT.md` (UPS, FedEx, DHL in US; MRW, SEUR, DHL in Spain; plus two local carriers).
- [ ] Output is formatted as structured data (JSON or CSV) ready for dashboard ingestion.