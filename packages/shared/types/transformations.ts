import type { Appointment, CMEReport, CMEStatus, Claim, Clinician, Location } from "./index";

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) {
    throw new Error("Cannot calculate a denial rate for an empty claims array");
  }
  return roundPercentage(claims.filter((claim: Claim): boolean => claim.status === "denied").length, claims.length, 2);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  return denialRateBy(claims, (claim: Claim): string => claim.payerName);
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  return denialRateBy(claims, (claim: Claim): string => claim.locationId);
}

export function flagHighDenialPayers(claims: Claim[], threshold: number = 8): string[] {
  return Object.entries(denialRateByPayer(claims))
    .filter(([, rate]: [string, number]): boolean => rate > threshold)
    .map(([payerName]: [string, number]): string => payerName);
}

export function calculateNoShowCost(
  appointments: Appointment[],
  location: Location,
  weekEndingDate: string,
): number {
  const endDate: Date = parseDate(weekEndingDate);
  const startDate: Date = addDays(endDate, -6);
  const total: number = appointments
    .filter((appointment: Appointment): boolean => {
      const appointmentDate: Date = parseDate(appointment.scheduledDate);
      return appointment.status === "no_show"
        && appointment.locationId === location.locationId
        && appointmentDate >= startDate
        && appointmentDate <= endDate;
    })
    .reduce((sum: number, appointment: Appointment): number =>
      sum + location.averageConsultationFee[appointment.serviceType], 0);
  return round(total, 2);
}

export function noShowRateByLocation(appointments: Appointment[]): Record<string, number> {
  const totals: Record<string, number> = {};
  const noShows: Record<string, number> = {};
  for (const appointment of appointments) {
    totals[appointment.locationId] = (totals[appointment.locationId] ?? 0) + 1;
    if (appointment.status === "no_show") {
      noShows[appointment.locationId] = (noShows[appointment.locationId] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([locationId, total]: [string, number]): [string, number] => [
      locationId,
      roundPercentage(noShows[locationId] ?? 0, total, 2),
    ]),
  );
}

export function flagHighNoShowLocations(appointments: Appointment[], threshold: number = 20): string[] {
  return Object.entries(noShowRateByLocation(appointments))
    .filter(([, rate]: [string, number]): boolean => rate > threshold)
    .map(([locationId]: [string, number]): string => locationId);
}

export function generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[] {
  const referenceDate: Date = parseDate(asOfDate);
  return clinicians.map((clinician: Clinician): CMEReport => {
    const cycleStart: Date = parseDate(clinician.cmeYearStartDate);
    const cycleEnd: Date = addDays(addYears(cycleStart, 1), -1);
    const hoursRemaining: number = Math.max(0, clinician.cmeHoursRequired - clinician.cmeHoursLogged);
    const percentComplete: number = clinician.cmeHoursRequired === 0
      ? 100
      : round((clinician.cmeHoursLogged / clinician.cmeHoursRequired) * 100, 1);
    const cycleEnded: boolean = referenceDate > cycleEnd;
    const daysInCycle: number = calendarDaysBetween(cycleStart, cycleEnd);
    const elapsedDays: number = Math.min(daysInCycle, Math.max(0, calendarDaysBetween(cycleStart, referenceDate)));
    const pacePercentage: number = daysInCycle === 0 ? 100 : (elapsedDays / daysInCycle) * 100;
    const complianceStatus: CMEStatus = clinician.cmeHoursLogged >= clinician.cmeHoursRequired
      ? "complete"
      : cycleEnded
        ? "overdue"
        : percentComplete < pacePercentage - 15 ? "at_risk" : "on_track";
    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired: clinician.cmeHoursRequired,
      hoursLogged: clinician.cmeHoursLogged,
      hoursRemaining,
      percentComplete,
      daysRemainingInCycle: Math.max(0, calendarDaysBetween(referenceDate, cycleEnd)),
      complianceStatus,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining: calendarDaysBetween(referenceDate, parseDate(clinician.licenceExpiryDate)),
    };
  });
}

export function getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[] {
  const atRiskIds: Set<string> = new Set(
    generateCMEReport(clinicians, asOfDate)
      .filter((report: CMEReport): boolean => report.complianceStatus === "at_risk" || report.complianceStatus === "overdue")
      .map((report: CMEReport): string => report.clinicianId),
  );
  return clinicians.filter((clinician: Clinician): boolean => atRiskIds.has(clinician.clinicianId));
}

export function getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number,
): Clinician[] {
  const referenceDate: Date = parseDate(asOfDate);
  return clinicians.filter((clinician: Clinician): boolean => {
    const daysRemaining: number = calendarDaysBetween(referenceDate, parseDate(clinician.licenceExpiryDate));
    return daysRemaining >= 0 && daysRemaining <= daysThreshold;
  });
}

function denialRateBy(claims: Claim[], selector: (claim: Claim) => string): Record<string, number> {
  const groups: Record<string, Claim[]> = {};
  for (const claim of claims) {
    const key: string = selector(claim);
    groups[key] ??= [];
    groups[key].push(claim);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([key, group]: [string, Claim[]]): [string, number] => [key, calculateDenialRate(group)]),
  );
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number): Date {
  const result: Date = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result: Date = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function calendarDaysBetween(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

function round(value: number, decimalPlaces: number): number {
  const factor: number = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function roundPercentage(numerator: number, denominator: number, decimalPlaces: number): number {
  return denominator === 0 ? 0 : round((numerator / denominator) * 100, decimalPlaces);
}
