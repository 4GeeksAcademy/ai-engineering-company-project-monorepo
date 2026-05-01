import {
  Claim,
  Appointment,
  Clinician,
  Location,
  CMEReport,
  CMEStatus,
} from "../types/models";

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end - start) / msPerDay);
}

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) {
    throw new Error("Cannot calculate denial rate on an empty claims array");
  }
  const deniedCount = claims.filter(claim => claim.status === "denied").length;
  return roundToTwoDecimals((deniedCount / claims.length) * 100);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  const groups: Record<string, Claim[]> = {};
  for (const claim of claims) {
    if (!groups[claim.payerName]) groups[claim.payerName] = [];
    groups[claim.payerName].push(claim);
  }

  const rates: Record<string, number> = {};
  for (const payer in groups) {
    rates[payer] = calculateDenialRate(groups[payer]);
  }
  return rates;
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  const groups: Record<string, Claim[]> = {};
  for (const claim of claims) {
    if (!groups[claim.locationId]) groups[claim.locationId] = [];
    groups[claim.locationId].push(claim);
  }

  const rates: Record<string, number> = {};
  for (const location in groups) {
    rates[location] = calculateDenialRate(groups[location]);
  }
  return rates;
}

export function flagHighDenialPayers(claims: Claim[], threshold: number = 8): string[] {
  const rates = denialRateByPayer(claims);
  return Object.keys(rates).filter(payer => rates[payer] > threshold);
}

export function calculateNoShowCost(
  appointments: Appointment[],
  location: Location,
  weekEndingDate: string
): number {
  const endDate = new Date(weekEndingDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const noShowsInWindow = appointments.filter(appointment => {
    if (appointment.locationId !== location.locationId) return false;
    if (appointment.status !== "no_show") return false;
    const scheduled = new Date(appointment.scheduledDate);
    return scheduled >= startDate && scheduled <= endDate;
  });

  if (noShowsInWindow.length === 0) return 0;

  const total = noShowsInWindow.reduce((sum, appointment) => {
    return sum + location.averageConsultationFee[appointment.serviceType];
  }, 0);

  return roundToTwoDecimals(total);
}

export function noShowRateByLocation(appointments: Appointment[]): Record<string, number> {
  const groups: Record<string, Appointment[]> = {};
  for (const appointment of appointments) {
    if (!groups[appointment.locationId]) groups[appointment.locationId] = [];
    groups[appointment.locationId].push(appointment);
  }

  const rates: Record<string, number> = {};
  for (const locationId in groups) {
    const locationAppointments = groups[locationId];
    const noShows = locationAppointments.filter(a => a.status === "no_show").length;
    rates[locationId] = roundToTwoDecimals((noShows / locationAppointments.length) * 100);
  }
  return rates;
}

export function flagHighNoShowLocations(
  appointments: Appointment[],
  threshold: number = 20
): string[] {
  const rates = noShowRateByLocation(appointments);
  return Object.keys(rates).filter(locationId => rates[locationId] > threshold);
}

function determineCMEStatus(
  clinician: Clinician,
  asOfDate: string
): { status: CMEStatus; daysRemainingInCycle: number } {
  const cycleStart = new Date(clinician.cmeYearStartDate);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
  const asOf = new Date(asOfDate);

  const daysRemainingInCycle = daysBetween(asOfDate, cycleEnd.toISOString().split("T")[0]);

  if (clinician.cmeHoursLogged >= clinician.cmeHoursRequired) {
    return { status: "complete", daysRemainingInCycle };
  }

  if (asOf >= cycleEnd) {
    return { status: "overdue", daysRemainingInCycle };
  }

  const totalCycleDays = daysBetween(
    clinician.cmeYearStartDate,
    cycleEnd.toISOString().split("T")[0]
  );
  const daysElapsed = daysBetween(clinician.cmeYearStartDate, asOfDate);
  const expectedPercentComplete = (daysElapsed / totalCycleDays) * 100;
  const actualPercentComplete =
    clinician.cmeHoursRequired === 0
      ? 100
      : (clinician.cmeHoursLogged / clinician.cmeHoursRequired) * 100;

  if (expectedPercentComplete - actualPercentComplete > 15) {
    return { status: "at_risk", daysRemainingInCycle };
  }

  return { status: "on_track", daysRemainingInCycle };
}

export function generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[] {
  return clinicians.map(clinician => {
    const { status, daysRemainingInCycle } = determineCMEStatus(clinician, asOfDate);
    const hoursRemaining = Math.max(0, clinician.cmeHoursRequired - clinician.cmeHoursLogged);
    const percentComplete =
      clinician.cmeHoursRequired === 0
        ? 100
        : roundToOneDecimal((clinician.cmeHoursLogged / clinician.cmeHoursRequired) * 100);
    const licenceDaysRemaining = daysBetween(asOfDate, clinician.licenceExpiryDate);

    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired: clinician.cmeHoursRequired,
      hoursLogged: clinician.cmeHoursLogged,
      hoursRemaining,
      percentComplete,
      daysRemainingInCycle,
      complianceStatus: status,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining,
    };
  });
}

export function getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[] {
  const reports = generateCMEReport(clinicians, asOfDate);
  const atRiskIds = new Set(
    reports
      .filter(r => r.complianceStatus === "at_risk" || r.complianceStatus === "overdue")
      .map(r => r.clinicianId)
  );
  return clinicians.filter(c => atRiskIds.has(c.clinicianId));
}

export function getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number
): Clinician[] {
  return clinicians.filter(clinician => {
    const daysUntilExpiry = daysBetween(asOfDate, clinician.licenceExpiryDate);
    return daysUntilExpiry <= daysThreshold;
  });
}