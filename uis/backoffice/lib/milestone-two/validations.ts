import type { Appointment, Claim, Clinician } from "./types";
import { DENIAL_RATE_ALERT_THRESHOLD, NO_SHOW_RATE_ALERT_THRESHOLD } from "./business-rules";

const clinicianRoles = new Set(["physician", "nurse_practitioner", "nurse", "medical_assistant"]);
const patientIdPattern = /^HC-[A-Z0-9]{6}$/;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateClaim(claim: Claim, knownLocationIds: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!(claim.claimAmount > 0)) errors.push("claimAmount must be greater than 0.");
  if (!isValidDate(claim.submissionDate)) errors.push("submissionDate must be a valid ISO 8601 date.");
  else if (claim.submissionDate > new Date().toISOString().slice(0, 10)) errors.push("submissionDate must not be in the future.");
  if (!knownLocationIds.includes(claim.locationId)) errors.push("locationId must match a known clinic.");
  if (claim.status === "denied" && !claim.denialReason) errors.push("denialReason is required for denied claims.");
  if (!patientIdPattern.test(claim.patientId)) errors.push("patientId must match HC- followed by 6 alphanumeric characters.");
  return { valid: errors.length === 0, errors };
}

export function validateClinician(clinician: Clinician): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Number.isFinite(clinician.cmeHoursRequired) || clinician.cmeHoursRequired < 0) errors.push("cmeHoursRequired must be >= 0.");
  if (!Number.isFinite(clinician.cmeHoursLogged) || clinician.cmeHoursLogged < 0) errors.push("cmeHoursLogged must be >= 0.");
  if (!isValidDate(clinician.licenceExpiryDate)) errors.push("licenceExpiryDate must be a valid ISO 8601 date.");
  else if (clinician.licenceExpiryDate < new Date().toISOString().slice(0, 10)) errors.push("Licence is expired.");
  if (!clinicianRoles.has(clinician.role)) errors.push("role must be one of the supported clinician roles.");
  if (!isValidDate(clinician.cmeYearStartDate)) errors.push("cmeYearStartDate must be a valid ISO 8601 date.");
  return { valid: errors.length === 0, errors };
}

export function validateAppointment(
  appointment: Appointment,
  knownLocationIds: string[],
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(appointment.scheduledTime)) {
    errors.push('scheduledTime must be a valid 24-hour time in "HH:MM" format.');
  }
  if (!knownLocationIds.includes(appointment.locationId)) errors.push("locationId must match a known clinic.");
  if (appointment.status === "no_show" && !appointment.noShowReason?.trim()) {
    warnings.push("noShowReason is recommended for no-show appointments.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function isDenialRateAboveThreshold(rate: number, threshold = DENIAL_RATE_ALERT_THRESHOLD): boolean {
  return rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold = NO_SHOW_RATE_ALERT_THRESHOLD): boolean {
  return rate > threshold;
}
