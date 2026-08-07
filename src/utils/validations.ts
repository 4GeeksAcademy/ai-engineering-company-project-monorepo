// src/utils/validations.ts

import {
  Appointment,
  BillingClaim,
  ComplianceTraining,
  Patient,
} from "../types/models";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPatientRecord(patient: Patient): boolean {
  if (patient.firstName.trim() === "" || patient.lastName.trim() === "") {
    return false;
  }
  if (!isValidEmail(patient.email)) {
    return false;
  }
  if (patient.country !== "US" && patient.country !== "UK") {
    return false;
  }
  if (!patient.clinicId) {
    return false;
  }
  return true;
}

export function isValidAppointmentDate(appointment: Appointment): boolean {
  const today = new Date().toISOString().split("T")[0];
  return appointment.scheduledDate >= today;
}

export function isValidAppointmentRecord(appointment: Appointment): boolean {
  const validStatuses = ["scheduled", "completed", "no-show", "cancelled"];
  const validTypes = [
    "primary-care",
    "specialist",
    "chronic-disease-management",
    "preventive",
  ];

  if (!validStatuses.includes(appointment.status)) return false;
  if (!validTypes.includes(appointment.type)) return false;
  if (!appointment.patientId || !appointment.clinicId || !appointment.staffId) {
    return false;
  }

  return true;
}

export function isValidBillingClaim(claim: BillingClaim): boolean {
  if (claim.amount <= 0) return false;

  const validPayerTypes = [
    "commercial",
    "medicare",
    "medicaid",
    "private-pay",
    "nhs",
  ];
  if (!validPayerTypes.includes(claim.payerType)) return false;

  if (
    claim.status === "denied" &&
    (!claim.denialReason || claim.denialReason.trim() === "")
  ) {
    return false;
  }

  return true;
}

export function isValidComplianceRecord(training: ComplianceTraining): boolean {
  if (training.status === "completed" && training.completedDate === null) {
    return false;
  }
  if (training.status !== "completed" && training.completedDate !== null) {
    return false;
  }
  return true;
}