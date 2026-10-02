import type { Claim, Clinician } from "./types";

export function findClaimById(claims: Claim[], claimId: string): Claim | null {
  return claims.find((claim) => claim.claimId === claimId) ?? null;
}

export function findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null {
  return clinicians.find((clinician) => clinician.clinicianId === clinicianId) ?? null;
}

export function binarySearchClaimById(sortedClaims: Claim[], targetId: string): number {
  let low = 0;
  let high = sortedClaims.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const comparison = sortedClaims[middle].claimId.localeCompare(targetId);
    if (comparison === 0) return middle;
    if (comparison < 0) low = middle + 1;
    else high = middle - 1;
  }

  return -1;
}
