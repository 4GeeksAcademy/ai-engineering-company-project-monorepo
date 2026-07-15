// ============================================================
// collections.ts — Brasaland · Gestión de colecciones
// Filtrado, ordenamiento y operaciones sobre arrays de entidades
// ============================================================

import type {
  Local,
  Ingrediente,
  OrdenCompra,
  VentaDiaria,
  Empleado,
  Cliente,
  Proveedor,
  Pais,
  EstadoOrden,
  CategoriaIngrediente,
  RolEmpleado,
  EstadoEmpleado,
  Moneda,
} from "../types/models";

// ────────────────────────────────────────────────────────────
// LOCALES
// ────────────────────────────────────────────────────────────

/** Filtra locales por país */
export function filtrarLocalesPorPais(locales: Local[], pais: Pais): Local[] {
  return locales.filter((local) => local.pais === pais);
}

/** Filtra sólo locales activos */
export function filtrarLocalesActivos(locales: Local[]): Local[] {
  return locales.filter((local) => local.activo);
}

/** Filtra locales por supervisor asignado */
export function filtrarLocalesPorSupervisor(
  locales: Local[],
  supervisorId: string
): Local[] {
  return locales.filter((local) => local.supervisorId === supervisorId);
}

/** Ordena locales por nombre (A→Z o Z→A) */
export function ordenarLocalesPorNombre(
  locales: Local[],
  ascendente: boolean = true
): Local[] {
  return [...locales].sort((a, b) =>
    ascendente
      ? a.nombre.localeCompare(b.nombre)
      : b.nombre.localeCompare(a.nombre)
  );
}

// ────────────────────────────────────────────────────────────
// INGREDIENTES
// ────────────────────────────────────────────────────────────

/** Filtra ingredientes por categoría */
export function filtrarIngredientesPorCategoria(
  ingredientes: Ingrediente[],
  categoria: CategoriaIngrediente
): Ingrediente[] {
  return ingredientes.filter((ing) => ing.categoria === categoria);
}

/** Filtra ingredientes perecederos */
export function filtrarIngredientesPerecederos(
  ingredientes: Ingrediente[]
): Ingrediente[] {
  return ingredientes.filter((ing) => ing.perecedero);
}

/** Ordena ingredientes por nombre ascendente */
export function ordenarIngredientesPorNombre(
  ingredientes: Ingrediente[],
  ascendente: boolean = true
): Ingrediente[] {
  return [...ingredientes].sort((a, b) =>
    ascendente
      ? a.nombre.localeCompare(b.nombre)
      : b.nombre.localeCompare(a.nombre)
  );
}

/** Ordena ingredientes por stock mínimo */
export function ordenarIngredientesPorStockMinimo(
  ingredientes: Ingrediente[],
  ascendente: boolean = true
): Ingrediente[] {
  return [...ingredientes].sort((a, b) =>
    ascendente
      ? a.stockMinimo - b.stockMinimo
      : b.stockMinimo - a.stockMinimo
  );
}

// ────────────────────────────────────────────────────────────
// ÓRDENES DE COMPRA
// ────────────────────────────────────────────────────────────

/** Filtra órdenes de compra por estado */
export function filtrarOrdenesPorEstado(
  ordenes: OrdenCompra[],
  estado: EstadoOrden
): OrdenCompra[] {
  return ordenes.filter((orden) => orden.estado === estado);
}

/** Filtra órdenes de compra por local */
export function filtrarOrdenesPorLocal(
  ordenes: OrdenCompra[],
  localId: string
): OrdenCompra[] {
  return ordenes.filter((orden) => orden.localId === localId);
}

/** Filtra órdenes de compra por proveedor */
export function filtrarOrdenesPorProveedor(
  ordenes: OrdenCompra[],
  proveedorId: string
): OrdenCompra[] {
  return ordenes.filter((orden) => orden.proveedorId === proveedorId);
}

/** Filtra órdenes cuyo total supere un monto mínimo */
export function filtrarOrdenesPorMontoMinimo(
  ordenes: OrdenCompra[],
  montoMinimo: number
): OrdenCompra[] {
  return ordenes.filter((orden) => orden.totalOrden >= montoMinimo);
}

/** Ordena órdenes por fecha de creación */
export function ordenarOrdenesPorFecha(
  ordenes: OrdenCompra[],
  ascendente: boolean = true
): OrdenCompra[] {
  return [...ordenes].sort((a, b) =>
    ascendente
      ? a.fechaCreacion.localeCompare(b.fechaCreacion)
      : b.fechaCreacion.localeCompare(a.fechaCreacion)
  );
}

/** Ordena órdenes por total de mayor a menor */
export function ordenarOrdenesPorTotal(
  ordenes: OrdenCompra[],
  ascendente: boolean = false
): OrdenCompra[] {
  return [...ordenes].sort((a, b) =>
    ascendente ? a.totalOrden - b.totalOrden : b.totalOrden - a.totalOrden
  );
}

// ────────────────────────────────────────────────────────────
// VENTAS DIARIAS
// ────────────────────────────────────────────────────────────

/** Filtra ventas por local */
export function filtrarVentasPorLocal(
  ventas: VentaDiaria[],
  localId: string
): VentaDiaria[] {
  return ventas.filter((v) => v.localId === localId);
}

/** Filtra ventas dentro de un rango de fechas (inclusive) */
export function filtrarVentasPorRangoFechas(
  ventas: VentaDiaria[],
  fechaInicio: string,
  fechaFin: string
): VentaDiaria[] {
  return ventas.filter(
    (v) => v.fecha >= fechaInicio && v.fecha <= fechaFin
  );
}

/** Filtra ventas por moneda */
export function filtrarVentasPorMoneda(
  ventas: VentaDiaria[],
  moneda: Moneda
): VentaDiaria[] {
  return ventas.filter((v) => v.moneda === moneda);
}

