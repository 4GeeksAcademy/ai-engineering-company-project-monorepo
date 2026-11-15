import type { Appointment, Claim, Clinician, Location, ServiceType } from "../types/models.js";

function fees(values: readonly [number, number, number, number, number, number, number]): Record<ServiceType, number> {
  const [primary_care, chronic_disease, preventive, specialist, womens_health, paediatric, mental_health] = values;
  return { primary_care, chronic_disease, preventive, specialist, womens_health, paediatric, mental_health };
}

export const sampleLocations: readonly Location[] = [
  {
    locationId: "us-tx-001", name: "HealthCore Austin Central", city: "Austin", stateOrCountry: "TX", country: "US", phone: "(512) 340-8800",
    averageConsultationFee: fees([180, 220, 150, 320, 240, 175, 200])
  },
  {
    locationId: "us-fl-001", name: "HealthCore Miami", city: "Miami", stateOrCountry: "FL", country: "US", phone: "(305) 510-7700",
    averageConsultationFee: fees([195, 235, 160, 340, 255, 185, 215])
  },
  {
    locationId: "us-ga-001", name: "HealthCore Atlanta", city: "Atlanta", stateOrCountry: "GA", country: "US", phone: "(404) 330-9900",
    averageConsultationFee: fees([170, 210, 145, 310, 230, 165, 190])
  }
];

export const sampleClaims: readonly Claim[] = [
  { claimId: "CLM-000001", patientId: "HC-A3F291", locationId: "us-tx-001", serviceType: "primary_care", payerName: "BlueCross", payerId: "BC001", submissionDate: "2025-03-10", claimAmount: 180, status: "approved", resubmitted: false },
  { claimId: "CLM-000002", patientId: "HC-B7K442", locationId: "us-fl-001", serviceType: "specialist", payerName: "Aetna", payerId: "AET002", submissionDate: "2025-03-11", claimAmount: 340, status: "denied", denialReason: "missing_authorisation", resubmitted: false },
  { claimId: "CLM-000003", patientId: "HC-C2M881", locationId: "us-ga-001", serviceType: "chronic_disease", payerName: "Medicare", payerId: "MED003", submissionDate: "2025-03-12", claimAmount: 210, status: "approved", resubmitted: false },
  { claimId: "CLM-000004", patientId: "HC-D9P553", locationId: "us-tx-001", serviceType: "preventive", payerName: "BlueCross", payerId: "BC001", submissionDate: "2025-03-13", claimAmount: 150, status: "denied", denialReason: "coding_error", resubmitted: true },
  { claimId: "CLM-000005", patientId: "HC-E4Q117", locationId: "us-fl-001", serviceType: "mental_health", payerName: "Cigna", payerId: "CIG004", submissionDate: "2025-03-14", claimAmount: 215, status: "pending", resubmitted: false }
];

export const sampleAppointments: readonly Appointment[] = [
  { appointmentId: "APT-000001", patientId: "HC-A3F291", locationId: "us-tx-001", serviceType: "primary_care", scheduledDate: "2025-03-10", scheduledTime: "09:00", status: "completed", confirmedAt: "2025-03-09T14:00:00Z" },
  { appointmentId: "APT-000002", patientId: "HC-F6R228", locationId: "us-fl-001", serviceType: "specialist", scheduledDate: "2025-03-11", scheduledTime: "11:30", status: "no_show", noShowReason: "Patient did not call to cancel" },
  { appointmentId: "APT-000003", patientId: "HC-G1S774", locationId: "us-tx-001", serviceType: "chronic_disease", scheduledDate: "2025-03-12", scheduledTime: "14:00", status: "no_show", noShowReason: "Unreachable before appointment" },
  { appointmentId: "APT-000004", patientId: "HC-H8T390", locationId: "us-ga-001", serviceType: "preventive", scheduledDate: "2025-03-13", scheduledTime: "10:00", status: "completed", confirmedAt: "2025-03-12T09:30:00Z" },
  { appointmentId: "APT-000005", patientId: "HC-I5U661", locationId: "us-fl-001", serviceType: "mental_health", scheduledDate: "2025-03-14", scheduledTime: "16:00", status: "no_show", noShowReason: "Transportation issue reported" }
];

export const sampleClinicians: readonly Clinician[] = [
  { clinicianId: "CLN-000001", firstName: "Marcus", lastName: "Reid", role: "physician", locationId: "us-tx-001", licenceState: "TX", licenceExpiryDate: "2026-06-30", cmeHoursRequired: 40, cmeHoursLogged: 28, cmeYearStartDate: "2025-01-01" },
  { clinicianId: "CLN-000002", firstName: "Sandra", lastName: "Flores", role: "nurse_practitioner", locationId: "us-fl-001", licenceState: "FL", licenceExpiryDate: "2025-05-15", cmeHoursRequired: 30, cmeHoursLogged: 6, cmeYearStartDate: "2025-01-01" },
  { clinicianId: "CLN-000003", firstName: "David", lastName: "Okafor", role: "physician", locationId: "us-ga-001", licenceState: "GA", licenceExpiryDate: "2027-01-01", cmeHoursRequired: 40, cmeHoursLogged: 40, cmeYearStartDate: "2025-01-01" }
];