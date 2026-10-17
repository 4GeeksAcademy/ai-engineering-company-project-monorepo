export type Id = string;

export interface BaseEntity {
  id: Id;
  createdAt: string;
  updatedAt: string;
}

export type CountryCode = "US" | "GB";
export type ClinicStatus = "active" | "inactive";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";
export type PatientLanguage = "English" | "Spanish";
export type PreferredTime = "morning" | "afternoon" | "evening";
export type PatientServiceType =
  | "Primary Care"
  | "Chronic Disease Management"
  | "Specialist Consultation"
  | "Preventive Health"
  | "Women's Health"
  | "Paediatric Care"
  | "Mental Health";
export type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";
export type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";
export type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";
export type ClinicianRole = "physician" | "nurse_practitioner" | "nurse" | "medical_assistant";
export type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";
export type SortDirection = "asc" | "desc";

export interface Clinic extends BaseEntity {
  name: string;
  city: string;
  stateOrRegion: string;
  country: CountryCode;
  phone: string;
  openingHours: string[];
  latestEveningHour: number;
  status: ClinicStatus;
}

export interface Patient extends BaseEntity {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  preferredLanguage: PatientLanguage;
  patientId?: string;
  hasInsurance: boolean;
  insuranceProvider?: string;
  insuranceMemberId?: string;
}

export interface Appointment {
  appointmentId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  noShowReason?: string;
  confirmedAt?: string;
}

export interface PatientEnquiry extends BaseEntity {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  preferredLanguage: PatientLanguage;
  preferredClinic: string;
  preferredDate: string;
  preferredTime: PreferredTime;
  serviceType: PatientServiceType;
  newPatient: boolean;
  hasInsurance: boolean;
  insuranceProvider?: string;
  insuranceMemberId?: string;
  patientId?: string;
  healthConcern: string;
  contactConsent: boolean;
}

export type StaffRole = "clinician" | "front_desk" | "administrator";

export interface StaffMember extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  clinicIds: Id[];
  active: boolean;
}

export interface Service extends BaseEntity {
  name: PatientServiceType;
  category: "primary_care" | "specialist" | "preventive" | "mental_health";
  description: string;
  startingPrice: number;
  active: boolean;
}

export interface FilterCriteria<T> {
  matches?: Partial<{ [Property in keyof T]: T[Property] }>;
  predicate?: (item: T) => boolean;
}

export interface SortCriterion<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface AggregationReport {
  count: number;
  total: number;
  average: number;
  minimum: number | undefined;
  maximum: number | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationOptions {
  referenceDate?: Date;
}

export const HEALTHCORE_US_CLINIC_NAMES: readonly string[] = [
  "HealthCore Austin Central",
  "HealthCore Austin North",
  "HealthCore San Antonio",
  "HealthCore Miami",
  "HealthCore Orlando",
  "HealthCore Atlanta",
];

export const SERVICE_TYPES: readonly ServiceType[] = [
  "primary_care",
  "chronic_disease",
  "preventive",
  "specialist",
  "womens_health",
  "paediatric",
  "mental_health",
];

export const PATIENT_SERVICE_TYPES: readonly PatientServiceType[] = [
  "Primary Care",
  "Chronic Disease Management",
  "Specialist Consultation",
  "Preventive Health",
  "Women's Health",
  "Paediatric Care",
  "Mental Health",
];

export interface Claim {
  claimId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  payerName: string;
  payerId: string;
  submissionDate: string;
  claimAmount: number;
  status: ClaimStatus;
  denialReason?: DenialReason;
  resubmitted: boolean;
}

export interface Clinician {
  clinicianId: string;
  firstName: string;
  lastName: string;
  role: ClinicianRole;
  locationId: string;
  licenceState: string;
  licenceExpiryDate: string;
  cmeHoursRequired: number;
  cmeHoursLogged: number;
  cmeYearStartDate: string;
}

export interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>;
}

export interface CMEReport {
  clinicianId: string;
  fullName: string;
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number;
  percentComplete: number;
  daysRemainingInCycle: number;
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number;
}

export * from "./queries";
export * from "./validation";
export * from "./collections";
export * from "./search";
export * from "./transformations";
export * from "./validations";
