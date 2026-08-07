// src/utils/collections.ts

import {
  Appointment,
  AppointmentStatus,
  BillingClaim,
  ClaimStatus,
  Country,
  Id,
  Patient,
} from "../types/models";

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus
): Appointment[] {
  return appointments.filter((appt) => appt.status === status);
}

export function filterAppointmentsByClinic(
  appointments: Appointment[],
  clinicId: Id
): Appointment[] {
  return appointments.filter((appt) => appt.clinicId === clinicId);
}

export function filterAppointmentsByDateRange(
  appointments: Appointment[],
  startDate: string,
  endDate: string
): Appointment[] {
  return appointments.filter(
    (appt) => appt.scheduledDate >= startDate && appt.scheduledDate <= endDate
  );
}

export interface AppointmentCriteria {
  status?: AppointmentStatus;
  clinicId?: Id;
  patientId?: Id;
}

export function filterAppointmentsByCriteria(
  appointments: Appointment[],
  criteria: AppointmentCriteria
): Appointment[] {
  return appointments.filter((appt) => {
    if (criteria.status !== undefined && appt.status !== criteria.status) {
      return false;
    }
    if (criteria.clinicId !== undefined && appt.clinicId !== criteria.clinicId) {
      return false;
    }
    if (criteria.patientId !== undefined && appt.patientId !== criteria.patientId) {
      return false;
    }
    return true;
  });
}

export function filterPatientsByCountry(
  patients: Patient[],
  country: Country
): Patient[] {
  return patients.filter((patient) => patient.country === country);
}

export function filterClaimsByStatus(
  claims: BillingClaim[],
  status: ClaimStatus
): BillingClaim[] {
  return claims.filter((claim) => claim.status === status);
}

export function filterClaimsByAmountRange(
  claims: BillingClaim[],
  minAmount: number,
  maxAmount: number
): BillingClaim[] {
  return claims.filter(
    (claim) => claim.amount >= minAmount && claim.amount <= maxAmount
  );
}

export function sortAppointmentsByDate(
  appointments: Appointment[],
  direction: "asc" | "desc" = "asc"
): Appointment[] {
  const sorted = [...appointments].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate)
  );
  return direction === "asc" ? sorted : sorted.reverse();
}

export function sortClaimsByAmount(
  claims: BillingClaim[],
  direction: "asc" | "desc" = "asc"
): BillingClaim[] {
  const sorted = [...claims].sort((a, b) => a.amount - b.amount);
  return direction === "asc" ? sorted : sorted.reverse();
}

export function sortClaimsByStatusThenAmount(
  claims: BillingClaim[],
  direction: "asc" | "desc" = "asc"
): BillingClaim[] {
  const sorted = [...claims].sort((a, b) => {
    const statusCompare = a.status.localeCompare(b.status);
    if (statusCompare !== 0) return statusCompare;
    return a.amount - b.amount;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}