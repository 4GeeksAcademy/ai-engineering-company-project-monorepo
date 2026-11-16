// Funciones utilitarias para transformación de datos

export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + suffix;
}

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}