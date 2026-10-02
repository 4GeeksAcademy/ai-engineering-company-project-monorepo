const fullNameRegex = /^\s*\S+\s+\S+/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+(57|1)\s[0-9][0-9\s-]{6,}$/;

export type FormErrors = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  howFound: string;
  dob: string;
  terms: string;
};

export const emptyErrors: FormErrors = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  howFound: "",
  dob: "",
  terms: "",
};

export function validateStep1(data: {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
}): Partial<FormErrors> {
  const errors: Partial<FormErrors> = {};

  if (!fullNameRegex.test(data.fullName.trim())) {
    errors.fullName =
      "Enter your full name (first and last name)";
  }
  if (!emailRegex.test(data.email.trim())) {
    errors.email = "Enter a valid email (example: name@email.com)";
  }
  if (!phoneRegex.test(data.phone.trim())) {
    errors.phone =
      "Phone must include country code (example: +57 300 123 4567 or +1 305 123 4567)";
  }
  if (!data.country) {
    errors.country = "Select your country";
  }
  if (!data.city) {
    errors.city = "Select your city";
  }

  return errors;
}

export function validateStep2(data: {
  howFound: string;
  dob: string;
  terms: boolean;
}): Partial<FormErrors> {
  const errors: Partial<FormErrors> = {};

  if (!data.howFound) {
    errors.howFound = "Tell us how you found Brasaland";
  }
  if (!isAdult(data.dob)) {
    errors.dob = "You must be 18 or older to register for Brasa Points";
  }
  if (!data.terms) {
    errors.terms =
      "You must accept the Brasa Points program terms to continue";
  }

  return errors;
}

export function isAdult(dateValue: string): boolean {
  if (!dateValue) return false;

  const dob = new Date(dateValue);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

export function maxDobForAdults(): string {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 18);
  return today.toISOString().split("T")[0];
}
