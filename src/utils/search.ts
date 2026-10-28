import type { Claim, Clinician } from "../types/models.js";

export function linearSearch<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean
): number {
  let index = 0;
  for (const item of items) {
    if (predicate(item, index)) return index;
    index += 1;
  }

  return -1;
}

/**
 * Searches an ascending-sorted collection using the same comparator used to sort it.
 * Returns the index of a matching item or -1 when no item matches.
 */
export function binarySearch<T>(
  items: readonly T[],
  target: T,
  compare: (item: T, target: T) => number
): number {
  let low = 0;
  let high = items.length - 1;

  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const order = compare(items[middle]!, target);

    if (order === 0) return middle;
    if (order < 0) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return -1;
}

export function findClaimById(claims: readonly Claim[], claimId: string): Claim | null {
  return claims.find((claim) => claim.claimId === claimId) ?? null;
}

export function findClinicianById(
  clinicians: readonly Clinician[],
  clinicianId: string
): Clinician | null {
  return clinicians.find((clinician) => clinician.clinicianId === clinicianId) ?? null;
}

export function binarySearchClaimById(sortedClaims: readonly Claim[], targetId: string): number {
  let low = 0;
  let high = sortedClaims.length - 1;

  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const claim = sortedClaims[middle];
    if (!claim) return -1;
    const order = claim.claimId.localeCompare(targetId);
    if (order === 0) return middle;
    if (order < 0) low = middle + 1;
    else high = middle - 1;
  }

  return -1;
}
