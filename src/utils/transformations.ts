import type { Appointment, Claim, Clinician, CMEReport, CMEStatus, Location } from "../types/models";

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseIsoDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

function dayDiff(startDate: Date, endDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
}

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) {
    throw new Error("Cannot calculate denial rate for an empty claims array.");
  }

  const deniedClaims = claims.filter((claim) => claim.status === "denied").length;
  return round((deniedClaims / claims.length) * 100, 2);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  const grouped = claims.reduce<Record<string, Claim[]>>((acc, claim) => {
    if (!acc[claim.payerName]) {
      acc[claim.payerName] = [];
    }
    acc[claim.payerName].push(claim);
    return acc;
  }, {});

  return Object.entries(grouped).reduce<Record<string, number>>((acc, [payerName, payerClaims]) => {
    acc[payerName] = calculateDenialRate(payerClaims);
    return acc;
  }, {});
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  const grouped = claims.reduce<Record<string, Claim[]>>((acc, claim) => {
    if (!acc[claim.locationId]) {
      acc[claim.locationId] = [];
    }
    acc[claim.locationId].push(claim);
    return acc;
  }, {});

  return Object.entries(grouped).reduce<Record<string, number>>((acc, [locationId, locationClaims]) => {
    acc[locationId] = calculateDenialRate(locationClaims);
    return acc;
  }, {});
}

export function flagHighDenialPayers(claims: Claim[], threshold: number = 8): string[] {
  const rates = denialRateByPayer(claims);
  return Object.entries(rates)
    .filter(([, rate]) => rate > threshold)
    .map(([payerName]) => payerName);
}

export function calculateNoShowCost(
  appointments: Appointment[],
  location: Location,
  weekEndingDate: string,
): number {
  const weekEnd = parseIsoDate(weekEndingDate);
  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);

  const total = appointments
    .filter((appointment) => appointment.locationId === location.locationId)
    .filter((appointment) => appointment.status === "no_show")
    .filter((appointment) => {
      const scheduled = parseIsoDate(appointment.scheduledDate);
      return scheduled >= weekStart && scheduled <= weekEnd;
    })
    .reduce((sum, appointment) => {
      return sum + location.averageConsultationFee[appointment.serviceType];
    }, 0);

  return round(total, 2);
}

export function noShowRateByLocation(appointments: Appointment[]): Record<string, number> {
  const totalsByLocation = new Map<string, number>();
  const noShowsByLocation = new Map<string, number>();

  for (const appointment of appointments) {
    totalsByLocation.set(appointment.locationId, (totalsByLocation.get(appointment.locationId) ?? 0) + 1);

    if (appointment.status === "no_show") {
      noShowsByLocation.set(
        appointment.locationId,
        (noShowsByLocation.get(appointment.locationId) ?? 0) + 1,
      );
    }
  }

  const result: Record<string, number> = {};
  for (const [locationId, total] of totalsByLocation.entries()) {
    const noShows = noShowsByLocation.get(locationId) ?? 0;
    result[locationId] = total === 0 ? 0 : round((noShows / total) * 100, 2);
  }

  return result;
}

export function flagHighNoShowLocations(
  appointments: Appointment[],
  threshold: number = 20,
): string[] {
  const rates = noShowRateByLocation(appointments);
  return Object.entries(rates)
    .filter(([, rate]) => rate > threshold)
    .map(([locationId]) => locationId);
}

function getCmeCycleEnd(cmeYearStartDate: string): Date {
  const cycleStart = parseIsoDate(cmeYearStartDate);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setUTCFullYear(cycleEnd.getUTCFullYear() + 1);
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
  return cycleEnd;
}

function calculateYearProgressPercent(cycleStart: Date, cycleEnd: Date, asOfDate: Date): number {
  if (asOfDate <= cycleStart) {
    return 0;
  }
  if (asOfDate >= cycleEnd) {
    return 100;
  }

  const totalDays = Math.max(1, dayDiff(cycleStart, cycleEnd) + 1);
  const elapsedDays = Math.max(0, dayDiff(cycleStart, asOfDate) + 1);
  return (elapsedDays / totalDays) * 100;
}

function determineComplianceStatus(
  hoursLogged: number,
  hoursRequired: number,
  percentComplete: number,
  cycleStart: Date,
  cycleEnd: Date,
  asOfDate: Date,
): CMEStatus {
  if (hoursLogged >= hoursRequired) {
    return "complete";
  }

  if (asOfDate > cycleEnd && hoursLogged < hoursRequired) {
    return "overdue";
  }

  if (asOfDate >= cycleStart && asOfDate <= cycleEnd) {
    const yearProgress = calculateYearProgressPercent(cycleStart, cycleEnd, asOfDate);
    if (percentComplete < yearProgress - 15) {
      return "at_risk";
    }
  }

  return "on_track";
}

export function generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[] {
  const asOf = parseIsoDate(asOfDate);

  return clinicians.map((clinician) => {
    const cycleStart = parseIsoDate(clinician.cmeYearStartDate);
    const cycleEnd = getCmeCycleEnd(clinician.cmeYearStartDate);

    const hoursRequired = clinician.cmeHoursRequired;
    const hoursLogged = clinician.cmeHoursLogged;
    const hoursRemaining = Math.max(0, hoursRequired - hoursLogged);

    const percentComplete =
      hoursRequired === 0 ? 100 : round((Math.max(0, hoursLogged) / hoursRequired) * 100, 1);

    const daysRemainingInCycle = dayDiff(asOf, cycleEnd);
    const licenceExpiry = parseIsoDate(clinician.licenceExpiryDate);
    const licenceDaysRemaining = dayDiff(asOf, licenceExpiry);

    const complianceStatus = determineComplianceStatus(
      hoursLogged,
      hoursRequired,
      percentComplete,
      cycleStart,
      cycleEnd,
      asOf,
    );

    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired,
      hoursLogged,
      hoursRemaining,
      percentComplete,
      daysRemainingInCycle,
      complianceStatus,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining,
    };
  });
}

export function getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[] {
  const reportById = new Map(
    generateCMEReport(clinicians, asOfDate).map((report) => [report.clinicianId, report]),
  );

  return clinicians.filter((clinician) => {
    const report = reportById.get(clinician.clinicianId);
    return report?.complianceStatus === "at_risk" || report?.complianceStatus === "overdue";
  });
}

export function getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number,
): Clinician[] {
  const asOf = parseIsoDate(asOfDate);

  return clinicians.filter((clinician) => {
    const expiryDate = parseIsoDate(clinician.licenceExpiryDate);
    const daysRemaining = dayDiff(asOf, expiryDate);
    return daysRemaining >= 0 && daysRemaining <= daysThreshold;
  });
}
