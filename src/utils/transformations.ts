// ============================================================
// transformations.ts — Brasaland · Agregaciones y reportes
// Funciones puras de transformación, conteo, suma y reportes
// ============================================================

import type {
  Local,
  VentaDiaria,
  OrdenCompra,
  Empleado,
  Cliente,
  Ingrediente,
  InventarioLocal,
  ReporteVentasLocal,
  ReporteConsolidado,
  AlertaStock,
  LineaVenta,
  Pais,
  Moneda,
  CategoriaIngrediente,
  RolEmpleado,
  EstadoOrden,
} from "../types/models";

// ────────────────────────────────────────────────────────────
// CONTEO POR CATEGORÍA
// ────────────────────────────────────────────────────────────

/** Cuenta locales por país */
export function contarLocalesPorPais(
  locales: Local[]
): Record<Pais, number> {
  return locales.reduce(
    (acc, local) => {
      acc[local.pais] = (acc[local.pais] ?? 0) + 1;
      return acc;
    },
    {} as Record<Pais, number>
  );
}

/** Cuenta empleados por rol */
export function contarEmpleadosPorRol(
  empleados: Empleado[]
): Record<RolEmpleado, number> {
  return empleados.reduce(
    (acc, emp) => {
      acc[emp.rol] = (acc[emp.rol] ?? 0) + 1;
      return acc;
    },
    {} as Record<RolEmpleado, number>
  );
}