/** Ordena ventas por fecha */
export function ordenarVentasPorFecha(
  ventas: VentaDiaria[],
  ascendente: boolean = true
): VentaDiaria[] {
  return [...ventas].sort((a, b) =>
    ascendente ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)
  );
}

/** Ordena ventas por total (mayor a menor por defecto) */
export function ordenarVentasPorTotal(
  ventas: VentaDiaria[],
  ascendente: boolean = false
): VentaDiaria[] {
  return [...ventas].sort((a, b) =>
    ascendente ? a.totalVenta - b.totalVenta : b.totalVenta - a.totalVenta
  );
}

// ────────────────────────────────────────────────────────────
// EMPLEADOS
// ────────────────────────────────────────────────────────────

/** Filtra empleados por rol */
export function filtrarEmpleadosPorRol(
  empleados: Empleado[],
  rol: RolEmpleado
): Empleado[] {
  return empleados.filter((emp) => emp.rol === rol);
}

/** Filtra empleados por local */
export function filtrarEmpleadosPorLocal(
  empleados: Empleado[],
  localId: string
): Empleado[] {
  return empleados.filter((emp) => emp.localId === localId);
}

/** Filtra empleados por estado */
export function filtrarEmpleadosPorEstado(
  empleados: Empleado[],
  estado: EstadoEmpleado
): Empleado[] {
  return empleados.filter((emp) => emp.estado === estado);
}

/** Filtra empleados por país */
export function filtrarEmpleadosPorPais(
  empleados: Empleado[],
  pais: Pais
): Empleado[] {
  return empleados.filter((emp) => emp.pais === pais);
}

/** Ordena empleados por apellido y nombre */
export function ordenarEmpleadosPorApellido(
  empleados: Empleado[],
  ascendente: boolean = true
): Empleado[] {
  return [...empleados].sort((a, b) => {
    const comparacion = a.apellido.localeCompare(b.apellido);
    if (comparacion !== 0) return ascendente ? comparacion : -comparacion;
    const comparacionNombre = a.nombre.localeCompare(b.nombre);
    return ascendente ? comparacionNombre : -comparacionNombre;
  });
}

/** Ordena empleados por salario */
export function ordenarEmpleadosPorSalario(
  empleados: Empleado[],
  ascendente: boolean = false
): Empleado[] {
  return [...empleados].sort((a, b) =>
    ascendente ? a.salario - b.salario : b.salario - a.salario
  );
}

// ────────────────────────────────────────────────────────────
// CLIENTES (BRASA POINTS)
// ────────────────────────────────────────────────────────────

/** Filtra clientes activos */
export function filtrarClientesActivos(clientes: Cliente[]): Cliente[] {
  return clientes.filter((c) => c.activo);
}

/** Filtra clientes por local frecuente */
export function filtrarClientesPorLocalFrecuente(
  clientes: Cliente[],
  localId: string
): Cliente[] {
  return clientes.filter((c) => c.localFrecuente === localId);
}

/** Filtra clientes con mínimo de Brasa Points */
export function filtrarClientesPorPuntosMinimosBrasaPoints(
  clientes: Cliente[],
  puntosMinimos: number
): Cliente[] {
  return clientes.filter((c) => c.brasaPoints >= puntosMinimos);
}

/** Filtra clientes inactivos hace N días (sin visita reciente) */
export function filtrarClientesInactivosPorDias(
  clientes: Cliente[],
  diasSinVisita: number
): Cliente[] {
  const hoy = new Date();
  return clientes.filter((c) => {
    const ultimaVisita = new Date(c.ultimaVisita);
    const diferenciaDias = Math.floor(
      (hoy.getTime() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diferenciaDias >= diasSinVisita;
  });
}

/** Ordena clientes por Brasa Points (mayor a menor por defecto) */
export function ordenarClientesPorBrasaPoints(
  clientes: Cliente[],
  ascendente: boolean = false
): Cliente[] {
  return [...clientes].sort((a, b) =>
    ascendente ? a.brasaPoints - b.brasaPoints : b.brasaPoints - a.brasaPoints
  );
}

/** Ordena clientes por gasto total histórico */
export function ordenarClientesPorGastoTotal(
  clientes: Cliente[],
  ascendente: boolean = false
): Cliente[] {
  return [...clientes].sort((a, b) =>
    ascendente
      ? a.totalGastado - b.totalGastado
      : b.totalGastado - a.totalGastado
  );
}

// ────────────────────────────────────────────────────────────
// PROVEEDORES
// ────────────────────────────────────────────────────────────

/** Filtra proveedores activos */
export function filtrarProveedoresActivos(
  proveedores: Proveedor[]
): Proveedor[] {
  return proveedores.filter((p) => p.activo);
}

/** Filtra proveedores por país */
export function filtrarProveedoresPorPais(
  proveedores: Proveedor[],
  pais: Pais
): Proveedor[] {
  return proveedores.filter((p) => p.pais === pais);
}

/** Filtra proveedores que ofrezcan una categoría específica */
export function filtrarProveedoresPorCategoria(
  proveedores: Proveedor[],
  categoria: CategoriaIngrediente
): Proveedor[] {
  return proveedores.filter((p) => p.categoriasQueProvee.includes(categoria));
}

/** Ordena proveedores por tiempo de entrega (menor a mayor por defecto) */
export function ordenarProveedoresPorTiempoEntrega(
  proveedores: Proveedor[],
  ascendente: boolean = true
): Proveedor[] {
  return [...proveedores].sort((a, b) =>
    ascendente
      ? a.tiempoEntregaDias - b.tiempoEntregaDias
      : b.tiempoEntregaDias - a.tiempoEntregaDias
  );
}
