import {
  CLINICS,
  APPOINTMENT_STATUSES,
  CLAIM_STATUSES,
  CLINICIAN_ROLES,
  DENIAL_REASONS,
  OPERATIONAL_SERVICE_TYPES,
  PATIENT_SERVICE_TYPES,
  type Clinic,
  type Claim,
  type Clinician,
  type PatientEnquiryField,
  type ValidationLanguage
} from "../types/models.js";

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: Partial<Record<PatientEnquiryField, string>>;
  readonly warnings: string[];
}

interface ValidationMessages {
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly email: string;
  readonly phone: string;
  readonly language: string;
  readonly clinic: string;
  readonly date: string;
  readonly time: string;
  readonly service: string;
  readonly paediatric: string;
  readonly newPatient: string;
  readonly insuranceChoice: string;
  readonly insuranceProvider: string;
  readonly insuranceProviderTooLong: string;
  readonly memberId: string;
  readonly patientId: string;
  readonly healthConcern: (remaining: number) => string;
  readonly healthConcernTooLong: string;
  readonly consent: string;
  readonly limitedHours: string;
}

const MESSAGES: Record<ValidationLanguage, ValidationMessages> = {
  en: {
    firstName: "First name must contain only letters and be at least 2 characters",
    lastName: "Last name must contain only letters and be at least 2 characters",
    dateOfBirth: "Enter a valid date of birth. Patient must be between 0 and 120 years old",
    email: "Enter a valid email address (example: name@provider.com)",
    phone: "Phone must include a country code (example: +1 305 555 0191)",
    language: "Select your preferred language",
    clinic: "Select the clinic you would like to visit",
    date: "Select a date at least 1 business day from today and no more than 60 days ahead",
    time: "Select your preferred time of day",
    service: "Select the type of care you are looking for",
    paediatric: "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.",
    newPatient: "Please indicate whether this is your first visit to HealthCore",
    insuranceChoice: "Please indicate whether you have health insurance",
    insuranceProvider: "Please enter your insurance provider name",
    insuranceProviderTooLong: "Insurance provider must be 100 characters or fewer",
    memberId: "Member ID must be between 6 and 20 alphanumeric characters",
    patientId: "Patient ID must be HC- followed by 6 alphanumeric characters",
    healthConcern: (remaining) => `Please describe your health concern in at least 20 characters (${remaining} characters remaining)`,
    healthConcernTooLong: "Please keep your health concern to 500 characters or fewer",
    consent: "You must consent to being contacted before submitting this form",
    limitedHours: "Evening availability may be limited because this clinic closes before 8pm. Our team will confirm."
  },
  es: {
    firstName: "El nombre debe contener solo letras y tener al menos 2 caracteres",
    lastName: "El apellido debe contener solo letras y tener al menos 2 caracteres",
    dateOfBirth: "Introduce una fecha de nacimiento válida. La persona debe tener entre 0 y 120 años",
    email: "Introduce un correo electrónico válido (ejemplo: nombre@proveedor.com)",
    phone: "El teléfono debe incluir el código de país (ejemplo: +1 305 555 0191)",
    language: "Selecciona tu idioma preferido",
    clinic: "Selecciona la clínica que deseas visitar",
    date: "Selecciona una fecha al menos 1 día hábil desde hoy y dentro de los próximos 60 días",
    time: "Selecciona tu horario preferido",
    service: "Selecciona el tipo de atención que necesitas",
    paediatric: "La atención pediátrica es para menores de 18 años. Revisa la fecha de nacimiento o selecciona otro servicio.",
    newPatient: "Indica si esta es tu primera visita a HealthCore",
    insuranceChoice: "Indica si tienes seguro médico",
    insuranceProvider: "Introduce el nombre de tu aseguradora",
    insuranceProviderTooLong: "El nombre de la aseguradora debe tener 100 caracteres o menos",
    memberId: "El número de afiliación debe tener entre 6 y 20 caracteres alfanuméricos",
    patientId: "El ID de paciente debe comenzar con HC- seguido de 6 caracteres alfanuméricos",
    healthConcern: (remaining) => `Describe tu necesidad de atención en al menos 20 caracteres (${remaining} caracteres restantes)`,
    healthConcernTooLong: "Describe tu necesidad de atención en 500 caracteres o menos",
    consent: "Debes aceptar que nos pongamos en contacto contigo para enviar este formulario",
    limitedHours: "La disponibilidad por la tarde puede ser limitada porque esta clínica cierra antes de las 20:00. Nuestro equipo lo confirmará."
  }
};

const NAME_PATTERN = /^\p{L}{2,50}$/u;
const PHONE_PATTERN = /^\+\d{1,3}(?:[ .()-]?\d){6,14}$/;
const MEMBER_ID_PATTERN = /^[A-Za-z0-9]{6,20}$/;
const CLAIM_PATIENT_ID_PATTERN = /^HC-[A-Za-z0-9]{6}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SERVICE_SET = new Set<string>(PATIENT_SERVICE_TYPES);
const CLINIC_BY_NAME = new Map<string, Clinic>(
  CLINICS.map((clinic) => [clinic.name, clinic])
);

