// src/data/sampleData.ts

import {
  Appointment,
  BillingClaim,
  Clinic,
  ClinicalStaff,
  ComplianceTraining,
  Patient,
} from "../types/models";

export const clinics: Clinic[] = [
  { id: "clinic-1", name: "Austin Central", country: "US", city: "Austin", region: "Texas" },
  { id: "clinic-2", name: "Miami Beach", country: "US", city: "Miami", region: "Florida" },
  { id: "clinic-3", name: "London Bridge", country: "UK", city: "London", region: "Greater London" },
];

export const patients: Patient[] = [
  { id: "patient-1", firstName: "Ana", lastName: "Ruiz", email: "ana.ruiz@example.com", country: "US", clinicId: "clinic-1", dateOfBirth: "1988-02-11" },
  { id: "patient-2", firstName: "Sam", lastName: "Wren", email: "sam.wren@example.com", country: "UK", clinicId: "clinic-3", dateOfBirth: "1975-09-03" },
  { id: "patient-3", firstName: "Priya", lastName: "Shah", email: "priya.shah@example.com", country: "US", clinicId: "clinic-2", dateOfBirth: "1993-06-21" },
];

export const staff: ClinicalStaff[] = [
  { id: "staff-1", firstName: "Marcus", lastName: "Reid", role: "physician", clinicId: "clinic-1", country: "US", continuingEducationHoursCompleted: 18, continuingEducationHoursRequired: 20, licenseExpirationDate: "2027-01-15" },
  { id: "staff-2", firstName: "Grace", lastName: "Lin", role: "nurse-practitioner", clinicId: "clinic-3", country: "UK", continuingEducationHoursCompleted: 22, continuingEducationHoursRequired: 20, licenseExpirationDate: "2027-05-01" },
];

export const appointments: Appointment[] = [
  { id: "appt-1", patientId: "patient-1", clinicId: "clinic-1", staffId: "staff-1", scheduledDate: "2026-08-10", type: "primary-care", status: "scheduled" },
  { id: "appt-2", patientId: "patient-2", clinicId: "clinic-3", staffId: "staff-2", scheduledDate: "2026-08-05", type: "specialist", status: "no-show" },
  { id: "appt-3", patientId: "patient-3", clinicId: "clinic-2", staffId: "staff-1", scheduledDate: "2026-07-20", type: "preventive", status: "completed" },
];

export const claims: BillingClaim[] = [
  { id: "claim-1", patientId: "patient-1", appointmentId: "appt-1", country: "US", payerType: "commercial", amount: 240, status: "paid", submittedDate: "2026-08-11" },
  { id: "claim-2", patientId: "patient-3", appointmentId: "appt-3", country: "US", payerType: "medicaid", amount: 180, status: "denied", denialReason: "Missing prior authorization", submittedDate: "2026-07-21" },
  { id: "claim-3", patientId: "patient-2", appointmentId: "appt-2", country: "UK", payerType: "nhs", amount: 90, status: "pending", submittedDate: "2026-08-06" },
];

export const complianceTrainings: ComplianceTraining[] = [
  { id: "training-1", employeeId: "staff-1", employeeName: "Marcus Reid", framework: "HIPAA", trainingName: "Annual HIPAA Refresher", completedDate: "2026-01-10", dueDate: "2026-01-31", status: "completed" },
  { id: "training-2", employeeId: "staff-2", employeeName: "Grace Lin", framework: "UK-GDPR", trainingName: "GDPR Data Handling", completedDate: null, dueDate: "2026-09-01", status: "pending" },
];