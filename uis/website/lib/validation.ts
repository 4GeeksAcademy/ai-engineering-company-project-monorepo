import type { TranslationKey } from "./i18n";

export type YesNo = "" | "yes" | "no";

export type EnquiryValues = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  preferred_language: string;
  preferred_clinic: string;
  preferred_date: string;
  preferred_time: string;
  service_type: string;
  new_patient: YesNo;
  patient_id: string;
  has_insurance: YesNo;
  insurance_provider: string;
  insurance_member_id: string;
  health_concern: string;
  contact_consent: boolean;
};

export type EnquiryField = keyof EnquiryValues;

export type FieldError = { key: TranslationKey; remaining?: number };

export type EnquiryErrors = Partial<Record<EnquiryField, FieldError>>;

export const EMPTY_ENQUIRY: EnquiryValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  preferred_language: "",
  preferred_clinic: "",
  preferred_date: "",
  preferred_time: "",
  service_type: "",
  new_patient: "",
  patient_id: "",
  has_insurance: "",
  insurance_provider: "",
  insurance_member_id: "",
  health_concern: "",
  contact_consent: false,
};

export const MIN_CONCERN_LENGTH = 20;
export const MAX_CONCERN_LENGTH = 500;
const MAX_AGE = 120;
const MAX_DAYS_AHEAD = 60;

const NAME_PATTERN = /^[\p{L} ]{2,50}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+\d[\d\s().-]{6,}$/;
const PATIENT_ID_PATTERN = /^HC-[A-Za-z0-9]{6}$/;
const MEMBER_ID_PATTERN = /^[A-Za-z0-9]{6,20}$/;

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function getDateLimits(today: Date) {
  const minDob = new Date(today);
  minDob.setFullYear(minDob.getFullYear() - MAX_AGE);
  const maxAppointment = new Date(today);
  maxAppointment.setDate(maxAppointment.getDate() + MAX_DAYS_AHEAD);
  return {
    dobMin: toDateInputValue(minDob),
    dobMax: toDateInputValue(today),
    appointmentMin: toDateInputValue(today),
    appointmentMax: toDateInputValue(maxAppointment),
  };
}

function isValidDate(value: string): boolean {
  return Boolean(value) && !Number.isNaN(parseDateInput(value).getTime());
}

function ageOn(dateOfBirth: string, today: Date): number {
  const birth = parseDateInput(dateOfBirth);
  let years = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) years--;
  return years;
}

function isValidPreferredDate(value: string, today: Date): boolean {
  if (!isValidDate(value)) return false;
  const selected = parseDateInput(value);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + MAX_DAYS_AHEAD);
  if (selected <= today || selected > limit) return false;

  let businessDays = 0;
  const cursor = new Date(today);
  while (cursor < selected) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) businessDays++;
  }
  return businessDays >= 1;
}

export function validateEnquiry(raw: EnquiryValues, today: Date): EnquiryErrors {
  const values = Object.fromEntries(
    Object.entries(raw).map(([field, value]) => [field, typeof value === "string" ? value.trim() : value]),
  ) as EnquiryValues;
  const errors: EnquiryErrors = {};

  if (!NAME_PATTERN.test(values.first_name)) errors.first_name = { key: "errors.first_name" };
  if (!NAME_PATTERN.test(values.last_name)) errors.last_name = { key: "errors.last_name" };

  const hasDob = isValidDate(values.date_of_birth);
  const age = hasDob ? ageOn(values.date_of_birth, today) : NaN;
  if (!hasDob || age < 0 || age > MAX_AGE) errors.date_of_birth = { key: "errors.date_of_birth" };

  if (!EMAIL_PATTERN.test(values.email)) errors.email = { key: "errors.email" };
  if (!PHONE_PATTERN.test(values.phone)) errors.phone = { key: "errors.phone" };
  if (!values.preferred_language) errors.preferred_language = { key: "errors.language" };
  if (!values.preferred_clinic) errors.preferred_clinic = { key: "errors.clinic" };
  if (!isValidPreferredDate(values.preferred_date, today)) errors.preferred_date = { key: "errors.date" };
  if (!values.preferred_time) errors.preferred_time = { key: "errors.time" };

  if (!values.service_type) {
    errors.service_type = { key: "errors.service" };
  } else if (values.service_type === "paediatric" && (!hasDob || age >= 18)) {
    errors.service_type = { key: "errors.paediatric" };
  }

  if (!values.new_patient) errors.new_patient = { key: "errors.new_patient" };
  if (values.new_patient === "no" && values.patient_id && !PATIENT_ID_PATTERN.test(values.patient_id)) {
    errors.patient_id = { key: "errors.patient_id" };
  }

  if (!values.has_insurance) errors.has_insurance = { key: "errors.insurance" };
  if (values.has_insurance === "yes") {
    if (!values.insurance_provider || values.insurance_provider.length > 100) {
      errors.insurance_provider = { key: "errors.provider" };
    }
    if (!MEMBER_ID_PATTERN.test(values.insurance_member_id)) {
      errors.insurance_member_id = { key: "errors.member" };
    }
  }

  if (values.health_concern.length < MIN_CONCERN_LENGTH) {
    errors.health_concern = { key: "errors.concern", remaining: MIN_CONCERN_LENGTH - values.health_concern.length };
  }

  if (!values.contact_consent) errors.contact_consent = { key: "errors.consent" };

  return errors;
}
