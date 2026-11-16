// Funciones utilitarias para manejo de colecciones

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(items: T[], keyFn: (item: T) => number | string, ascending: boolean = true): T[] {
  return [...items].sort((a, b) => {
    const valA = keyFn(a);
    const valB = keyFn(b);
    const comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
    return ascending ? comparison : -comparison;
  });
}

export function uniqueBy<T>(items: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}