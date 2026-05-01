import { Claim, Clinician } from "../types/models";

export function findClaimById(claims: Claim[], claimId: string): Claim | null {
  for (const claim of claims) {
    if (claim.claimId === claimId) return claim;
  }
  return null;
}

export function findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null {
  for (const clinician of clinicians) {
    if (clinician.clinicianId === clinicianId) return clinician;
  }
  return null;
}

export function binarySearchClaimById(sortedClaims: Claim[], targetId: string): number {
  let left = 0;
  let right = sortedClaims.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const comparison = sortedClaims[middle].claimId.localeCompare(targetId);

    if (comparison === 0) return middle;
    if (comparison < 0) left = middle + 1;
    else right = middle - 1;
  }
  return -1;
}