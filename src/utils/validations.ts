import type { Claim, Clinician, ValidationResult } from "../types/models";

const patientIdPattern = /^HC-[A-Za-z0-9]{6}$/;
const validClinicianRoles = new Set(["physician", "nurse_practitioner", "nurse", "medical_assistant"]);

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function parseIsoDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

export function validateClaim(claim: Claim, knownLocationIds: string[]): ValidationResult {
  const errors: string[] = [];

  if (claim.claimAmount <= 0) {
    errors.push("claimAmount must be greater than 0.");
  }

  if (!isValidDateString(claim.submissionDate)) {
    errors.push("submissionDate must be a valid ISO 8601 date string.");
  } else {
    const submissionDate = parseIsoDate(claim.submissionDate);
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (submissionDate > todayUtc) {
      errors.push("submissionDate cannot be in the future.");
    }
  }

  if (!knownLocationIds.includes(claim.locationId)) {
    errors.push("locationId must match a known clinic ID.");
  }

  if (claim.status === "denied" && !claim.denialReason) {
    errors.push("denialReason is required when status is denied.");
  }

  if (!patientIdPattern.test(claim.patientId)) {
    errors.push("patientId must follow format HC- plus 6 alphanumeric characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateClinician(clinician: Clinician): ValidationResult {
  const errors: string[] = [];

  if (clinician.cmeHoursRequired < 0) {
    errors.push("cmeHoursRequired must be greater than or equal to 0.");
  }

  if (clinician.cmeHoursLogged < 0) {
    errors.push("cmeHoursLogged must be greater than or equal to 0.");
  }

  if (!isValidDateString(clinician.licenceExpiryDate)) {
    errors.push("licenceExpiryDate must be a valid ISO 8601 date string.");
  } else {
    const expiry = parseIsoDate(clinician.licenceExpiryDate);
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (expiry < todayUtc) {
      errors.push("licenceExpiryDate cannot be in the past.");
    }
  }

  if (!validClinicianRoles.has(clinician.role)) {
    errors.push("role must be one of: physician, nurse_practitioner, nurse, medical_assistant.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isDenialRateAboveThreshold(rate: number, threshold: number = 8): boolean {
  return rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold: number = 20): boolean {
  return rate > threshold;
}
