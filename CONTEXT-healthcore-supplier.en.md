# CONTEXT — Supplier Directory · HealthCore

_Estas instrucciones también están disponibles en [español](./CONTEXT-healthcore.es.md)._

> **Milestone:** 09 — Lightweight Storage API
> **Repository path:** `09-lightweight-storage/CONTEXT-healthcore.md`

---

## Your company

You are part of the **HealthCore Digital** team, the internal technology unit of HealthCore, a network of **12 outpatient clinics** with operations in the United States (Texas, Florida, Georgia) and the United Kingdom (London and Manchester). Your tech lead is **James Osei**, CTO, and the project was requested jointly by **Diane Foster** (VP of People) and **Claire Whitfield** (Chief Compliance Officer).

HealthCore works with external suppliers in two broad categories: clinical and operational suppliers (medical supplies, laboratory, cleaning) and technology suppliers (software, platforms, cloud services). Until now, each department manages its own list in separate spreadsheets. Claire also needs visibility into all technology suppliers to verify they have signed the required compliance agreements (BAA in the USA, DPA in the UK). This project creates the centralized registry that addresses both needs.

---

## Supplier model

Each supplier in the HealthCore directory has the following structure:

| Field                   | Type                                 | Description                                                                               |
| ----------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `name`                  | string, required                     | Supplier or platform trade name                                                           |
| `country`               | string, required                     | Contract country: `"USA"` or `"UK"`                                                       |
| `categories`            | list of strings, required, minimum 1 | Type of service or product supplied (see valid list)                                      |
| `monthly_rate`          | float, required, > 0                 | Current monthly cost in the contract currency                                             |
| `currency`              | string, required                     | `"USD"` for USA, `"GBP"` for UK                                                           |
| `updated_at`            | datetime, system-generated           | Timestamp of the last rate update                                                         |
| `status`                | string, required                     | `"active"` or `"suspended"`                                                               |
| `compliance_agreement`  | string, optional                     | Signed compliance agreement type: `"BAA"`, `"DPA"`, `"both"`, or `null` if not applicable |
| `contract_renewal_date` | string, optional                     | Contract renewal date (format `YYYY-MM-DD`)                                               |
| `contact_email`         | string, optional                     | Supplier account manager email                                                            |
| `notes`                 | string, optional                     | Internal notes                                                                            |

### Valid categories

```python
VALID_CATEGORIES = [
    "medical_supplies",
    "laboratory_services",
    "pharmaceutical",
    "clinical_software",
    "it_infrastructure",
    "hr_and_payroll_software",
    "cleaning_and_facilities",
    "patient_communication",
    "billing_and_coding_software",
    "training_platforms"
]
```

### Valid statuses

```python
VALID_STATUSES = ["active", "suspended"]
```

---

## Seeder initial data

The seeder must load exactly the following suppliers, representing Diane and Claire's combined current directory state.

