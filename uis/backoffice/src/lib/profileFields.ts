// Limits of the profile fields, the same the API enforces (services/api/profiles/fields.py). Shared by the
// sign-up form (optional initial profile) and the profile page, so both reject what the API would reject.
import type { Me, ProfileUpdate } from "../types/auth";

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

/** The profile page's form values for a session's user (an unset phone or address is an empty field). */
export const toProfileForm = (me: Me): ProfileFieldValues => ({
  name: me.profile.name,
  phone: me.profile.phone ?? "",
  address: me.profile.address ?? "",
});

/** Only what changed; an emptied optional field is sent as null, which the API reads as "clear it". */
export function profileChanges(saved: ProfileFieldValues, form: ProfileFieldValues): ProfileUpdate {
  const update: ProfileUpdate = {};
  if (form.name.trim() !== saved.name) update.name = form.name.trim();
  if (form.phone.trim() !== saved.phone) update.phone = form.phone.trim() || null;
  if (form.address.trim() !== saved.address) update.address = form.address.trim() || null;
  return update;
}