const CLAIM_ID_PATTERN = /^CLM-\d{6}$/;
const PATIENT_ID_PATTERN = /^HC-[A-Za-z0-9]{6}$/;
const CLINICIAN_ID_PATTERN = /^CLN-\d{6}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface BusinessValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function businessResult(errors: string[]): BusinessValidationResult {
  return { valid: errors.length === 0, errors };
}

export function validateClaim(
  claim: Claim,
  knownLocationIds: readonly string[],
  asOfDate = new Date().toISOString().slice(0, 10)
): BusinessValidationResult {
  const errors: string[] = [];
  if (!CLAIM_ID_PATTERN.test(claim.claimId)) errors.push("claimId must match CLM- followed by 6 digits");
  if (!CLAIM_PATIENT_ID_PATTERN.test(claim.patientId)) errors.push("patientId must match HC- followed by 6 alphanumeric characters");
  if (!knownLocationIds.includes(claim.locationId)) errors.push("locationId must match a known clinic ID");
  if (!OPERATIONAL_SERVICE_TYPES.includes(claim.serviceType)) errors.push("serviceType is not supported");
  if (!claim.payerName.trim()) errors.push("payerName is required");
  if (!/^[A-Za-z0-9]+$/.test(claim.payerId)) errors.push("payerId must be alphanumeric");
  if (!CLAIM_STATUSES.includes(claim.status)) errors.push("status is not supported");
  if (!Number.isFinite(claim.claimAmount) || claim.claimAmount <= 0) errors.push("claimAmount must be greater than 0");
  if (!isValidIsoDate(claim.submissionDate)) {
    errors.push("submissionDate must be a valid ISO 8601 calendar date");
  } else if (!isValidIsoDate(asOfDate) || claim.submissionDate > asOfDate) {
    errors.push("submissionDate must not be in the future");
  }
  if (claim.status === "denied" && !claim.denialReason) {
    errors.push("denialReason is required for denied claims");
  } else if (claim.denialReason && !DENIAL_REASONS.includes(claim.denialReason)) {
    errors.push("denialReason is not supported");
  }
  if (typeof claim.resubmitted !== "boolean") errors.push("resubmitted must be a boolean");
  return businessResult(errors);
}

export function validateClinician(
  clinician: Clinician,
  knownLocationIds: readonly string[] = ["us-tx-001", "us-fl-001", "us-ga-001"],
  asOfDate = new Date().toISOString().slice(0, 10)
): BusinessValidationResult {
  const errors: string[] = [];
  if (!CLINICIAN_ID_PATTERN.test(clinician.clinicianId)) errors.push("clinicianId must match CLN- followed by 6 digits");
  if (!clinician.firstName.trim()) errors.push("firstName is required");
  if (!clinician.lastName.trim()) errors.push("lastName is required");
  if (!CLINICIAN_ROLES.includes(clinician.role)) errors.push("role is not supported");
  if (!knownLocationIds.includes(clinician.locationId)) errors.push("locationId must match a known clinic ID");
  if (!clinician.licenceState.trim()) errors.push("licenceState is required");
  if (!isValidIsoDate(clinician.licenceExpiryDate)) {
    errors.push("licenceExpiryDate must be a valid ISO 8601 calendar date");
  } else if (!isValidIsoDate(asOfDate) || clinician.licenceExpiryDate < asOfDate) {
    errors.push("licenceExpiryDate is expired");
  }
  if (!Number.isFinite(clinician.cmeHoursRequired) || clinician.cmeHoursRequired < 0) errors.push("cmeHoursRequired must be at least 0");
  if (!Number.isFinite(clinician.cmeHoursLogged) || clinician.cmeHoursLogged < 0) errors.push("cmeHoursLogged must be at least 0");
  if (!isValidIsoDate(clinician.cmeYearStartDate)) errors.push("cmeYearStartDate must be a valid ISO 8601 calendar date");
  return businessResult(errors);
}

export function isDenialRateAboveThreshold(rate: number, threshold = 8): boolean {
  return Number.isFinite(rate) && Number.isFinite(threshold) && rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold = 20): boolean {
  return Number.isFinite(rate) && Number.isFinite(threshold) && rate > threshold;
}

