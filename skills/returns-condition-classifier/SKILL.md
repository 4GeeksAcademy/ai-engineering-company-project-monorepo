---
name: returns-condition-classifier
description: Use when you need to classify the condition of a returned product at TrackFlow from a photograph taken by the warehouse operative.
---

# Returns Condition Classifier

Based on `CONTEXT.md` — Reverse Logistics department (Sofía Ramos, 5-person team). Returns represent 18–25% of total volume.

## Rules

1. Receive a photograph of the returned product, its SKU, and the client ID associated with the return.
2. Classify the product condition using the photograph into one of four categories:
   - `recondition` — product can be repaired, cleaned, or refurbished for resale.
   - `dispose` — product has irreparable damage and must be discarded.
   - `restock` — product is in sellable condition and can go directly back to inventory.
   - `quarantine` — condition is uncertain and requires human review.
3. If per-client configurable rules exist, apply them (e.g., certain clients may require automatic quarantine for specific product categories).
4. Return the result with the assigned category and a confidence level.

## Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Product photograph | Image taken by the operative at the inspection station | Operative's device / warehouse app |
| Product SKU | SKU of the returned product | WMS or order record |
| Client ID | Client associated with the return (for per-client configurable rules) | Order / return record |

## Expected output

```json
{
  "sku": "TF-SH-001",
  "client_id": "clt-acme",
  "predicted_condition": "recondition",
  "confidence": 0.87,
  "alternative_conditions": [
    { "condition": "restock", "confidence": 0.10 },
    { "condition": "dispose", "confidence": 0.03 }
  ],
  "timestamp": "2026-10-17T14:30:00Z"
}
```

## Verification criteria

- [ ] The classifier returns exactly one of the four defined categories: `recondition`, `dispose`, `restock`, `quarantine`.
- [ ] The output includes a confidence score between 0 and 1 for the predicted category.
- [ ] Per-client rules (configurable) can override or augment the base classification.
- [ ] The same photo of the same product under the same conditions produces the same classification (consistency).