/** Cuenta empleados por local */
export function contarEmpleadosPorLocal(
  empleados: Empleado[]
): Record<string, number> {
  return empleados.reduce(
    (acc, emp) => {
      acc[emp.localId] = (acc[emp.localId] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

/** Cuenta ingredientes por categoría */
export function contarIngredientesPorCategoria(
  ingredientes: Ingrediente[]
): Record<CategoriaIngrediente, number> {
  return ingredientes.reduce(
    (acc, ing) => {
      acc[ing.categoria] = (acc[ing.categoria] ?? 0) + 1;
      return acc;
    },
    {} as Record<CategoriaIngrediente, number>
  );
}

/** Cuenta órdenes de compra por estado */
export function contarOrdenesPorEstado(
  ordenes: OrdenCompra[]
): Record<EstadoOrden, number> {
  return ordenes.reduce(
    (acc, orden) => {
      acc[orden.estado] = (acc[orden.estado] ?? 0) + 1;
      return acc;
    },
    {} as Record<EstadoOrden, number>
  );
}

// ────────────────────────────────────────────────────────────
// SUMAS Y TOTALES
// ────────────────────────────────────────────────────────────

/** Suma el total de ventas de un array de VentaDiaria */
export function sumarTotalVentas(ventas: VentaDiaria[]): number {
  return ventas.reduce((acc, v) => acc + v.totalVenta, 0);
}

/** Suma el total de covers (clientes atendidos) */
export function sumarTotalCovers(ventas: VentaDiaria[]): number {
  return ventas.reduce((acc, v) => acc + v.totalCovers, 0);
}

/** Suma el total de órdenes de compra */
export function sumarTotalOrdenes(ordenes: OrdenCompra[]): number {
  return ordenes.reduce((acc, o) => acc + o.totalOrden, 0);
}

/** Suma Brasa Points de todos los clientes */
export function sumarTotalBrasaPoints(clientes: Cliente[]): number {
  return clientes.reduce((acc, c) => acc + c.brasaPoints, 0);
}

/** Suma el gasto histórico total de todos los clientes */
export function sumarGastoTotalClientes(clientes: Cliente[]): number {
  return clientes.reduce((acc, c) => acc + c.totalGastado, 0);
}

/** Suma ventas agrupadas por local → { localId: totalVentas } */
export function sumarVentasPorLocal(
  ventas: VentaDiaria[]
): Record<string, number> {
  return ventas.reduce(
    (acc, v) => {
      acc[v.localId] = (acc[v.localId] ?? 0) + v.totalVenta;
      return acc;
    },
    {} as Record<string, number>
  );
}

// ────────────────────────────────────────────────────────────
// MÁXIMOS Y MÍNIMOS
// ────────────────────────────────────────────────────────────

/** Encuentra la venta diaria con mayor total. Retorna null si el array está vacío. */
export function encontrarVentaMaxima(
  ventas: VentaDiaria[]
): VentaDiaria | null {
  if (ventas.length === 0) return null;
  return ventas.reduce((max, v) => (v.totalVenta > max.totalVenta ? v : max));
}

/** Encuentra la venta diaria con menor total. Retorna null si el array está vacío. */
export function encontrarVentaMinima(
  ventas: VentaDiaria[]
): VentaDiaria | null {
  if (ventas.length === 0) return null;
  return ventas.reduce((min, v) => (v.totalVenta < min.totalVenta ? v : min));
}

/** Encuentra la orden de compra de mayor valor. Retorna null si el array está vacío. */
export function encontrarOrdenMaxima(
  ordenes: OrdenCompra[]
): OrdenCompra | null {
  if (ordenes.length === 0) return null;
  return ordenes.reduce((max, o) =>
    o.totalOrden > max.totalOrden ? o : max
  );
}

/** Encuentra el cliente con mayor cantidad de Brasa Points. */
export function encontrarClienteConMasPuntos(
  clientes: Cliente[]
): Cliente | null {
  if (clientes.length === 0) return null;
  return clientes.reduce((max, c) =>
    c.brasaPoints > max.brasaPoints ? c : max
  );
}

/** Retorna el local con más ventas históricas según un mapa de ventas por local. */
export function encontrarLocalConMasVentas(
  ventasPorLocal: Record<string, number>
): { localId: string; totalVentas: number } | null {
  const entradas = Object.entries(ventasPorLocal);
  if (entradas.length === 0) return null;
  const [localId, totalVentas] = entradas.reduce((max, entrada) =>
    entrada[1] > max[1] ? entrada : max
  );
  return { localId, totalVentas };
}

// ────────────────────────────────────────────────────────────
// PROMEDIOS
// ────────────────────────────────────────────────────────────

/** Calcula el ticket promedio (venta / covers) de un array de VentaDiaria */
export function calcularTicketPromedio(ventas: VentaDiaria[]): number {
  const totalVentas = sumarTotalVentas(ventas);
  const totalCovers = sumarTotalCovers(ventas);
  if (totalCovers === 0) return 0;
  return totalVentas / totalCovers;
}

/** Calcula el promedio de Brasa Points de todos los clientes */
export function calcularPromedioBrasaPoints(clientes: Cliente[]): number {
  if (clientes.length === 0) return 0;
  return sumarTotalBrasaPoints(clientes) / clientes.length;
}

/** Calcula el promedio de ventas diarias */
export function calcularPromedioVentasDiarias(ventas: VentaDiaria[]): number {
  if (ventas.length === 0) return 0;
  return sumarTotalVentas(ventas) / ventas.length;
}

/** Calcula el salario promedio de un grupo de empleados */
export function calcularSalarioPromedio(empleados: Empleado[]): number {
  if (empleados.length === 0) return 0;
  const totalSalarios = empleados.reduce((acc, e) => acc + e.salario, 0);
  return totalSalarios / empleados.length;
}

// ────────────────────────────────────────────────────────────
// PLATILLO MÁS VENDIDO
// ────────────────────────────────────────────────────────────

/** Calcula cuántas unidades se vendieron de cada platillo en un conjunto de ventas */
export function contarVentasPorPlatillo(
  ventas: VentaDiaria[]
): Record<string, number> {
  return ventas.reduce(
    (acc, venta) => {
      venta.lineas.forEach((linea: LineaVenta) => {
        acc[linea.recetaId] = (acc[linea.recetaId] ?? 0) + linea.cantidad;
      });
      return acc;
    },
    {} as Record<string, number>
  );
}

/** Retorna el ID del platillo más vendido en un conjunto de ventas */
export function obtenerPlatilloMasVendido(
  ventas: VentaDiaria[]
): string | null {
  const conteo = contarVentasPorPlatillo(ventas);
  const entradas = Object.entries(conteo);
  if (entradas.length === 0) return null;
  return entradas.reduce((max, entrada) =>
    entrada[1] > max[1] ? entrada : max
  )[0];
}

// ────────────────────────────────────────────────────────────
// ALERTAS DE STOCK CRÍTICO
// ────────────────────────────────────────────────────────────

/**
 * Genera alertas para todos los inventarios cuyo stock actual
 * sea menor al stock mínimo definido en el ingrediente.
 */
export function generarAlertasStockCritico(
  inventarios: InventarioLocal[],
  ingredientes: Ingrediente[],
  locales: Local[]
): AlertaStock[] {
  const alertas: AlertaStock[] = [];

  for (const inventario of inventarios) {
    const ingrediente = ingredientes.find(
      (ing) => ing.id === inventario.ingredienteId
    );
    const local = locales.find((l) => l.id === inventario.localId);

    if (!ingrediente || !local) continue;

    if (inventario.cantidadActual < ingrediente.stockMinimo) {
      alertas.push({
        localId: local.id,
        nombreLocal: local.nombre,
        ingredienteId: ingrediente.id,
        nombreIngrediente: ingrediente.nombre,
        cantidadActual: inventario.cantidadActual,
        stockMinimo: ingrediente.stockMinimo,
        deficit: ingrediente.stockMinimo - inventario.cantidadActual,
      });
    }
  }

  return alertas;
}

// ────────────────────────────────────────────────────────────
// REPORTES
// ────────────────────────────────────────────────────────────

/**
 * Genera el reporte semanal de ventas para un local específico.
 */
export function generarReporteVentasLocal(
  ventas: VentaDiaria[],
  local: Local,
  semana: string
): ReporteVentasLocal {
  const ventasDelLocal = ventas.filter((v) => v.localId === local.id);
  const totalVentas = sumarTotalVentas(ventasDelLocal);
  const totalCovers = sumarTotalCovers(ventasDelLocal);
  const ticketPromedio = calcularTicketPromedio(ventasDelLocal);
  const platilloMasVendidoId = obtenerPlatilloMasVendido(ventasDelLocal) ?? "";

  return {
    localId: local.id,
    nombreLocal: local.nombre,
    semana,
    totalVentas,
    moneda: local.monedaLocal,
    totalCovers,
    ticketPromedio: Math.round(ticketPromedio * 100) / 100,
    platilloMasVendidoId,
  };
}

/**
 * Genera el reporte consolidado de toda la cadena Brasaland para una semana.
 * Las ventas en COP y USD se suman de forma independiente (sin conversión).
 */
export function generarReporteConsolidado(
  ventas: VentaDiaria[],
  ordenes: OrdenCompra[],
  locales: Local[],
  alertas: AlertaStock[],
  semana: string
): ReporteConsolidado {
  const ventasCOP = ventas
    .filter((v) => v.moneda === "COP")
    .reduce((acc, v) => acc + v.totalVenta, 0);

  const ventasUSD = ventas
    .filter((v) => v.moneda === "USD")
    .reduce((acc, v) => acc + v.totalVenta, 0);

  const totalCovers = sumarTotalCovers(ventas);
  const localesActivos = locales.filter((l) => l.activo).length;

  return {
    semana,
    totalVentasUSD: Math.round(ventasUSD * 100) / 100,
    totalVentasCOP: Math.round(ventasCOP),
    totalCoversCadena: totalCovers,
    localesActivos,
    ordenesCompraEmitidas: ordenes.length,
    alertasStockCritico: alertas.length,
  };
}

/**
 * Genera un resumen de métricas de clientes para el CRM.
 */
export function generarResumenClientes(clientes: Cliente[]): {
  totalClientes: number;
  clientesActivos: number;
  totalBrasaPoints: number;
  promedioPuntos: number;
  gastoTotalHistorico: number;
  gastoPromedioPorCliente: number;
} {
  const activos = clientes.filter((c) => c.activo);
  const totalBrasaPoints = sumarTotalBrasaPoints(clientes);
  const gastoTotal = sumarGastoTotalClientes(clientes);

  return {
    totalClientes: clientes.length,
    clientesActivos: activos.length,
    totalBrasaPoints,
    promedioPuntos:
      clientes.length > 0
        ? Math.round(totalBrasaPoints / clientes.length)
        : 0,
    gastoTotalHistorico: Math.round(gastoTotal * 100) / 100,
    gastoPromedioPorCliente:
      clientes.length > 0
        ? Math.round((gastoTotal / clientes.length) * 100) / 100
        : 0,
  };
}

/**
 * Genera un resumen de las órdenes de compra agrupado por proveedor.
 */
export function generarResumenOrdenesPorProveedor(
  ordenes: OrdenCompra[]
): Record<string, { totalOrdenes: number; montoTotal: number; moneda: Moneda }> {
  return ordenes.reduce(
    (acc, orden) => {
      if (!acc[orden.proveedorId]) {
        acc[orden.proveedorId] = {
          totalOrdenes: 0,
          montoTotal: 0,
          moneda: orden.moneda,
        };
      }
      acc[orden.proveedorId].totalOrdenes += 1;
      acc[orden.proveedorId].montoTotal += orden.totalOrden;
      return acc;
    },
    {} as Record<
      string,
      { totalOrdenes: number; montoTotal: number; moneda: Moneda }
    >
  );
}