```python
SUPPLIERS_SEED = [
    {
        "name": "McKesson Medical Supplies",
        "country": "USA",
        "categories": ["medical_supplies"],
        "monthly_rate": 4200.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-06-30",
        "contact_email": "accounts@mckesson.com",
        "notes": "Primary clinical supplies provider for the 9 USA clinics."
    },
    {
        "name": "NHS Supply Chain",
        "country": "UK",
        "categories": ["medical_supplies"],
        "monthly_rate": 2800.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enquiries@supplychain.nhs.uk"
    },
    {
        "name": "Quest Diagnostics",
        "country": "USA",
        "categories": ["laboratory_services"],
        "monthly_rate": 3100.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-12-15",
        "contact_email": "business@questdiagnostics.com",
        "notes": "Laboratory processing for Texas and Florida clinics."
    },
    {
        "name": "Synnovis UK",
        "country": "UK",
        "categories": ["laboratory_services"],
        "monthly_rate": 1950.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "contracts@synnovis.co.uk"
    },
    {
        "name": "Epic Systems",
        "country": "USA",
        "categories": ["clinical_software"],
        "monthly_rate": 8500.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2026-01-01",
        "contact_email": "enterprise@epic.com",
        "notes": "Primary EHR for USA clinics. Long-term contract."
    },
    {
        "name": "EMIS Health",
        "country": "UK",
        "categories": ["clinical_software"],
        "monthly_rate": 3400.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contract_renewal_date": "2025-09-01",
        "contact_email": "accounts@emishealth.com",
        "notes": "EHR for London and Manchester clinics."
    },
    {
        "name": "Availity",
        "country": "USA",
        "categories": ["billing_and_coding_software"],
        "monthly_rate": 1200.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contact_email": "enterprise@availity.com",
        "notes": "Eligibility verification and claims submission platform."
    },
    {
        "name": "Twilio",
        "country": "USA",
        "categories": ["patient_communication"],
        "monthly_rate": 680.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-10-31",
        "contact_email": "healthcare@twilio.com",
        "notes": "Automated SMS and email for appointment reminders."
    },
    {
        "name": "AWS Healthcare",
        "country": "USA",
        "categories": ["it_infrastructure"],
        "monthly_rate": 5600.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contact_email": "aws-health@amazon.com",
        "notes": "Primary cloud infrastructure. BAA signed and audited annually."
    },
    {
        "name": "Microsoft Azure UK",
        "country": "UK",
        "categories": ["it_infrastructure"],
        "monthly_rate": 2100.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enterprise@microsoft.com"
    },
    {
        "name": "Workday",
        "country": "USA",
        "categories": ["hr_and_payroll_software"],
        "monthly_rate": 2400.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": None,
        "contract_renewal_date": "2025-08-15",
        "contact_email": "enterprise@workday.com",
        "notes": "HRIS for the entire USA workforce. Does not handle PHI."
    },
    {
        "name": "Sage Payroll UK",
        "country": "UK",
        "categories": ["hr_and_payroll_software"],
        "monthly_rate": 890.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "business@sage.co.uk"
    },
    {
        "name": "ServiceMaster Clean",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "monthly_rate": 3800.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": None,
        "contact_email": "healthcare@servicemaster.com",
        "notes": "Clinical cleaning for the 9 USA locations."
    },
    {
        "name": "Healthstream LMS",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 1100.0,
        "currency": "USD",
        "status": "suspended",
        "compliance_agreement": "BAA",
        "contact_email": "enterprise@healthstream.com",
        "notes": "Suspended. Diane is evaluating replacing it with an in-house solution."
    },
    {
        "name": "Nuffield Health Supplies",
        "country": "UK",
        "categories": ["medical_supplies", "cleaning_and_facilities"],
        "monthly_rate": 1650.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "procurement@nuffieldhealth.com"
    }
]
```

---

## Business constraints

- **Currency by country:** A supplier from `"USA"` must have `currency = "USD"`. A supplier from `"UK"` must have `currency = "GBP"`. The API rejects inconsistent combinations.
- **Compliance agreement:** The `compliance_agreement` field is optional, but suppliers with categories `clinical_software`, `it_infrastructure`, `patient_communication`, or `billing_and_coding_software` should have it recorded. This is not automatic API validation — it is the responsibility of whoever registers the supplier.
- **Rate traceability:** Every update to `monthly_rate` must record `updated_at`. Claire uses this data in audits to verify that cost changes are traceable.
- **Suspension, not deletion:** Suppliers are not removed from the directory — they are suspended. Preserving history is especially relevant at HealthCore due to the regulatory environment: an audit may ask which suppliers were used in a given period.

---

## What Diane and Claire will see in the frontend

The directory page must allow them to:

1. See all suppliers with category, monthly rate, compliance agreement, and status.
2. Filter by country (USA / UK) to manage each market independently.
3. Filter by category to quickly locate suppliers of a specific type.
4. Visually distinguish active suppliers from suspended ones.
5. Register a new supplier from a form.
6. Update a supplier's monthly rate and see the change reflected immediately.
7. Activate or suspend a supplier with a visible control in each row.

---

_Internal document — 4Geeks Academy · AI Engineering Track_