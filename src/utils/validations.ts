import { Claim, Clinician } from "../types/models";

const PATIENT_ID_REGEX = /^HC-[A-Z0-9]{6}$/;

export function validateClaim(
  claim: Claim,
  knownLocationIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (claim.claimAmount <= 0) {
    errors.push("claimAmount must be greater than 0");
  }

  const submissionDate = new Date(claim.submissionDate);
  const today = new Date();
  if (submissionDate > today) {
    errors.push("submissionDate must not be a future date");
  }

  if (!knownLocationIds.includes(claim.locationId)) {
    errors.push(`locationId '${claim.locationId}' is not a known clinic ID`);
  }

  if (claim.status === "denied" && !claim.denialReason) {
    errors.push("denialReason must be present when status is 'denied'");
  }

  if (!PATIENT_ID_REGEX.test(claim.patientId)) {
    errors.push("patientId must match format HC-XXXXXX (6 alphanumeric characters)");
  }

  return { valid: errors.length === 0, errors };
}

export function validateClinician(clinician: Clinician): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validRoles = ["physician", "nurse_practitioner", "nurse", "medical_assistant"];

  if (clinician.cmeHoursRequired < 0) {
    errors.push("cmeHoursRequired must be >= 0");
  }

  if (clinician.cmeHoursLogged < 0) {
    errors.push("cmeHoursLogged must be >= 0");
  }

  const expiryDate = new Date(clinician.licenceExpiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiryDate < today) {
    errors.push("licenceExpiryDate is in the past — licence expired");
  }

  if (!validRoles.includes(clinician.role)) {
    errors.push(`role must be one of: ${validRoles.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

export function isDenialRateAboveThreshold(rate: number, threshold: number = 8): boolean {
  return rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold: number = 20): boolean {
  return rate > threshold;
}