export const CLINICS = [
    {
        name: "HealthCore Austin Central",
        city: "Austin",
        state: "TX",
        phone: "+1-512-340-8800",
        openingHours: { weekdays: { opensAt: "07:00", closesAt: "20:00" }, saturday: { opensAt: "09:00", closesAt: "15:00" } }
    },
    {
        name: "HealthCore Austin North",
        city: "Austin",
        state: "TX",
        phone: "+1-512-340-8810",
        openingHours: { weekdays: { opensAt: "08:00", closesAt: "19:00" } }
    },
    {
        name: "HealthCore San Antonio",
        city: "San Antonio",
        state: "TX",
        phone: "+1-210-720-4400",
        openingHours: { weekdays: { opensAt: "08:00", closesAt: "18:00" }, saturday: { opensAt: "09:00", closesAt: "13:00" } }
    },
    {
        name: "HealthCore Miami",
        city: "Miami",
        state: "FL",
        phone: "+1-305-510-7700",
        openingHours: { weekdays: { opensAt: "07:00", closesAt: "20:00" }, saturday: { opensAt: "09:00", closesAt: "16:00" } }
    },
    {
        name: "HealthCore Orlando",
        city: "Orlando",
        state: "FL",
        phone: "+1-407-892-6600",
        openingHours: { weekdays: { opensAt: "08:00", closesAt: "18:00" } }
    },
    {
        name: "HealthCore Atlanta",
        city: "Atlanta",
        state: "GA",
        phone: "+1-404-330-9900",
        openingHours: { weekdays: { opensAt: "08:00", closesAt: "19:00" } }
    }
];
export const PATIENT_SERVICE_TYPES = [
    "Primary Care",
    "Chronic Disease Management",
    "Specialist Consultation",
    "Preventive Health",
    "Women's Health",
    "Paediatric Care",
    "Mental Health"
];
/** Backwards-compatible name for the patient enquiry form's display labels. */
export const SERVICE_TYPES = PATIENT_SERVICE_TYPES;
export const OPERATIONAL_SERVICE_TYPES = [
    "primary_care",
    "chronic_disease",
    "preventive",
    "specialist",
    "womens_health",
    "paediatric",
    "mental_health"
];
export const LOCATION_IDS = ["us-tx-001", "us-fl-001", "us-ga-001"];
export const CLAIM_STATUSES = [
    "submitted", "approved", "denied", "pending", "appealed"
];
export const APPOINTMENT_STATUSES = [
    "scheduled", "confirmed", "completed", "no_show", "cancelled"
];
export const DENIAL_REASONS = [
    "missing_authorisation",
    "coding_error",
    "duplicate_claim",
    "patient_not_covered",
    "service_not_covered",
    "incomplete_documentation"
];
export const CLINICIAN_ROLES = [
    "physician", "nurse_practitioner", "nurse", "medical_assistant"
];
