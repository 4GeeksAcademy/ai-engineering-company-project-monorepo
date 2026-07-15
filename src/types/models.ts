// ============================================================
// models.ts — Brasaland · Interfaces y tipos de negocio
// Hito 2: Fundamentos de Programación
// ============================================================

// ────────────────────────────────────────────────────────────
// ENUMS / LITERALES DE UNIÓN
// ────────────────────────────────────────────────────────────

/** Países donde opera Brasaland */
export type Pais = "Colombia" | "USA";

/** Monedas manejadas por la cadena */
export type Moneda = "COP" | "USD";

/** Categorías de ingredientes / productos */
export type CategoriaIngrediente =
  | "carne"
  | "verdura"
  | "salsa"
  | "bebida"
  | "empaque"
  | "limpieza";

/** Estado de una orden de compra */
export type EstadoOrden =
  | "pendiente"
  | "aprobada"
  | "enviada"
  | "recibida"
  | "cancelada";

/** Tipo de movimiento de inventario */
export type TipoMovimiento = "entrada" | "salida" | "ajuste";

/** Rol del empleado */
export type RolEmpleado =
  | "cocinero"
  | "mesero"
  | "cajero"
  | "supervisor"
  | "gerente_local"
  | "administrador";

/** Estado del empleado */
export type EstadoEmpleado = "activo" | "inactivo" | "en_vacaciones";

// ────────────────────────────────────────────────────────────
// LOCAL / RESTAURANTE
// ────────────────────────────────────────────────────────────

/** Representa un local (restaurante) de la cadena Brasaland */
export interface Local {
  id: string;              // Ej: "BOG-001"
  nombre: string;          // Nombre del local
  ciudad: string;
  pais: Pais;
  monedaLocal: Moneda;
  direccion: string;
  telefono: string;
  supervisorId: string;    // ID del supervisor asignado
  activo: boolean;
  fechaApertura: string;   // ISO 8601 "YYYY-MM-DD"
}

// ────────────────────────────────────────────────────────────
// INGREDIENTE
// ────────────────────────────────────────────────────────────

/** Ingrediente del catálogo central de Brasaland */
export interface Ingrediente {
  id: string;
  nombre: string;
  categoria: CategoriaIngrediente;
  unidadMedida: string;   // "kg", "litros", "unidades", etc.
  stockMinimo: number;    // Umbral de alerta por local
  perecedero: boolean;
}

// ────────────────────────────────────────────────────────────
// INVENTARIO POR LOCAL
// ────────────────────────────────────────────────────────────

/** Stock actual de un ingrediente en un local específico */
export interface InventarioLocal {
  localId: string;
  ingredienteId: string;
  cantidadActual: number;
  fechaUltimaActualizacion: string; // ISO 8601
}

/** Registro de movimiento de inventario */
export interface MovimientoInventario {
  id: string;
  localId: string;
  ingredienteId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;           // ISO 8601
  motivo: string;
}

// ────────────────────────────────────────────────────────────
// RECETA
// ────────────────────────────────────────────────────────────

/** Ingrediente requerido dentro de una receta */
export interface ComponenteReceta {
  ingredienteId: string;
  cantidad: number;       // En la unidad de medida del ingrediente
}

/** Receta estándar de un platillo Brasaland */
export interface Receta {
  id: string;
  nombrePlatillo: string;
  descripcion: string;
  componentes: ComponenteReceta[];
  tiempoPreparacionMinutos: number;
  precioBase: number;     // En USD como referencia
  disponible: boolean;
}

// ────────────────────────────────────────────────────────────
// PROVEEDOR
// ────────────────────────────────────────────────────────────

/** Proveedor de insumos para Brasaland */
export interface Proveedor {
  id: string;
  nombre: string;
  pais: Pais;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  categoriasQueProvee: CategoriaIngrediente[];
  tiempoEntregaDias: number;
  montoMinimoOrden: number;
  moneda: Moneda;
  activo: boolean;
}

// ────────────────────────────────────────────────────────────
// ORDEN DE COMPRA
// ────────────────────────────────────────────────────────────

/** Línea de detalle de una orden de compra */
export interface LineaOrden {
  ingredienteId: string;
  cantidadSolicitada: number;
  precioUnitario: number;
  subtotal: number;
}

/** Orden de compra generada para un local */
export interface OrdenCompra {
  id: string;
  localId: string;
  proveedorId: string;
  estado: EstadoOrden;
  lineas: LineaOrden[];
  totalOrden: number;
  moneda: Moneda;
  fechaCreacion: string;   // ISO 8601
  fechaAprobacion: string | null;
  fechaEntregaEstimada: string | null;
  aprobadoPor: string | null; // ID del supervisor que aprobó
  notas: string;
}

// ────────────────────────────────────────────────────────────
// VENTAS
// ────────────────────────────────────────────────────────────

/** Línea de venta dentro de un registro de ventas diarias */
export interface LineaVenta {
  recetaId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Registro de ventas diarias de un local */
export interface VentaDiaria {
  id: string;
  localId: string;
  fecha: string;           // ISO 8601 "YYYY-MM-DD"
  lineas: LineaVenta[];
  totalVenta: number;
  moneda: Moneda;
  totalCovers: number;     // Número de clientes atendidos
}

// ────────────────────────────────────────────────────────────
// EMPLEADO
// ────────────────────────────────────────────────────────────

/** Empleado de Brasaland */
export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolEmpleado;
  localId: string;
  pais: Pais;
  fechaIngreso: string;   // ISO 8601 "YYYY-MM-DD"
  salario: number;
  monedaSalario: Moneda;
  estado: EstadoEmpleado;
}

// ────────────────────────────────────────────────────────────
// CLIENTE / FIDELIZACIÓN
// ────────────────────────────────────────────────────────────

/** Cliente registrado en el programa Brasa Points */
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  brasaPoints: number;          // Puntos acumulados
  localFrecuente: string;       // ID del local más visitado
  fechaRegistro: string;        // ISO 8601
  ultimaVisita: string;         // ISO 8601
  totalGastado: number;         // Histórico en USD
  activo: boolean;
}

// ────────────────────────────────────────────────────────────
// REPORTE AGREGADO
// ────────────────────────────────────────────────────────────

/** Reporte semanal de ventas por local */
export interface ReporteVentasLocal {
  localId: string;
  nombreLocal: string;
  semana: string;           // "YYYY-WXX" (ej: "2024-W22")
  totalVentas: number;
  moneda: Moneda;
  totalCovers: number;
  ticketPromedio: number;
  platilloMasVendidoId: string;
}

/** Reporte consolidado de la cadena */
export interface ReporteConsolidado {
  semana: string;
  totalVentasUSD: number;
  totalVentasCOP: number;
  totalCoversCadena: number;
  localesActivos: number;
  ordenesCompraEmitidas: number;
  alertasStockCritico: number;
}

/** Alerta de stock crítico */
export interface AlertaStock {
  localId: string;
  nombreLocal: string;
  ingredienteId: string;
  nombreIngrediente: string;
  cantidadActual: number;
  stockMinimo: number;
  deficit: number;
}

// ────────────────────────────────────────────────────────────
// RESULTADO DE VALIDACIÓN
// ────────────────────────────────────────────────────────────

/** Resultado estándar de una función de validación */
export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}
