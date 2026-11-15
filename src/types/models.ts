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
] as const satisfies readonly Clinic[];

export interface DailyHours {
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface Clinic {
  readonly name: string;
  readonly city: string;
  readonly state: "TX" | "FL" | "GA";
  readonly phone: string;
  readonly openingHours: {
    readonly weekdays: DailyHours;
    readonly saturday?: DailyHours;
  };
}

export type ClinicName = (typeof CLINICS)[number]["name"];

export const PATIENT_SERVICE_TYPES = [
  "Primary Care",
  "Chronic Disease Management",
  "Specialist Consultation",
  "Preventive Health",
  "Women's Health",
  "Paediatric Care",
  "Mental Health"
] as const;

/** Backwards-compatible name for the patient enquiry form's display labels. */
export const SERVICE_TYPES = PATIENT_SERVICE_TYPES;

export type PatientServiceType = (typeof PATIENT_SERVICE_TYPES)[number];
export type PreferredLanguage = "English" | "Spanish";
export type PreferredTime = "morning" | "afternoon" | "evening";
export type YesNo = "yes" | "no";
export type ValidationLanguage = "en" | "es";

export interface PatientEnquiry {
  readonly first_name: string;
  readonly last_name: string;
  readonly date_of_birth: string;
  readonly email: string;
  readonly phone: string;
  readonly preferred_language: PreferredLanguage | "";
  readonly preferred_clinic: ClinicName | "";
  readonly preferred_date: string;
  readonly preferred_time: PreferredTime | "";
  readonly service_type: PatientServiceType | "";
  readonly new_patient: YesNo | "";
  readonly has_insurance: YesNo | "";
  readonly insurance_provider?: string;
  readonly insurance_member_id?: string;
  readonly patient_id?: string;
  readonly health_concern: string;
  readonly contact_consent: boolean;
}

export type PatientEnquiryField = keyof PatientEnquiry;

export const OPERATIONAL_SERVICE_TYPES = [
  "primary_care",
  "chronic_disease",
  "preventive",
  "specialist",
  "womens_health",
  "paediatric",
  "mental_health"
] as const;

export type ServiceType = (typeof OPERATIONAL_SERVICE_TYPES)[number];

export type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";

export type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";

export interface Claim {
  readonly claimId: string;
  readonly patientId: string;
  readonly locationId: string;
  readonly serviceType: ServiceType;
  readonly payerName: string;
  readonly payerId: string;
  readonly submissionDate: string;
  readonly claimAmount: number;
  readonly status: ClaimStatus;
  readonly denialReason?: DenialReason;
  readonly resubmitted: boolean;
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export interface Appointment {
  readonly appointmentId: string;
  readonly patientId: string;
  readonly locationId: string;
  readonly serviceType: ServiceType;
  readonly scheduledDate: string;
  readonly scheduledTime: string;
  readonly status: AppointmentStatus;
  readonly noShowReason?: string;
  readonly confirmedAt?: string;
}

export type ClinicianRole = "physician" | "nurse_practitioner" | "nurse" | "medical_assistant";

export interface Clinician {
  readonly clinicianId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: ClinicianRole;
  readonly locationId: string;
  readonly licenceState: string;
  readonly licenceExpiryDate: string;
  readonly cmeHoursRequired: number;
  readonly cmeHoursLogged: number;
  readonly cmeYearStartDate: string;
}

export interface Location {
  readonly locationId: string;
  readonly name: string;
  readonly city: string;
  readonly stateOrCountry: string;
  readonly country: "US" | "UK";
  readonly phone: string;
  readonly averageConsultationFee: Readonly<Record<ServiceType, number>>;
}

export type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";

export interface CMEReport {
  readonly clinicianId: string;
  readonly fullName: string;
  readonly role: ClinicianRole;
  readonly locationId: string;
  readonly hoursRequired: number;
  readonly hoursLogged: number;
  readonly hoursRemaining: number;
  readonly percentComplete: number;
  readonly daysRemainingInCycle: number;
  readonly complianceStatus: CMEStatus;
  readonly licenceExpiryDate: string;
  readonly licenceDaysRemaining: number;
}

export const LOCATION_IDS = ["us-tx-001", "us-fl-001", "us-ga-001"] as const;
export type KnownLocationId = (typeof LOCATION_IDS)[number];

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  "submitted", "approved", "denied", "pending", "appealed"
];
export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled", "confirmed", "completed", "no_show", "cancelled"
];
export const DENIAL_REASONS: readonly DenialReason[] = [
  "missing_authorisation",
  "coding_error",
  "duplicate_claim",
  "patient_not_covered",
  "service_not_covered",
  "incomplete_documentation"
];
export const CLINICIAN_ROLES: readonly ClinicianRole[] = [
  "physician", "nurse_practitioner", "nurse", "medical_assistant"
];
