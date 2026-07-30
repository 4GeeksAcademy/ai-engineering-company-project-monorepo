# Brasaland — Company Context

Grilled-food restaurant chain operating in **Colombia** and **Florida (US)**.

## Knowledge base source documents

Index every file below from `docs/company-knowledge-base/`:

| File | Type | Topics |
|------|------|--------|
| `brasaland-supplier-ordering.en.md` | Procedure | Weekly orders, delivery lead times, minimum protein stock, emergency orders |
| `brasaland-waste-protocol.en.md` | Policy | Waste categories, daily logging, escalation thresholds, operational targets |
| `brasaland-loyalty-program.en.md` | Program | Brasa Points tiers, redemption rules, FAQ |
| `brasaland-menu-allergens.en.md` | Catalog / safety | Dish allergens, customer allergy protocol, gluten-free limitations |

## RAG constraints

- **Collection name:** `brasaland_kb`
- **Company slug in payloads:** `brasaland`
- **Currency:** Keep USD $ and COP $ exactly as written — never convert.
- **Allergens:** Never claim "zero risk" or "100% safe"; follow source wording.
- **Unknown answers:** Respond with *"There is not enough information available."*
- **Audience:** Commercial and operations teams (salesperson perspective).

## Key people

- **Mariana** — CEO
- **Felipe Guerrero** — Operations Director (waste escalation)
- **Lucía Fernández** — Procurement Manager (emergency order approval > 500 USD)
