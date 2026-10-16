# CONTEXT — Supplier Directory · TrackFlow

_Estas instrucciones también están disponibles en [español](./CONTEXT-trackflow.es.md)._

> **Milestone:** 09 — Lightweight Storage API  
> **Repository path:** `09-lightweight-storage/CONTEXT-trackflow.md`

---

## Your company

You are part of the **TrackFlow Tech** team, the internal technology unit of TrackFlow, a last-mile logistics and warehouse management company with operations in **Los Angeles (USA) and Zaragoza (Spain)**. Your tech lead is **Andrés Kim**, CTO, and the project was requested by **Carlos Vega**, Head of Carrier Operations, with the backing of **Ana Whitfield**, Head of Warehouse Operations.

TrackFlow works with a network of suppliers that includes carriers, warehouse supplies, packaging, and operational software. Each country negotiates with its own suppliers and manages contracts independently. The result is that neither Carlos nor Ana has visibility into the full directory — each maintains their own spreadsheet. This project creates the centralized registry that unifies both markets.

---

## Supplier model

Each supplier in the TrackFlow directory has the following structure:

| Field               | Type                                 | Description                                                        |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `name`              | string, required                     | Supplier trade name                                                |
| `country`           | string, required                     | Contract country: `"USA"` or `"Spain"`                             |
| `categories`        | list of strings, required, minimum 1 | Type of service or product supplied (see valid list)               |
| `rate_per_shipment` | float, required, > 0                 | Current rate per shipment or service unit in the contract currency |
| `currency`          | string, required                     | `"USD"` for USA, `"EUR"` for Spain                                 |
| `updated_at`        | datetime, system-generated           | Timestamp of the last rate update                                  |
| `status`            | string, required                     | `"active"` or `"suspended"`                                        |
| `service_zone`      | string, optional                     | Supplier coverage zone (e.g. `"West Coast"`, `"Aragón"`)           |
| `contact_email`     | string, optional                     | Supplier contact email                                             |
| `notes`             | string, optional                     | Operations team notes                                              |

### Valid categories

```python
VALID_CATEGORIES = [
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities"
]
```

### Valid statuses

```python
VALID_STATUSES = ["active", "suspended"]
```

---

## Seeder initial data

The seeder must load exactly the following suppliers, representing Carlos and Ana's combined current directory.

```python
SUPPLIERS_SEED = [
    {
        "name": "UPS Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Primary carrier for local deliveries in Los Angeles and surrounding areas."
    },
    {
        "name": "FedEx Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com"
    },
    {
        "name": "DHL Express USA",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Used for urgent shipments and exports to Europe."
    },
    {
        "name": "OnTrac",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Regional carrier. Best rate in the Los Angeles area."
    },
    {
        "name": "Laser Ship",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspended. Incident rate above 8% in Q3."
    },
    {
        "name": "PackSource LA",
        "country": "USA",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Boxes, filler, and tape for the Los Angeles warehouse."
    },
    {
        "name": "CleanTeam West",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Monthly rate for LA warehouse cleaning service."
    },
    {
        "name": "MRW España",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Primary carrier for deliveries in Spain. Volume-negotiated contract."
    },
    {
        "name": "SEUR",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica + Baleares",
        "contact_email": "grandes.cuentas@seur.com"
    },
    {
        "name": "DHL Express España",
        "country": "Spain",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "España + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Urgent shipments and exports from Zaragoza."
    },
    {
        "name": "Nacex",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragón y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Regional carrier with good coverage in Aragón."
    },
    {
        "name": "Logística Inversa Iberia",
        "country": "Spain",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Returns management for the Zaragoza warehouse."
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": "Spain",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es"
    },
    {
        "name": "SAP WM Cloud",
        "country": "USA",
        "categories": ["it_and_wms_software"],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspended. Andrés is evaluating lighter alternatives for the LA warehouse."
    },
    {
        "name": "ReturnBear",
        "country": "USA",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Returns management for Los Angeles customers."
    }
]
```

---

## Business constraints

- **Currency by country:** A supplier from `"USA"` must have `currency = "USD"`. A supplier from `"Spain"` must have `currency = "EUR"`. The API rejects inconsistent combinations.
- **Rate traceability:** Every update to `rate_per_shipment` must automatically record `updated_at`. Carlos uses this history to review cost evolution by carrier.
- **Suspension for incidents:** The usual TrackFlow workflow is to suspend suppliers with a high incident rate, not delete them. Suspension history is operationally relevant information.
- **Dual-category carriers:** It is valid for a carrier to operate in both last mile and international. The `categories` field accepts multiple values simultaneously.

---

## What Carlos will see in the frontend

The directory page must allow Carlos to:

1. See all suppliers with their categories, rate, and status at a glance.
2. Filter by country (USA / Spain) to manage each market separately.
3. Filter by category to answer questions like "what active carriers do we have in Spain?".
4. Register a new supplier from a form.
5. Update a supplier's per-shipment rate and see the change reflected immediately.
6. Suspend or reactivate a supplier with a visible control in the row.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
