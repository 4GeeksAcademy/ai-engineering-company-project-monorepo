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

/**
 * Búsqueda lineal genérica
 * Recorre el array secuencialmente hasta encontrar el primer elemento
 * que cumple con el predicado.
 * @param items Array a buscar
 * @param predicate Función que retorna true cuando encuentra el elemento
 * @returns Índice del elemento encontrado, o -1 si no existe
 * @example
 * const orderId = linearSearch(orders, (o) => o.id === 'ORD-123');
 */
export function linearSearch<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  for (let i = 0; i < items.length; i++) {
    if (predicate(items[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Búsqueda lineal por campo específico
 * Busca el primer elemento cuyo campo coincida exactamente con el valor.
 * @param items Array a buscar
 * @param fieldName Nombre del campo a comparar
 * @param value Valor buscado
 * @returns Índice del elemento encontrado, o -1 si no existe
 * @example
 * const idx = linearSearchByField(orders, 'id', 'ORD-123');
 * if (idx !== -1) console.log('Orden encontrada:', orders[idx]);
 */
export function linearSearchByField<T>(
  items: T[],
  fieldName: keyof T,
  value: T[keyof T]
): number {
  return linearSearch(items, (item) => item[fieldName] === value);
}

/**
 * Búsqueda binaria genérica
 * Requiere que el array esté previamente ordenado por la clave de búsqueda.
 * El predicado debe retornar:
 * - Número negativo si buscas algo menor que el item actual
 * - 0 si encontró el item
 * - Número positivo si buscas algo mayor que el item actual
 * @param items Array ordenado a buscar
 * @param compareFn Función comparadora (similar a sort comparator)
 * @returns Índice del elemento encontrado, o -1 si no existe
 * @example
 * const idx = binarySearch(sortedOrders, (o) => {
 *   if (target < o.id) return -1;
 *   if (target > o.id) return 1;
 *   return 0;
 * });
 */
export function binarySearch<T>(
  items: T[],
  compareFn: (item: T) => number
): number {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(items[mid]);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return -1;
}

/**
 * Búsqueda binaria por campo numérico
 * Requiere que el array esté ordenado por el campo especificado.
 * @param items Array ordenado por el campo
 * @param fieldName Nombre del campo numérico
 * @param value Valor buscado
 * @returns Índice del elemento encontrado, o -1 si no existe
 * @example
 * const idx = binarySearchByNumericField(sortedInventory, 'quantityOnHand', 100);
 */
export function binarySearchByNumericField<T>(
  items: T[],
  fieldName: keyof T,
  value: number
): number {
  return binarySearch(items, (item) => {
    const fieldValue = item[fieldName];
    if (typeof fieldValue !== 'number') return 0;
    return fieldValue < value ? -1 : fieldValue > value ? 1 : 0;
  });
}

/**
 * Búsqueda binaria por campo string
 * Requiere que el array esté ordenado alfabéticamente por el campo.
 * @param items Array ordenado por el campo
 * @param fieldName Nombre del campo string
 * @param value Valor buscado
 * @returns Índice del elemento encontrado, o -1 si no existe
 * @example
 * const idx = binarySearchByStringField(sortedShipments, 'trackingNumber', 'UPS123ABC');
 */
export function binarySearchByStringField<T>(
  items: T[],
  fieldName: keyof T,
  value: string
): number {
  return binarySearch(items, (item) => {
    const fieldValue = String(item[fieldName]);
    return fieldValue.localeCompare(value);
  });
}