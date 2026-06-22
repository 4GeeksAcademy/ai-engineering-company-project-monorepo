// ============================================================
// search.ts — Brasaland · Búsquedas lineal y binaria
// Funciones puras de búsqueda sobre colecciones de entidades
// ============================================================

import type {
  Local,
  Ingrediente,
  OrdenCompra,
  VentaDiaria,
  Empleado,
  Cliente,
  Proveedor,
  Receta,
} from "../types/models";

// ────────────────────────────────────────────────────────────
// BÚSQUEDA LINEAL (arrays desordenados)
// ────────────────────────────────────────────────────────────

/**
 * Búsqueda lineal de un local por su ID.
 * O(n) — funciona sobre arrays sin orden garantizado.
 */
export function buscarLocalPorId(
  locales: Local[],
  id: string
): Local | null {
  for (const local of locales) {
    if (local.id === id) return local;
  }
  return null;
}

/**
 * Búsqueda lineal de un ingrediente por su ID.
 */
export function buscarIngredientePorId(
  ingredientes: Ingrediente[],
  id: string
): Ingrediente | null {
  for (const ingrediente of ingredientes) {
    if (ingrediente.id === id) return ingrediente;
  }
  return null;
}

/**
 * Búsqueda lineal de una orden de compra por su ID.
 */
export function buscarOrdenPorId(
  ordenes: OrdenCompra[],
  id: string
): OrdenCompra | null {
  for (const orden of ordenes) {
    if (orden.id === id) return orden;
  }
  return null;
}

/**
 * Búsqueda lineal de un empleado por su ID.
 */
export function buscarEmpleadoPorId(
  empleados: Empleado[],
  id: string
): Empleado | null {
  for (const empleado of empleados) {
    if (empleado.id === id) return empleado;
  }
  return null;
}

/**
 * Búsqueda lineal de un empleado por email.
 */
export function buscarEmpleadoPorEmail(
  empleados: Empleado[],
  email: string
): Empleado | null {
  const emailNormalizado = email.toLowerCase().trim();
  for (const empleado of empleados) {
    if (empleado.email.toLowerCase().trim() === emailNormalizado)
      return empleado;
  }
  return null;
}

/**
 * Búsqueda lineal de un cliente por su ID.
 */
export function buscarClientePorId(
  clientes: Cliente[],
  id: string
): Cliente | null {
  for (const cliente of clientes) {
    if (cliente.id === id) return cliente;
  }
  return null;
}

/**
 * Búsqueda lineal de un cliente por email.
 */
export function buscarClientePorEmail(
  clientes: Cliente[],
  email: string
): Cliente | null {
  const emailNormalizado = email.toLowerCase().trim();
  for (const cliente of clientes) {
    if (cliente.email.toLowerCase().trim() === emailNormalizado)
      return cliente;
  }
  return null;
}

/**
 * Búsqueda lineal de un proveedor por su ID.
 */
export function buscarProveedorPorId(
  proveedores: Proveedor[],
  id: string
): Proveedor | null {
  for (const proveedor of proveedores) {
    if (proveedor.id === id) return proveedor;
  }
  return null;
}

/**
 * Búsqueda lineal de una receta por nombre (parcial, sin distinción
 * de mayúsculas).
 */
export function buscarRecetasPorNombre(
  recetas: Receta[],
  termino: string
): Receta[] {
  const terminoNormalizado = termino.toLowerCase().trim();
  return recetas.filter((r) =>
    r.nombrePlatillo.toLowerCase().includes(terminoNormalizado)
  );
}

/**
 * Búsqueda lineal de ventas de un local en una fecha específica.
 */
export function buscarVentasPorFecha(
  ventas: VentaDiaria[],
  localId: string,
  fecha: string
): VentaDiaria | null {
  for (const venta of ventas) {
    if (venta.localId === localId && venta.fecha === fecha) return venta;
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// BÚSQUEDA BINARIA (arrays ORDENADOS por el campo buscado)
// ────────────────────────────────────────────────────────────

/**
 * Búsqueda binaria de un local por ID en un array ordenado
 * ascendentemente por `id`.
 * O(log n) — el array DEBE estar ordenado por `id`.
 * Retorna el local encontrado o null si no existe o el array está vacío.
 */
export function buscarLocalPorIdBinario(
  localesOrdenados: Local[],
  id: string
): Local | null {
  if (localesOrdenados.length === 0) return null;

  let izquierda = 0;
  let derecha = localesOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = localesOrdenados[medio].id.localeCompare(id);

    if (comparacion === 0) return localesOrdenados[medio];
    if (comparacion < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}

/**
 * Búsqueda binaria de un ingrediente por ID en un array ordenado
 * ascendentemente por `id`.
 * O(log n) — el array DEBE estar ordenado por `id`.
 */
export function buscarIngredientePorIdBinario(
  ingredientesOrdenados: Ingrediente[],
  id: string
): Ingrediente | null {
  if (ingredientesOrdenados.length === 0) return null;

  let izquierda = 0;
  let derecha = ingredientesOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = ingredientesOrdenados[medio].id.localeCompare(id);

    if (comparacion === 0) return ingredientesOrdenados[medio];
    if (comparacion < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}

/**
 * Búsqueda binaria de un empleado por ID en un array ordenado
 * ascendentemente por `id`.
 * O(log n) — el array DEBE estar ordenado por `id`.
 */
export function buscarEmpleadoPorIdBinario(
  empleadosOrdenados: Empleado[],
  id: string
): Empleado | null {
  if (empleadosOrdenados.length === 0) return null;

  let izquierda = 0;
  let derecha = empleadosOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = empleadosOrdenados[medio].id.localeCompare(id);

    if (comparacion === 0) return empleadosOrdenados[medio];
    if (comparacion < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}

/**
 * Búsqueda binaria de un cliente por ID en un array ordenado
 * ascendentemente por `id`.
 * O(log n) — el array DEBE estar ordenado por `id`.
 */
export function buscarClientePorIdBinario(
  clientesOrdenados: Cliente[],
  id: string
): Cliente | null {
  if (clientesOrdenados.length === 0) return null;

  let izquierda = 0;
  let derecha = clientesOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = clientesOrdenados[medio].id.localeCompare(id);

    if (comparacion === 0) return clientesOrdenados[medio];
    if (comparacion < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}

/**
 * Búsqueda binaria de una receta por precio base en un array ordenado
 * ascendentemente por `precioBase`.
 * O(log n) — el array DEBE estar ordenado por `precioBase`.
 * Retorna la primera receta cuyo precio coincida exactamente.
 */
export function buscarRecetaPorPrecioBinario(
  recetasOrdenadas: Receta[],
  precio: number
): Receta | null {
  if (recetasOrdenadas.length === 0) return null;

  let izquierda = 0;
  let derecha = recetasOrdenadas.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const precioMedio = recetasOrdenadas[medio].precioBase;

    if (precioMedio === precio) return recetasOrdenadas[medio];
    if (precioMedio < precio) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}

/**
 * Búsqueda binaria de ventas de un local por fecha en un array ordenado
 * ascendentemente por `fecha`.
 * O(log n) — el array DEBE estar ordenado por `fecha`.
 */
export function buscarVentaPorFechaBinario(
  ventasOrdenadas: VentaDiaria[],
  fecha: string
): VentaDiaria | null {
  if (ventasOrdenadas.length === 0) return null;

  let izquierda = 0;
  let derecha = ventasOrdenadas.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = ventasOrdenadas[medio].fecha.localeCompare(fecha);

    if (comparacion === 0) return ventasOrdenadas[medio];
    if (comparacion < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }

  return null;
}
