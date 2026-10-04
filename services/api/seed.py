from __future__ import annotations

from datetime import datetime, timezone

from tinydb import Query

from database import get_suppliers_table
from models import SupplierCreate

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
        "notes": "Primary clinical supplies provider for the 9 USA clinics.",
    },
    {
        "name": "NHS Supply Chain",
        "country": "UK",
        "categories": ["medical_supplies"],
        "monthly_rate": 2800.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enquiries@supplychain.nhs.uk",
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
        "notes": "Laboratory processing for Texas and Florida clinics.",
    },
    {
        "name": "Synnovis UK",
        "country": "UK",
        "categories": ["laboratory_services"],
        "monthly_rate": 1950.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "contracts@synnovis.co.uk",
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
        "notes": "Primary EHR for USA clinics. Long-term contract.",
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
        "notes": "EHR for London and Manchester clinics.",
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
        "notes": "Eligibility verification and claims submission platform.",
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
        "notes": "Automated SMS and email for appointment reminders.",
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
        "notes": "Primary cloud infrastructure. BAA signed and audited annually.",
    },
    {
        "name": "Microsoft Azure UK",
        "country": "UK",
        "categories": ["it_infrastructure"],
        "monthly_rate": 2100.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enterprise@microsoft.com",
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
        "notes": "HRIS for the entire USA workforce. Does not handle PHI.",
    },
    {
        "name": "Sage Payroll UK",
        "country": "UK",
        "categories": ["hr_and_payroll_software"],
        "monthly_rate": 890.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "business@sage.co.uk",
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
        "notes": "Clinical cleaning for the 9 USA locations.",
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
        "notes": "Suspended. Diane is evaluating replacing it with an in-house solution.",
    },
    {
        "name": "Nuffield Health Supplies",
        "country": "UK",
        "categories": ["medical_supplies", "cleaning_and_facilities"],
        "monthly_rate": 1650.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "procurement@nuffieldhealth.com",
    },
]


def main() -> None:
    table = get_suppliers_table()
    existing = Query()
    inserted = 0
    now = datetime.now(timezone.utc).isoformat()

    for raw in SUPPLIERS_SEED:
        supplier = SupplierCreate.model_validate(raw)
        duplicate = table.get(
            (existing.name == supplier.name) & (existing.country == supplier.country.value)
        )
        if duplicate is not None:
            continue
        record = supplier.model_dump(mode="json")
        record["updated_at"] = now
        table.insert(record)
        inserted += 1

    print(f"Inserted {inserted} records.")


if __name__ == "__main__":
    main()
