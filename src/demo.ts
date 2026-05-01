import { calculateDenialRate, denialRateByPayer, flagHighDenialPayers } from "./utils/transformations";
import { findClaimById, binarySearchClaimById } from "./utils/search";
import { sortClaimsById, filterClaims } from "./utils/collections";
import { validateClaim } from "./utils/validations";
import { Claim } from "./types/models";

const sampleClaims: Claim[] = [
  { claimId: "CLM-000001", patientId: "HC-A3F291", locationId: "us-tx-001", serviceType: "primary_care", payerName: "BlueCross", payerId: "BC001", submissionDate: "2025-03-10", claimAmount: 180, status: "approved", resubmitted: false },
  { claimId: "CLM-000002", patientId: "HC-B7K442", locationId: "us-fl-001", serviceType: "specialist", payerName: "Aetna", payerId: "AET002", submissionDate: "2025-03-11", claimAmount: 340, status: "denied", denialReason: "missing_authorisation", resubmitted: false },
  { claimId: "CLM-000003", patientId: "HC-C2M881", locationId: "us-ga-001", serviceType: "chronic_disease", payerName: "Medicare", payerId: "MED003", submissionDate: "2025-03-12", claimAmount: 210, status: "approved", resubmitted: false },
  { claimId: "CLM-000004", patientId: "HC-D9P553", locationId: "us-tx-001", serviceType: "preventive", payerName: "BlueCross", payerId: "BC001", submissionDate: "2025-03-13", claimAmount: 150, status: "denied", denialReason: "coding_error", resubmitted: true },
  { claimId: "CLM-000005", patientId: "HC-E4Q117", locationId: "us-fl-001", serviceType: "mental_health", payerName: "Cigna", payerId: "CIG004", submissionDate: "2025-03-14", claimAmount: 215, status: "pending", resubmitted: false },
];

console.log("=== Overall denial rate ===");
console.log(calculateDenialRate(sampleClaims), "(expected: 40)");

console.log("\n=== Denial rate by payer ===");
console.log(denialRateByPayer(sampleClaims));
console.log("(expected: BlueCross 50, Aetna 100, Medicare 0, Cigna 0)");

console.log("\n=== High denial payers (threshold 8) ===");
console.log(flagHighDenialPayers(sampleClaims));
console.log("(expected: BlueCross and Aetna)");

console.log("\n=== Find claim by ID ===");
console.log(findClaimById(sampleClaims, "CLM-000003")?.payerName, "(expected: Medicare)");
console.log(findClaimById(sampleClaims, "CLM-999999"), "(expected: null)");

console.log("\n=== Binary search ===");
const sorted = sortClaimsById(sampleClaims, "asc");
console.log(binarySearchClaimById(sorted, "CLM-000003"), "(expected: 2)");
console.log(binarySearchClaimById(sorted, "CLM-999999"), "(expected: -1)");

console.log("\n=== Filter claims (denied) ===");
console.log(filterClaims(sampleClaims, { status: "denied" }).length, "(expected: 2)");

console.log("\n=== Validate a good claim ===");
console.log(validateClaim(sampleClaims[0]!, ["us-tx-001", "us-fl-001", "us-ga-001"]));
console.log("(expected: { valid: true, errors: [] })");