// src/utils/transformations.ts

import {
  Appointment,
  AppointmentStatus,
  BillingClaim,
  ClinicalStaff,
  Id,
} from "../types/models";

export function countAppointmentsByStatus(
  appointments: Appointment[]
): Record<AppointmentStatus, number> {
  const counts: Record<AppointmentStatus, number> = {
    scheduled: 0,
    completed: 0,
    "no-show": 0,
    cancelled: 0,
  };

  for (const appt of appointments) {
    counts[appt.status] += 1;
  }

  return counts;
}

export function countAppointmentsByClinic(
  appointments: Appointment[]
): Record<Id, number> {
  const counts: Record<Id, number> = {};

  for (const appt of appointments) {
    counts[appt.clinicId] = (counts[appt.clinicId] ?? 0) + 1;
  }

  return counts;
}

export function calculateNoShowRate(appointments: Appointment[]): number {
  if (appointments.length === 0) return 0;
  const noShows = appointments.filter((appt) => appt.status === "no-show").length;
  return (noShows / appointments.length) * 100;
}

export function calculateDenialRate(claims: BillingClaim[]): number {
  const decidedClaims = claims.filter(
    (claim) => claim.status === "paid" || claim.status === "denied"
  );
  if (decidedClaims.length === 0) return 0;
  const denied = decidedClaims.filter((claim) => claim.status === "denied").length;
  return (denied / decidedClaims.length) * 100;
}

export function calculateTotalClaimAmount(claims: BillingClaim[]): number {
  return claims.reduce((total, claim) => total + claim.amount, 0);
}

export function calculateAverageClaimAmount(claims: BillingClaim[]): number {
  if (claims.length === 0) return 0;
  return calculateTotalClaimAmount(claims) / claims.length;
}

export function getMaxClaimAmount(claims: BillingClaim[]): number | null {
  if (claims.length === 0) return null;
  return claims.reduce((max, claim) => Math.max(max, claim.amount), claims[0].amount);
}

export function getMinClaimAmount(claims: BillingClaim[]): number | null {
  if (claims.length === 0) return null;
  return claims.reduce((min, claim) => Math.min(min, claim.amount), claims[0].amount);
}

export function calculateAverageCEHoursCompleted(staff: ClinicalStaff[]): number {
  if (staff.length === 0) return 0;
  const total = staff.reduce(
    (sum, member) => sum + member.continuingEducationHoursCompleted,
    0
  );
  return total / staff.length;
}