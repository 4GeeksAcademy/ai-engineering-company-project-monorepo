// src/types/models.ts
// Interfaces and types for HealthCore's core entities.
// Source: CONTEXT.md — HealthCore Company Context

export type Id = string;

export interface BaseEntity {
  id: Id;
  createdAt?: string;
  updatedAt?: string;
}

export type Country = "US" | "UK";

// ---------- Clinic ----------

export interface Clinic extends BaseEntity {
  name: string;
  country: Country;
  city: string;
  region: string; // US state, or UK region (e.g. "Greater London")
}

// ---------- Patient ----------

export interface Patient extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  country: Country;
  clinicId: Id;
  dateOfBirth: string; // ISO date, e.g. "1990-04-12"
}

// ---------- Appointment ----------

export type AppointmentType =
  | "primary-care"
  | "specialist"
  | "chronic-disease-management"
  | "preventive";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "no-show"
  | "cancelled";

export interface Appointment extends BaseEntity {
  patientId: Id;
  clinicId: Id;
  staffId: Id;
  scheduledDate: string; // ISO date
  type: AppointmentType;
  status: AppointmentStatus;
}

// ---------- Clinical Staff ----------

export type ClinicalRole =
  | "physician"
  | "nurse-practitioner"
  | "nurse"
  | "medical-assistant";

export interface ClinicalStaff extends BaseEntity {
  firstName: string;
  lastName: string;
  role: ClinicalRole;
  clinicId: Id;
  country: Country;
  continuingEducationHoursCompleted: number;
  continuingEducationHoursRequired: number;
  licenseExpirationDate: string; // ISO date
}

// ---------- Billing Claim ----------

export type PayerType =
  | "commercial"
  | "medicare"
  | "medicaid"
  | "private-pay"
  | "nhs";

export type ClaimStatus = "paid" | "denied" | "pending";

export interface BillingClaim extends BaseEntity {
  patientId: Id;
  appointmentId: Id;
  country: Country;
  payerType: PayerType;
  amount: number;
  status: ClaimStatus;
  denialReason?: string; // required in practice whenever status is "denied"
  submittedDate: string; // ISO date
}

// ---------- Compliance Training ----------

export type ComplianceFramework = "HIPAA" | "UK-GDPR";
export type ComplianceStatus = "completed" | "overdue" | "pending";

export interface ComplianceTraining extends BaseEntity {
  employeeId: Id;
  employeeName: string;
  framework: ComplianceFramework;
  trainingName: string;
  completedDate: string | null; // null until the training is actually completed
  dueDate: string; // ISO date
  status: ComplianceStatus;
}