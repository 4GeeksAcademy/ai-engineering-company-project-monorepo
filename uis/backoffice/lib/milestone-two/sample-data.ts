import type { Appointment, Claim, Clinician, Location, ServiceType } from "./types";

const serviceTypes: ServiceType[] = [
  "primary_care", "chronic_disease", "preventive", "specialist", "womens_health", "paediatric", "mental_health",
];

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const sampleLocations: Location[] = [
  {
    locationId: "us-tx-001", name: "HealthCore Austin Central", city: "Austin", stateOrCountry: "TX", country: "US", phone: "Not specified",
    averageConsultationFee: { primary_care: 180, chronic_disease: 220, preventive: 150, specialist: 320, womens_health: 240, paediatric: 175, mental_health: 200 },
  },
  {
    locationId: "us-fl-001", name: "HealthCore Miami", city: "Miami", stateOrCountry: "FL", country: "US", phone: "Not specified",
    averageConsultationFee: { primary_care: 195, chronic_disease: 235, preventive: 160, specialist: 340, womens_health: 255, paediatric: 185, mental_health: 215 },
  },
  {
    locationId: "us-ga-001", name: "HealthCore Atlanta", city: "Atlanta", stateOrCountry: "GA", country: "US", phone: "Not specified",
    averageConsultationFee: { primary_care: 170, chronic_disease: 210, preventive: 145, specialist: 310, womens_health: 230, paediatric: 165, mental_health: 190 },
  },
];

// Synthetic demonstration records only; these are not patient or workforce records.
export const sampleClaims: Claim[] = [
  { claimId: "CLM-000001", patientId: "HC-A3F291", locationId: "us-tx-001", serviceType: "primary_care", payerName: "BlueCross", payerId: "BC001", submissionDate: dateOffset(-12), claimAmount: 180, status: "approved", resubmitted: false },
  { claimId: "CLM-000002", patientId: "HC-B7K442", locationId: "us-fl-001", serviceType: "specialist", payerName: "Aetna", payerId: "AET002", submissionDate: dateOffset(-11), claimAmount: 340, status: "denied", denialReason: "missing_authorisation", resubmitted: false },
  { claimId: "CLM-000003", patientId: "HC-C2M881", locationId: "us-ga-001", serviceType: "chronic_disease", payerName: "Medicare", payerId: "MED003", submissionDate: dateOffset(-10), claimAmount: 210, status: "approved", resubmitted: false },
  { claimId: "CLM-000004", patientId: "HC-D9P553", locationId: "us-tx-001", serviceType: "preventive", payerName: "BlueCross", payerId: "BC001", submissionDate: dateOffset(-9), claimAmount: 150, status: "denied", denialReason: "coding_error", resubmitted: true },
  { claimId: "CLM-000005", patientId: "HC-E4Q117", locationId: "us-fl-001", serviceType: "mental_health", payerName: "Cigna", payerId: "CIG004", submissionDate: dateOffset(-8), claimAmount: 215, status: "pending", resubmitted: false },
  { claimId: "CLM-000006", patientId: "HC-F6R228", locationId: "us-ga-001", serviceType: "primary_care", payerName: "Aetna", payerId: "AET002", submissionDate: dateOffset(-7), claimAmount: 170, status: "denied", denialReason: "incomplete_documentation", resubmitted: false },
  { claimId: "CLM-000007", patientId: "HC-G1S774", locationId: "us-tx-001", serviceType: "specialist", payerName: "Medicare", payerId: "MED003", submissionDate: dateOffset(-6), claimAmount: 320, status: "approved", resubmitted: false },
  { claimId: "CLM-000008", patientId: "HC-H8T390", locationId: "us-fl-001", serviceType: "preventive", payerName: "BlueCross", payerId: "BC001", submissionDate: dateOffset(-5), claimAmount: 160, status: "submitted", resubmitted: false },
];

export const sampleAppointments: Appointment[] = sampleLocations.flatMap((location, locationIndex) =>
  Array.from({ length: 8 }, (_, index): Appointment => {
    const status = (index + locationIndex) % 4 === 0 ? "no_show" : (index + locationIndex) % 5 === 0 ? "cancelled" : "completed";
    const serviceType = serviceTypes[(index + locationIndex) % serviceTypes.length];
    return {
      appointmentId: `APT-${String(locationIndex * 8 + index + 1).padStart(6, "0")}`,
      patientId: `HC-${String.fromCharCode(65 + ((index + locationIndex) % 26))}${String(index + 1).padStart(5, "0")}`,
      locationId: location.locationId,
      serviceType,
      scheduledDate: dateOffset(-((index % 7) + 1)),
      scheduledTime: `${String(9 + (index % 8)).padStart(2, "0")}:00`,
      status,
      ...(status === "no_show" ? { noShowReason: "Synthetic demonstration reason" } : {}),
    };
  }),
);

const cmeYearStartDate = `${new Date().getUTCFullYear()}-01-01`;
export const sampleClinicians: Clinician[] = [
  { clinicianId: "CLN-000001", firstName: "Alex", lastName: "Morgan", role: "physician", locationId: "us-tx-001", licenceState: "TX", licenceExpiryDate: dateOffset(120), cmeHoursRequired: 40, cmeHoursLogged: 18, cmeYearStartDate },
  { clinicianId: "CLN-000002", firstName: "Jordan", lastName: "Lee", role: "nurse_practitioner", locationId: "us-fl-001", licenceState: "FL", licenceExpiryDate: dateOffset(45), cmeHoursRequired: 30, cmeHoursLogged: 24, cmeYearStartDate },
  { clinicianId: "CLN-000003", firstName: "Taylor", lastName: "Reed", role: "nurse", locationId: "us-ga-001", licenceState: "GA", licenceExpiryDate: dateOffset(20), cmeHoursRequired: 20, cmeHoursLogged: 16, cmeYearStartDate },
];

export function getReportingDate(): string {
  return dateOffset(0);
}
