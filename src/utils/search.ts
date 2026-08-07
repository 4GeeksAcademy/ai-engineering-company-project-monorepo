// src/utils/search.ts

import { BillingClaim, Id, Patient } from "../types/models";

export function linearSearchPatientById(
  patients: Patient[],
  id: Id
): Patient | null {
  for (const patient of patients) {
    if (patient.id === id) {
      return patient;
    }
  }
  return null;
}

export function linearSearchClaimById(
  claims: BillingClaim[],
  id: Id
): BillingClaim | null {
  for (const claim of claims) {
    if (claim.id === id) {
      return claim;
    }
  }
  return null;
}

export function binarySearchPatientIndexById(
  sortedPatients: Patient[],
  id: Id
): number {
  let low = 0;
  let high = sortedPatients.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = sortedPatients[mid].id.localeCompare(id);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}

export function binarySearchClaimIndexById(
  sortedClaims: BillingClaim[],
  id: Id
): number {
  let low = 0;
  let high = sortedClaims.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = sortedClaims[mid].id.localeCompare(id);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}