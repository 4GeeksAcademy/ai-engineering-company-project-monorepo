import type { Claim, Clinician } from "./index";

export function findClaimById(claims: Claim[], claimId: string): Claim | null {
  for (const claim of claims) {
    if (claim.claimId === claimId) {
      return claim;
    }
  }
  return null;
}

export function findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null {
  for (const clinician of clinicians) {
    if (clinician.clinicianId === clinicianId) {
      return clinician;
    }
  }
  return null;
}

export function binarySearchClaimById(sortedClaims: Claim[], targetId: string): number {
  let lowerBound: number = 0;
  let upperBound: number = sortedClaims.length - 1;
  while (lowerBound <= upperBound) {
    const middleIndex: number = Math.floor((lowerBound + upperBound) / 2);
    const comparison: number = sortedClaims[middleIndex].claimId.localeCompare(targetId);
    if (comparison === 0) {
      return middleIndex;
    }
    if (comparison < 0) {
      lowerBound = middleIndex + 1;
    } else {
      upperBound = middleIndex - 1;
    }
  }
  return -1;
}