function parseDate(value: string): Date | undefined {
  if (!DATE_PATTERN.test(value)) return undefined;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function ageOn(birthDate: Date, currentDate: Date): number {
  let age = currentDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    currentDate.getUTCMonth() < birthDate.getUTCMonth() ||
    (currentDate.getUTCMonth() === birthDate.getUTCMonth() &&
      currentDate.getUTCDate() < birthDate.getUTCDate());

  if (beforeBirthday) age -= 1;
  return age;
}

function earliestAppointmentDate(today: Date): Date {
  const firstPossibleDate = new Date(today);
  firstPossibleDate.setUTCDate(firstPossibleDate.getUTCDate() + 1);

  while (
    firstPossibleDate.getUTCDay() === 0 ||
    firstPossibleDate.getUTCDay() === 6
  ) {
    firstPossibleDate.setUTCDate(firstPossibleDate.getUTCDate() + 1);
  }

  return firstPossibleDate;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isYesNo(value: string): boolean {
  return value === "yes" || value === "no";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePatientEnquiry(
  input: unknown,
  language: ValidationLanguage = "en",
  now: Date = new Date()
): ValidationResult {
  if (language !== "en" && language !== "es") {
    throw new RangeError("Validation language must be 'en' or 'es'");
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("Validation reference date must be valid");
  }

  const messages = MESSAGES[language];
  const errors: Partial<Record<PatientEnquiryField, string>> = {};
  const warnings: string[] = [];
  const enquiry = isRecord(input) ? input : {};
  const text = (field: PatientEnquiryField): string => {
    const value = enquiry[field];
    return typeof value === "string" ? value : "";
  };

  const firstName = text("first_name");
  const lastName = text("last_name");
  const birthDateValue = text("date_of_birth");
  const email = text("email");
  const phone = text("phone");
  const preferredLanguage = text("preferred_language");
  const preferredClinic = text("preferred_clinic");
  const preferredDate = text("preferred_date");
  const preferredTime = text("preferred_time");
  const serviceType = text("service_type");
  const newPatient = text("new_patient");
  const hasInsurance = text("has_insurance");

  if (!NAME_PATTERN.test(firstName.trim().normalize("NFC"))) {
    errors.first_name = messages.firstName;
  }
  if (!NAME_PATTERN.test(lastName.trim().normalize("NFC"))) {
    errors.last_name = messages.lastName;
  }

  const today = startOfLocalDay(now);
  const birthDate = parseDate(birthDateValue);
  const age = birthDate ? ageOn(birthDate, today) : undefined;
  if (age === undefined || age < 0 || age > 120) {
    errors.date_of_birth = messages.dateOfBirth;
  }

  if (!isValidEmail(email.trim())) errors.email = messages.email;
  if (!PHONE_PATTERN.test(phone.trim())) errors.phone = messages.phone;

  if (preferredLanguage !== "English" && preferredLanguage !== "Spanish") {
    errors.preferred_language = messages.language;
  }

  const clinic = CLINIC_BY_NAME.get(preferredClinic);
  if (!clinic) errors.preferred_clinic = messages.clinic;

  const appointmentDate = parseDate(preferredDate);
  const firstAppointmentDate = earliestAppointmentDate(today);
  const lastAppointmentDate = new Date(today);
  lastAppointmentDate.setUTCDate(lastAppointmentDate.getUTCDate() + 60);
  if (
    !appointmentDate ||
    appointmentDate < firstAppointmentDate ||
    appointmentDate > lastAppointmentDate
  ) {
    errors.preferred_date = messages.date;
  }

  if (preferredTime !== "morning" && preferredTime !== "afternoon" && preferredTime !== "evening") {
    errors.preferred_time = messages.time;
  }

  if (!SERVICE_SET.has(serviceType)) {
    errors.service_type = messages.service;
  } else if (serviceType === "Paediatric Care" && (age === undefined || age >= 18)) {
    errors.service_type = messages.paediatric;
  }

  if (!isYesNo(newPatient)) errors.new_patient = messages.newPatient;
  if (!isYesNo(hasInsurance)) errors.has_insurance = messages.insuranceChoice;

  if (hasInsurance === "yes") {
    const provider = text("insurance_provider").trim();
    if (!provider) {
      errors.insurance_provider = messages.insuranceProvider;
    } else if (provider.length > 100) {
      errors.insurance_provider = messages.insuranceProviderTooLong;
    }

    if (!MEMBER_ID_PATTERN.test(text("insurance_member_id").trim())) {
      errors.insurance_member_id = messages.memberId;
    }
  }

  if (newPatient === "no") {
    const patientId = enquiry.patient_id;
    if (
      patientId !== undefined &&
      (typeof patientId !== "string" ||
        (patientId.trim() !== "" && !PATIENT_ID_PATTERN.test(patientId.trim())))
    ) {
      errors.patient_id = messages.patientId;
    }
  }

  const concernLength = text("health_concern").trim().length;
  if (concernLength < 20) {
    errors.health_concern = messages.healthConcern(Math.max(0, 20 - concernLength));
  } else if (concernLength > 500) {
    errors.health_concern = messages.healthConcernTooLong;
  }
  if (enquiry.contact_consent !== true) errors.contact_consent = messages.consent;

  if (clinic && preferredTime === "evening") {
    const closingTime = clinic.openingHours.weekdays.closesAt;
    if (closingTime > "17:00" && closingTime < "20:00") {
      warnings.push(messages.limitedHours);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
