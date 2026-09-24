import {
  HEALTHCORE_US_CLINIC_NAMES,
  PATIENT_SERVICE_TYPES,
  PatientEnquiry,
  ValidationError,
  ValidationOptions,
  ValidationResult,
} from "./index";

export function validatePatientEnquiry(
  enquiry: PatientEnquiry,
  options: ValidationOptions = {},
): ValidationResult {
  const errors: ValidationError[] = [];
  const referenceDate: Date = options.referenceDate ?? new Date();

  validateName(enquiry.firstName, "firstName", "First name", errors);
  validateName(enquiry.lastName, "lastName", "Last name", errors);
  validateDateOfBirth(enquiry.dateOfBirth, errors, referenceDate);
  validateEmail(enquiry.email, errors);
  validatePhone(enquiry.phone, errors);
  validateChoice(enquiry.preferredLanguage, "preferredLanguage", "Select your preferred language", errors);
  validateClinic(enquiry.preferredClinic, errors);
  validatePreferredDate(enquiry.preferredDate, errors, referenceDate);
  validateChoice(enquiry.preferredTime, "preferredTime", "Select your preferred time of day", errors);
  validateService(enquiry.serviceType, errors);
  validatePaediatricAge(enquiry.serviceType, enquiry.dateOfBirth, errors, referenceDate);
  validateInsurance(enquiry, errors);
  validateReturningPatient(enquiry, errors);
  validateHealthConcern(enquiry.healthConcern, errors);
  if (!enquiry.contactConsent) {
    errors.push({ field: "contactConsent", message: "You must consent to being contacted before submitting this form" });
  }

  return { valid: errors.length === 0, errors };
}

export function validateClinicHours(
  clinic: { latestEveningHour: number },
  preferredTime: PatientEnquiry["preferredTime"],
): ValidationResult {
  const errors: ValidationError[] = [];
  if (preferredTime === "evening" && clinic.latestEveningHour <= 5) {
    errors.push({ field: "preferredTime", message: "The selected clinic is not open during the evening" });
  }
  return { valid: errors.length === 0, errors };
}

function validateName(value: string, field: string, label: string, errors: ValidationError[]): void {
  if (!/^[\p{L}]{2,50}$/u.test(value)) {
    errors.push({ field, message: `${label} must contain only letters and be at least 2 characters` });
  }
}

function validateDateOfBirth(value: string, errors: ValidationError[], referenceDate: Date): void {
  const birthDate: Date = parseDate(value);
  const age: number = calculateAge(birthDate, referenceDate);
  if (Number.isNaN(birthDate.getTime()) || birthDate > referenceDate || age > 120) {
    errors.push({ field: "dateOfBirth", message: "Enter a valid date of birth. Patient must be between 0 and 120 years old" });
  }
}

function validateEmail(value: string, errors: ValidationError[]): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push({ field: "email", message: "Enter a valid email address (example: name@provider.com)" });
  }
}

function validatePhone(value: string, errors: ValidationError[]): void {
  if (!/^\+\d[\d\s()-]{6,}$/.test(value)) {
    errors.push({ field: "phone", message: "Phone must include a country code (example: +1 305 555 0191)" });
  }
}

function validateChoice(value: string, field: string, message: string, errors: ValidationError[]): void {
  if (value.length === 0) {
    errors.push({ field, message });
  }
}

function validateClinic(value: string, errors: ValidationError[]): void {
  if (!HEALTHCORE_US_CLINIC_NAMES.includes(value)) {
    errors.push({ field: "preferredClinic", message: "Select the clinic you would like to visit" });
  }
}

function validatePreferredDate(value: string, errors: ValidationError[], referenceDate: Date): void {
  const preferredDate: Date = parseDate(value);
  const daysAhead: number = differenceInCalendarDays(preferredDate, referenceDate);
  const isBusinessDay: boolean = preferredDate.getDay() !== 0 && preferredDate.getDay() !== 6;
  const nextBusinessDay: Date = addBusinessDays(startOfDay(referenceDate), 1);
  if (Number.isNaN(preferredDate.getTime()) || !isBusinessDay || preferredDate < nextBusinessDay || daysAhead > 60) {
    errors.push({ field: "preferredDate", message: "Select a date at least 1 business day from today and no more than 60 days ahead" });
  }
}

function validateService(value: string, errors: ValidationError[]): void {
  if (!PATIENT_SERVICE_TYPES.includes(value as PatientEnquiry["serviceType"])) {
    errors.push({ field: "serviceType", message: "Select the type of care you are looking for" });
  }
}

function validatePaediatricAge(
  serviceType: PatientEnquiry["serviceType"],
  dateOfBirth: string,
  errors: ValidationError[],
  referenceDate: Date,
): void {
  if (serviceType === "Paediatric Care" && calculateAge(parseDate(dateOfBirth), referenceDate) >= 18) {
    errors.push({ field: "serviceType", message: "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service." });
  }
}

function validateInsurance(enquiry: PatientEnquiry, errors: ValidationError[]): void {
  if (enquiry.hasInsurance && !enquiry.insuranceProvider?.trim()) {
    errors.push({ field: "insuranceProvider", message: "Please enter your insurance provider name" });
  }
  if (enquiry.hasInsurance && !/^[a-zA-Z0-9]{6,20}$/.test(enquiry.insuranceMemberId ?? "")) {
    errors.push({ field: "insuranceMemberId", message: "Member ID must be between 6 and 20 alphanumeric characters" });
  }
}

function validateReturningPatient(enquiry: PatientEnquiry, errors: ValidationError[]): void {
  if (!enquiry.newPatient && enquiry.patientId !== undefined && !/^HC-[A-Za-z0-9]{6}$/.test(enquiry.patientId)) {
    errors.push({ field: "patientId", message: "Patient ID must use the format HC- followed by 6 alphanumeric characters" });
  }
}

function validateHealthConcern(value: string, errors: ValidationError[]): void {
  if (value.length < 20 || value.length > 500) {
    const remainingCharacters: number = Math.max(0, 20 - value.length);
    errors.push({ field: "healthConcern", message: `Please describe your health concern in at least 20 characters (${remainingCharacters} characters remaining)` });
  }
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age: number = referenceDate.getFullYear() - birthDate.getFullYear();
  const birthdayNotReached: boolean =
    referenceDate.getMonth() < birthDate.getMonth() ||
    (referenceDate.getMonth() === birthDate.getMonth() && referenceDate.getDate() < birthDate.getDate());
  if (birthdayNotReached) {
    age -= 1;
  }
  return age;
}

function differenceInCalendarDays(laterDate: Date, earlierDate: Date): number {
  const millisecondsPerDay: number = 24 * 60 * 60 * 1000;
  return Math.floor((laterDate.getTime() - earlierDate.getTime()) / millisecondsPerDay);
}

function addBusinessDays(date: Date, businessDays: number): Date {
  const result: Date = new Date(date);
  let remainingDays: number = businessDays;
  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      remainingDays -= 1;
    }
  }
  return result;
}

function startOfDay(date: Date): Date {
  const result: Date = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}