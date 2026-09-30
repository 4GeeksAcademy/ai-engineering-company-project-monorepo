// Limits of the profile fields, the same the API enforces (services/api/profiles/fields.py). Shared by the
// sign-up form (optional initial profile) and the profile page, so both reject what the API would reject.
export const NAME_MAX = 80;
export const ADDRESS_MAX = 200;
export const PHONE_PATTERN = /^\+?[0-9 ()\-.]{6,20}$/;

export interface ProfileFieldValues {
  name: string;
  phone: string;
  address: string;
}

/** Spanish messages for the invalid fields; `nameRequired` because the name is optional only at sign-up. */
export function validateProfileFields(
  values: ProfileFieldValues,
  { nameRequired }: { nameRequired: boolean },
): Partial<Record<keyof ProfileFieldValues, string>> {
  const errors: Partial<Record<keyof ProfileFieldValues, string>> = {};
  const name = values.name.trim();
  if (nameRequired && !name) errors.name = "El nombre es obligatorio.";
  else if (name.length > NAME_MAX) errors.name = `El nombre admite como máximo ${NAME_MAX} caracteres.`;
  if (values.phone.trim() && !PHONE_PATTERN.test(values.phone.trim()))
    errors.phone = "El teléfono no es válido (6–20 dígitos, se admiten +, espacios, guiones, puntos y paréntesis).";
  if (values.address.trim().length > ADDRESS_MAX)
    errors.address = `La dirección admite como máximo ${ADDRESS_MAX} caracteres.`;
  return errors;
}
