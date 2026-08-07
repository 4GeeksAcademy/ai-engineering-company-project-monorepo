// src/demo.ts

import { appointments, claims, patients, staff } from "./data/sampleData";
import {
  filterAppointmentsByStatus,
  filterAppointmentsByCriteria,
  filterClaimsByStatus,
  sortAppointmentsByDate,
  sortClaimsByAmount,
} from "./utils/collections";
import {
  binarySearchPatientIndexById,
  linearSearchClaimById,
  linearSearchPatientById,
} from "./utils/search";
import {
  calculateAverageCEHoursCompleted,
  calculateDenialRate,
  calculateNoShowRate,
  calculateTotalClaimAmount,
  countAppointmentsByStatus,
  getMaxClaimAmount,
} from "./utils/transformations";
import {
  isValidAppointmentRecord,
  isValidBillingClaim,
  isValidPatientRecord,
} from "./utils/validations";

console.log("--- Filtering ---");
console.log("No-show appointments:", filterAppointmentsByStatus(appointments, "no-show"));
console.log("Scheduled at clinic 1:", filterAppointmentsByCriteria(appointments, { status: "scheduled", clinicId: "clinic-1" }));
console.log("Denied claims:", filterClaimsByStatus(claims, "denied"));

console.log("\n--- Sorting ---");
console.log("Appointments by date (asc):", sortAppointmentsByDate(appointments, "asc").map((a) => a.scheduledDate));
console.log("Claims by amount (desc):", sortClaimsByAmount(claims, "desc").map((c) => c.amount));

console.log("\n--- Search ---");
console.log("Linear search patient-2:", linearSearchPatientById(patients, "patient-2"));
console.log("Binary search patient-2, index:", binarySearchPatientIndexById(patients, "patient-2"));
console.log("Linear search claim-99 (not found):", linearSearchClaimById(claims, "claim-99"));

console.log("\n--- Aggregations ---");
console.log("No-show rate:", calculateNoShowRate(appointments).toFixed(1) + "%");
console.log("Denial rate:", calculateDenialRate(claims).toFixed(1) + "%");
console.log("Total claim amount:", calculateTotalClaimAmount(claims));
console.log("Max claim amount:", getMaxClaimAmount(claims));
console.log("Average CE hours completed:", calculateAverageCEHoursCompleted(staff));
console.log("Appointments by status:", countAppointmentsByStatus(appointments));

console.log("\n--- Validations ---");
console.log("Is patient 1 valid?", isValidPatientRecord(patients[0]));
console.log("Is appointment 1 valid?", isValidAppointmentRecord(appointments[0]));
console.log("Is claim 2 (denied) valid?", isValidBillingClaim(claims[1]));