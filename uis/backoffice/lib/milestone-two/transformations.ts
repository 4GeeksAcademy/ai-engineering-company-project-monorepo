import type { Appointment, CMEReport, Claim, Clinician, Location } from "./types";
import { groupClaimsBy } from "./collections";
import { CME_AT_RISK_PACE_GAP, DENIAL_RATE_ALERT_THRESHOLD, NO_SHOW_RATE_ALERT_THRESHOLD } from "./business-rules";

function percentage(part: number, total: number, digits = 2): number {
  return total === 0 ? 0 : Number(((part / total) * 100).toFixed(digits));
}

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) throw new Error("Cannot calculate a denial rate from an empty claims array.");
  return percentage(claims.filter((claim) => claim.status === "denied").length, claims.length);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  return Object.fromEntries(Object.entries(groupClaimsBy(claims, "payerName")).map(([name, group]) => [name, calculateDenialRate(group)]));
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  return Object.fromEntries(Object.entries(groupClaimsBy(claims, "locationId")).map(([id, group]) => [id, calculateDenialRate(group)]));
}

export function flagHighDenialPayers(claims: Claim[], threshold = DENIAL_RATE_ALERT_THRESHOLD): string[] {
  return Object.entries(denialRateByPayer(claims))
    .filter(([, rate]) => rate > threshold)
    .map(([payerName]) => payerName);
}

function parseDate(date: string): Date {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${date}`);
  return parsed;
}

function calendarDaysBetween(start: Date, end: Date): number {
  return Math.ceil((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86_400_000);
}

export function calculateNoShowCost(appointments: Appointment[], location: Location, weekEndingDate: string): number {
  const end = parseDate(weekEndingDate);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const total = appointments
    .filter((appointment) => {
      const appointmentDate = parseDate(appointment.scheduledDate);
      return appointment.locationId === location.locationId
        && appointment.status === "no_show"
        && appointmentDate >= start
        && appointmentDate <= end;
    })
    .reduce((sum, appointment) => sum + (location.averageConsultationFee[appointment.serviceType] ?? 0), 0);
  return Number(total.toFixed(2));
}

export function noShowRateByLocation(appointments: Appointment[]): Record<string, number> {
  const grouped = appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    (groups[appointment.locationId] ??= []).push(appointment);
    return groups;
  }, {});
  return Object.fromEntries(Object.entries(grouped).map(([id, records]) => [
    id,
    percentage(records.filter((appointment) => appointment.status === "no_show").length, records.length),
  ]));
}

export function flagHighNoShowLocations(appointments: Appointment[], threshold = NO_SHOW_RATE_ALERT_THRESHOLD): string[] {
  return Object.entries(noShowRateByLocation(appointments))
    .filter(([, rate]) => rate > threshold)
    .map(([locationId]) => locationId);
}

export function generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[] {
  const asOf = parseDate(asOfDate);
  return clinicians.map((clinician) => {
    const cycleStart = parseDate(clinician.cmeYearStartDate);
    const cycleEnd = new Date(Date.UTC(cycleStart.getUTCFullYear() + 1, cycleStart.getUTCMonth(), cycleStart.getUTCDate() - 1));
    const cycleLength = Math.max(1, calendarDaysBetween(cycleStart, cycleEnd));
    const elapsedDays = Math.max(0, Math.min(cycleLength, calendarDaysBetween(cycleStart, asOf)));
    const hoursRequired = clinician.cmeHoursRequired;
    const hoursLogged = clinician.cmeHoursLogged;
    const percentComplete = hoursRequired === 0 ? 100 : Number(((hoursLogged / hoursRequired) * 100).toFixed(1));
    const cycleShareElapsed = percentage(elapsedDays, cycleLength, 1);
    const overdue = asOf > cycleEnd;
    const complianceStatus = hoursLogged >= hoursRequired
      ? "complete"
      : overdue
        ? "overdue"
        : percentComplete < cycleShareElapsed - CME_AT_RISK_PACE_GAP
          ? "at_risk"
          : "on_track";

    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired,
      hoursLogged,
      hoursRemaining: Math.max(0, hoursRequired - hoursLogged),
      percentComplete,
      daysRemainingInCycle: Math.max(0, calendarDaysBetween(asOf, cycleEnd)),
      complianceStatus,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining: calendarDaysBetween(asOf, parseDate(clinician.licenceExpiryDate)),
    };
  });
}

export function getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[] {
  const atRiskIds = new Set(
    generateCMEReport(clinicians, asOfDate)
      .filter((report) => report.complianceStatus === "at_risk" || report.complianceStatus === "overdue")
      .map((report) => report.clinicianId),
  );
  return clinicians.filter((clinician) => atRiskIds.has(clinician.clinicianId));
}

export function getCliniciansWithExpiringLicences(clinicians: Clinician[], asOfDate: string, daysThreshold: number): Clinician[] {
  const asOf = parseDate(asOfDate);
  return clinicians.filter((clinician) => {
    const daysRemaining = calendarDaysBetween(asOf, parseDate(clinician.licenceExpiryDate));
    return daysRemaining >= 0 && daysRemaining <= daysThreshold;
  });
}
