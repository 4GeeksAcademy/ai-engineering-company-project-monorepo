// Funciones utilitarias para búsqueda y filtrado

export function filterByText<T>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    fields.some(field => {
      const value = item[field];
      return String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number = 10): { data: T[]; total: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return { data, total, totalPages };
}