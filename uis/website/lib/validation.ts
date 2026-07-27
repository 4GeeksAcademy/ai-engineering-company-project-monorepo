import { clinicClosingHour } from "@/lib/content";

export interface EnquiryFormValues {
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
  new_patient: string;
  has_insurance: string;
  insurance_provider: string;
  insurance_member_id: string;
  patient_id: string;
  health_concern: string;
  contact_consent: boolean;
}

export type FormErrors = Partial<Record<keyof EnquiryFormValues | "paediatric" | "timeClinic", string>>;

const alphaRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,50}$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+\d{1,3}(?:[\s-]?\d){6,20}$/;
const memberIdRegex = /^[A-Za-z0-9]{6,20}$/;
const patientIdRegex = /^HC-[A-Za-z0-9]{6}$/;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

function getAge(dob: Date, today: Date): number {
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

type ErrorMessages = {
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
  paediatric: string;
  new_patient: string;
  has_insurance: string;
  insurance_provider: string;
  insurance_member_id: string;
  health_concern: (remaining: number) => string;
  contact_consent: string;
  patient_id: string;
  timeClinicWarning: string;
};

export function validateEnquiryForm(
  values: EnquiryFormValues,
  errors: ErrorMessages
): { valid: boolean; fieldErrors: FormErrors; warning?: string } {
  const fieldErrors: FormErrors = {};
  const today = startOfDay(new Date());

  if (!alphaRegex.test(values.first_name)) fieldErrors.first_name = errors.first_name;
  if (!alphaRegex.test(values.last_name)) fieldErrors.last_name = errors.last_name;

  if (!values.date_of_birth) {
    fieldErrors.date_of_birth = errors.date_of_birth;
  } else {
    const dob = startOfDay(new Date(values.date_of_birth));
    const age = getAge(dob, today);
    if (dob > today || age < 0 || age > 120) fieldErrors.date_of_birth = errors.date_of_birth;
  }

  if (!emailRegex.test(values.email)) fieldErrors.email = errors.email;
  if (!phoneRegex.test(values.phone.trim())) fieldErrors.phone = errors.phone;
  if (!values.preferred_language) fieldErrors.preferred_language = errors.preferred_language;
  if (!values.preferred_clinic) fieldErrors.preferred_clinic = errors.preferred_clinic;

  if (!values.preferred_date) {
    fieldErrors.preferred_date = errors.preferred_date;
  } else {
    const preferred = startOfDay(new Date(values.preferred_date));
    const minDate = addBusinessDays(today, 1);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    if (preferred < minDate || preferred > maxDate) fieldErrors.preferred_date = errors.preferred_date;
  }

  if (!values.preferred_time) fieldErrors.preferred_time = errors.preferred_time;
  if (!values.service_type) fieldErrors.service_type = errors.service_type;
  if (!values.new_patient) fieldErrors.new_patient = errors.new_patient;
  if (!values.has_insurance) fieldErrors.has_insurance = errors.has_insurance;

  if (values.has_insurance === "Yes") {
    if (!values.insurance_provider.trim()) fieldErrors.insurance_provider = errors.insurance_provider;
    if (!memberIdRegex.test(values.insurance_member_id.trim()))
      fieldErrors.insurance_member_id = errors.insurance_member_id;
  }

  if (values.new_patient === "No" && values.patient_id.trim() && !patientIdRegex.test(values.patient_id.trim())) {
    fieldErrors.patient_id = errors.patient_id;
  }

  const concernLen = values.health_concern.trim().length;
  if (concernLen < 20) {
    fieldErrors.health_concern = errors.health_concern(20 - concernLen);
  }

  if (!values.contact_consent) fieldErrors.contact_consent = errors.contact_consent;

  if (
    values.service_type === "Paediatric Care" &&
    values.date_of_birth &&
    !fieldErrors.date_of_birth
  ) {
    const age = getAge(startOfDay(new Date(values.date_of_birth)), today);
    if (age >= 18) fieldErrors.paediatric = errors.paediatric;
  }

  let warning: string | undefined;
  if (
    values.preferred_time === "Evening (5pm–8pm)" &&
    values.preferred_clinic &&
    (clinicClosingHour[values.preferred_clinic] ?? 20) < 20
  ) {
    warning = errors.timeClinicWarning;
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors, warning };
}

export const emptyFormValues: EnquiryFormValues = {
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
  has_insurance: "",
  insurance_provider: "",
  insurance_member_id: "",
  patient_id: "",
  health_concern: "",
  contact_consent: false,
};
