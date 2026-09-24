import type { Claim, Clinician, ClinicianRole } from "./index";

const CLINICIAN_ROLES: readonly ClinicianRole[] = [
  "physician",
  "nurse_practitioner",
  "nurse",
  "medical_assistant",
];

export function validateClaim(
  claim: Claim,
  knownLocationIds: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (claim.claimAmount <= 0) {
    errors.push("claimAmount must be greater than 0");
  }
  if (!isValidDate(claim.submissionDate) || parseDate(claim.submissionDate) > startOfToday()) {
    errors.push("submissionDate must be a valid date that is not in the future");
  }
  if (!knownLocationIds.includes(claim.locationId)) {
    errors.push("locationId must match a known clinic ID");
  }
  if (claim.status === "denied" && claim.denialReason === undefined) {
    errors.push("denialReason is required when status is denied");
  }
  if (!/^HC-[A-Za-z0-9]{6}$/.test(claim.patientId)) {
    errors.push("patientId must match the format HC- followed by 6 alphanumeric characters");
  }
  return { valid: errors.length === 0, errors };
}

export function validateClinician(clinician: Clinician): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (clinician.cmeHoursRequired < 0) {
    errors.push("cmeHoursRequired must be greater than or equal to 0");
  }
  if (clinician.cmeHoursLogged < 0) {
    errors.push("cmeHoursLogged must be greater than or equal to 0");
  }
  if (!isValidDate(clinician.licenceExpiryDate) || parseDate(clinician.licenceExpiryDate) < startOfToday()) {
    errors.push("licenceExpiryDate must be a valid present or future date");
  }
  if (!CLINICIAN_ROLES.includes(clinician.role)) {
    errors.push("role must be one of the defined clinician roles");
  }
  return { valid: errors.length === 0, errors };
}

export function isDenialRateAboveThreshold(rate: number, threshold: number = 8): boolean {
  return rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold: number = 20): boolean {
  return rate > threshold;
}

function isValidDate(value: string): boolean {
  const dateParts: RegExpMatchArray | null = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateParts === null) {
    return false;
  }
  const date: Date = parseDate(value);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === Number(dateParts[1])
    && date.getMonth() + 1 === Number(dateParts[2])
    && date.getDate() === Number(dateParts[3]);
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function startOfToday(): Date {
  const today: Date = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
