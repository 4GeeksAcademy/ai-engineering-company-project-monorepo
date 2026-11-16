// Funciones utilitarias para validaciones

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function hasMinLength(value: string, min: number): boolean {
  return value.length >= min;
}