// Funciones utilitarias para transformación de datos

import {
  Product,
  InventoryItem,
  Shipment,
  ReturnRequest,
  Brand,
  SupportTicket,
  ShipmentStatus,
  ReturnStatus,
  ReturnDisposition,
  ProductCondition,
  ContractStatus,
  ContactChannel
} from '../types/models';

// ============================================
// FUNCIONES DE FORMATO
// ============================================

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

/**
 * Formatea un número redondeando a decimales especificados
 * @param value Número a redondear
 * @param decimals Cantidad de decimales (default: 2)
 * @returns Número redondeado
 * @example
 * formatDecimal(10.567, 2) => 10.57
 */
export function formatDecimal(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Formatea un número con símbolo de moneda
 * @param value Monto numérico
 * @param currency Moneda ('USD' | 'EUR')
 * @param decimals Decimales a mostrar (default: 2)
 * @returns String formateado con símbolo y valor
 * @example
 * formatCurrency(99.5, 'USD', 2) => "$99.50"
 * formatCurrency(99.5, 'EUR', 2) => "€99.50"
 */
export function formatCurrency(value: number, currency: 'USD' | 'EUR' = 'USD', decimals: number = 2): string {
  const symbol = currency === 'USD' ? '$' : '€';
  const formatted = formatDecimal(value, decimals).toFixed(decimals);
  return `${symbol}${formatted}`;
}

/**
 * Formatea un porcentaje
 * @param value Valor decimal (ej: 0.85 para 85%)
 * @param decimals Decimales a mostrar (default: 1)
 * @returns String con símbolo de porcentaje
 * @example
 * formatPercentage(0.8567, 1) => "85.7%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const percentage = formatDecimal(value * 100, decimals);
  return `${percentage}%`;
}

// ============================================
// INTERFACES DE ESTADÍSTICAS
// ============================================

export interface NumericStats {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

export interface InventoryStats extends NumericStats {
  totalItems: number;
  criticalItems: number;
  criticalThreshold: number;
}

export interface WarehouseCapacityStats {
  warehouseId: string;
  totalOnHand: number;
  totalReserved: number;
  availableForSale: number;
  reservationPercentage: number;
}

export interface ShipmentStats {
  total: number;
  byStatus: Record<string, number>;
  averageWeight: number;
  minWeight: number;
  maxWeight: number;
  onTimeCount: number;
  onTimePercentage: number;
  failureCount: number;
  failureRate: number;
}

export interface CarrierPerformanceStats {
  carrierId: string;
  shipmentCount: number;
  onTimeCount: number;
  onTimePercentage: number;
  averageWeight: number;
  failureCount: number;
  failureRate: number;
}

export interface ReturnStats {
  totalReturns: number;
  byStatus: Record<string, number>;
  byDisposition: Record<string, number>;
  byCondition: Record<string, number>;
  averageReturnRate: number;
}

export interface BrandStats {
  totalBrands: number;
  byContractStatus: Record<string, number>;
  averageRiskScore: number;
  brandsAtRisk: number;
  brandsExpiring: number;
}

export interface SupportStats {
  total: number;
  open: number;
  resolved: number;
  escalated: number;
  resolutionRate: number;
  byChannel: Record<string, number>;
  agentResolved: number;
  humanResolved: number;
}

export interface InventoryValueStats {
  warehouseId?: string;
  totalValue: number;
  productCount: number;
  averageValuePerProduct: number;
}

// ============================================
// FUNCIONES GENÉRICAS DE AGREGACIÓN
// ============================================

/**
 * Suma valores de un selector en un array
 * @param items Array a sumar
 * @param selector Función que extrae el valor numérico
 * @returns Suma total
 * @example
 * const total = sumBy(products, p => p.unitPrice);
 */
export function sumBy<T>(
  items: T[],
  selector: (item: T) => number
): number {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

/**
 * Calcula el promedio de valores de un selector
 * @param items Array a promediar
 * @param selector Función que extrae el valor numérico
 * @returns Promedio (0 si array vacío)
 * @example
 * const avg = averageBy(shipments, s => s.weightKg);
 */
export function averageBy<T>(
  items: T[],
  selector: (item: T) => number
): number {
  if (items.length === 0) return 0;
  return sumBy(items, selector) / items.length;
}

/**
 * Encuentra el valor mínimo de un selector
 * @param items Array a evaluar
 * @param selector Función que extrae el valor numérico
 * @returns Valor mínimo (Infinity si array vacío)
 * @example
 * const min = minBy(inventory, i => i.quantityOnHand);
 */
export function minBy<T>(
  items: T[],
  selector: (item: T) => number
): number {
  if (items.length === 0) return Infinity;
  return Math.min(...items.map(selector));
}

/**
 * Encuentra el valor máximo de un selector
 * @param items Array a evaluar
 * @param selector Función que extrae el valor numérico
 * @returns Valor máximo (-Infinity si array vacío)
 * @example
 * const max = maxBy(inventory, i => i.quantityOnHand);
 */
export function maxBy<T>(
  items: T[],
  selector: (item: T) => number
): number {
  if (items.length === 0) return -Infinity;
  return Math.max(...items.map(selector));
}

/**
 * Cuenta ocurrencias agrupadas por clave
 * @param items Array a contar
 * @param keyFn Función que extrae la clave
 * @returns Objeto con conteos por clave
 * @example
 * const counts = countBy(shipments, s => s.status);
 * // { delivered: 45, in_transit: 12, failed_delivery: 3 }
 */
export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, number> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================
// ESTADÍSTICAS DE INVENTARIO
// ============================================

/**
 * Calcula estadísticas generales de inventario
 * @param items Array de items de inventario
 * @param options Opciones de filtrado (ej: exclude warehouses)
 * @returns Estadísticas de cantidad en stock
 * @example
 * const stats = calculateInventoryStats(inventory);
 */
export function calculateInventoryStats(
  items: InventoryItem[],
  options?: { excludeWarehouseIds?: string[]; criticalThreshold?: number }
): InventoryStats {
  const threshold = options?.criticalThreshold ?? 10;
  const filtered = options?.excludeWarehouseIds
    ? items.filter(i => !options.excludeWarehouseIds!.includes(i.warehouseId))
    : items;

  const quantities = filtered.map(i => i.quantityOnHand);
  const critical = filtered.filter(i => i.quantityOnHand < threshold).length;

  return {
    totalItems: filtered.length,
    total: sumBy(filtered, i => i.quantityOnHand),
    average: averageBy(filtered, i => i.quantityOnHand),
    min: minBy(filtered, i => i.quantityOnHand),
    max: maxBy(filtered, i => i.quantityOnHand),
    count: filtered.length,
    criticalItems: critical,
    criticalThreshold: threshold
  };
}

/**
 * Calcula capacidad y ocupación por almacén
 * @param items Array de items de inventario
 * @param warehouseId ID del almacén a evaluar
 * @returns Estadísticas de capacidad del almacén
 * @example
 * const capacity = calculateWarehouseCapacity(inventory, 'wh-la');
 */
export function calculateWarehouseCapacity(
  items: InventoryItem[],
  warehouseId: string
): WarehouseCapacityStats {
  const warehouseItems = items.filter(i => i.warehouseId === warehouseId);
  const totalOnHand = sumBy(warehouseItems, i => i.quantityOnHand);
  const totalReserved = sumBy(warehouseItems, i => i.quantityReserved);
  const availableForSale = totalOnHand - totalReserved;
  const reservationPercentage = totalOnHand > 0 ? formatDecimal(totalReserved / totalOnHand, 4) : 0;

  return {
    warehouseId,
    totalOnHand,
    totalReserved,
    availableForSale,
    reservationPercentage
  };
}

// ============================================
// ESTADÍSTICAS DE ENVÍOS
// ============================================

/**
 * Calcula estadísticas generales de envíos
 * @param shipments Array de envíos
 * @param options Opciones de filtrado (ej: exclude failed)
 * @returns Estadísticas de envíos
 * @example
 * const stats = calculateShipmentStats(shipments);
 */
export function calculateShipmentStats(
  shipments: Shipment[],
  options?: { excludeStatuses?: ShipmentStatus[] }
): ShipmentStats {
  const filtered = options?.excludeStatuses
    ? shipments.filter(s => !options.excludeStatuses!.includes(s.status))
    : shipments;

  const byStatus = countBy(filtered, s => s.status);
  const onTimeCount = filtered.filter(s => s.isOnTime === true).length;
  const failureStatuses: ShipmentStatus[] = ['failed_delivery', 'lost'];
  const failureCount = filtered.filter(s => failureStatuses.includes(s.status)).length;

  return {
    total: filtered.length,
    byStatus,
    averageWeight: averageBy(filtered, s => s.weightKg),
    minWeight: minBy(filtered, s => s.weightKg),
    maxWeight: maxBy(filtered, s => s.weightKg),
    onTimeCount,
    onTimePercentage: filtered.length > 0 ? formatDecimal(onTimeCount / filtered.length, 4) : 0,
    failureCount,
    failureRate: filtered.length > 0 ? formatDecimal(failureCount / filtered.length, 4) : 0
  };
}

/**
 * Agrupa envíos por estado
 * @param shipments Array de envíos
 * @returns Conteo de envíos por cada estado
 * @example
 * const grouped = groupShipmentsByStatus(shipments);
 */
export function groupShipmentsByStatus(shipments: Shipment[]): Record<string, number> {
  return countBy(shipments, s => s.status);
}

/**
 * Calcula rendimiento por transportista
 * @param shipments Array de envíos
 * @param options Opciones de filtrado
 * @returns Array de estadísticas de rendimiento por carrier
 * @example
 * const performance = calculateCarrierPerformance(shipments);
 */
export function calculateCarrierPerformance(
  shipments: Shipment[],
  options?: { minShipmentCount?: number }
): CarrierPerformanceStats[] {
  const minCount = options?.minShipmentCount ?? 1;
  const byCarrier = shipments.reduce((acc, s) => {
    if (!acc[s.carrierId]) acc[s.carrierId] = [];
    acc[s.carrierId].push(s);
    return acc;
  }, {} as Record<string, Shipment[]>);

  return Object.entries(byCarrier)
    .filter(([, shipmentList]) => shipmentList.length >= minCount)
    .map(([carrierId, carrierShipments]) => {
      const onTimeCount = carrierShipments.filter(s => s.isOnTime === true).length;
      const failureStatuses: ShipmentStatus[] = ['failed_delivery', 'lost'];
      const failureCount = carrierShipments.filter(s => failureStatuses.includes(s.status)).length;

      return {
        carrierId,
        shipmentCount: carrierShipments.length,
        onTimeCount,
        onTimePercentage: formatDecimal(onTimeCount / carrierShipments.length, 4),
        averageWeight: averageBy(carrierShipments, s => s.weightKg),
        failureCount,
        failureRate: formatDecimal(failureCount / carrierShipments.length, 4)
      };
    });
}

// ============================================
// ESTADÍSTICAS DE DEVOLUCIONES
// ============================================

/**
 * Calcula estadísticas generales de devoluciones
 * @param returns Array de solicitudes de devolución
 * @param options Opciones de filtrado
 * @returns Estadísticas de devoluciones
 * @example
 * const stats = calculateReturnStats(returns);
 */
export function calculateReturnStats(
  returns: ReturnRequest[],
  options?: { excludeStatuses?: ReturnStatus[] }
): ReturnStats {
  const filtered = options?.excludeStatuses
    ? returns.filter(r => !options.excludeStatuses!.includes(r.status))
    : returns;

  const byStatus = countBy(filtered, r => r.status);
  const byDisposition = countBy(
    filtered.filter(r => r.disposition),
    r => r.disposition || 'unknown'
  );
  const byCondition = countBy(
    filtered.filter(r => r.condition),
    r => r.condition || 'unknown'
  );

  return {
    totalReturns: filtered.length,
    byStatus,
    byDisposition,
    byCondition,
    averageReturnRate: 0 // Se calcula con más datos contextuales (total órdenes)
  };
}

/**
 * Agrupa devoluciones por estado
 * @param returns Array de devoluciones
 * @returns Conteo por estado
 * @example
 * const grouped = groupReturnsByStatus(returns);
 */
export function groupReturnsByStatus(returns: ReturnRequest[]): Record<string, number> {
  return countBy(returns, r => r.status);
}

/**
 * Agrupa devoluciones por disposición (restock/refurbish/dispose)
 * @param returns Array de devoluciones
 * @returns Conteo por disposición
 * @example
 * const grouped = groupReturnsByDisposition(returns);
 */
export function groupReturnsByDisposition(returns: ReturnRequest[]): Record<string, number> {
  return countBy(
    returns.filter(r => r.disposition),
    r => r.disposition || 'unknown'
  );
}

/**
 * Agrupa devoluciones por condición del producto
 * @param returns Array de devoluciones
 * @returns Conteo por condición
 * @example
 * const grouped = groupReturnsByCondition(returns);
 */
export function groupReturnsByCondition(returns: ReturnRequest[]): Record<string, number> {
  return countBy(
    returns.filter(r => r.condition),
    r => r.condition || 'unknown'
  );
}

// ============================================
// ESTADÍSTICAS DE MARCAS
// ============================================

/**
 * Calcula estadísticas generales de marcas
 * @param brands Array de marcas
 * @param options Opciones de filtrado y cálculo
 * @returns Estadísticas de marcas
 * @example
 * const stats = calculateBrandStats(brands, { riskThreshold: 60 });
 */
export function calculateBrandStats(
  brands: Brand[],
  options?: { riskThreshold?: number; excludeCountries?: string[] }
): BrandStats {
  const threshold = options?.riskThreshold ?? 60;
  const filtered = options?.excludeCountries
    ? brands.filter(b => !options.excludeCountries!.includes(b.country))
    : brands;

  const byStatus = countBy(filtered, b => b.contractStatus);
  const brandsAtRisk = filtered.filter(b => (b.riskScore ?? 0) >= threshold).length;

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const brandsExpiring = filtered.filter(b => new Date(b.contractEndDate) <= nextMonth).length;

  return {
    totalBrands: filtered.length,
    byContractStatus: byStatus,
    averageRiskScore: averageBy(filtered, b => b.riskScore ?? 0),
    brandsAtRisk,
    brandsExpiring
  };
}

/**
 * Agrupa marcas por estado de contrato
 * @param brands Array de marcas
 * @returns Conteo por estado de contrato
 * @example
 * const grouped = groupBrandsByContractStatus(brands);
 */
export function groupBrandsByContractStatus(brands: Brand[]): Record<string, number> {
  return countBy(brands, b => b.contractStatus);
}

// ============================================
// ESTADÍSTICAS DE SOPORTE
// ============================================

/**
 * Calcula estadísticas generales de tickets de soporte
 * @param tickets Array de tickets de soporte
 * @param options Opciones de filtrado
 * @returns Estadísticas de tickets
 * @example
 * const stats = calculateSupportStats(tickets);
 */
export function calculateSupportStats(
  tickets: SupportTicket[],
  options?: { excludeLanguages?: string[] }
): SupportStats {
  const filtered = options?.excludeLanguages
    ? tickets.filter(t => !options.excludeLanguages!.includes(t.language))
    : tickets;

  const byChannel = countBy(filtered, t => t.channel);
  const open = filtered.filter(t => t.status === 'open').length;
  const resolved = filtered.filter(t => t.status === 'resolved_by_agent' || t.status === 'closed').length;
  const escalated = filtered.filter(t => t.status === 'escalated').length;
  const agentResolved = filtered.filter(t => t.resolvedBy === 'agent').length;
  const humanResolved = filtered.filter(t => t.resolvedBy === 'human').length;

  return {
    total: filtered.length,
    open,
    resolved,
    escalated,
    resolutionRate: filtered.length > 0 ? formatDecimal(resolved / filtered.length, 4) : 0,
    byChannel,
    agentResolved,
    humanResolved
  };
}

/**
 * Agrupa tickets por canal de comunicación
 * @param tickets Array de tickets
 * @returns Conteo por canal (email, whatsapp, phone)
 * @example
 * const grouped = groupTicketsByChannel(tickets);
 */
export function groupTicketsByChannel(tickets: SupportTicket[]): Record<string, number> {
  return countBy(tickets, t => t.channel);
}

// ============================================
// ESTADÍSTICAS FINANCIERAS
// ============================================

/**
 * Calcula el valor total de inventario
 * @param products Array de productos
 * @param inventory Array de items de inventario
 * @returns Valor total en dinero
 * @example
 * const value = calculateProductInventoryValue(products, inventory);
 */
export function calculateProductInventoryValue(
  products: Product[],
  inventory: InventoryItem[]
): number {
  const productMap = new Map(products.map(p => [p.id, p]));
  return sumBy(inventory, item => {
    const product = productMap.get(item.productId);
    return (product?.unitPrice ?? 0) * item.quantityOnHand;
  });
}

/**
 * Calcula valor de inventario por almacén
 * @param products Array de productos
 * @param inventory Array de items de inventario
 * @param options Opciones (ej: solo almacén específico)
 * @returns Array de valores por almacén
 * @example
 * const values = calculateInventoryValueByWarehouse(products, inventory);
 */
export function calculateInventoryValueByWarehouse(
  products: Product[],
  inventory: InventoryItem[],
  options?: { warehouseId?: string }
): InventoryValueStats[] {
  const productMap = new Map(products.map(p => [p.id, p]));
  const filtered = options?.warehouseId
    ? inventory.filter(i => i.warehouseId === options.warehouseId)
    : inventory;

  const byWarehouse = filtered.reduce((acc, item) => {
    if (!acc[item.warehouseId]) acc[item.warehouseId] = [];
    acc[item.warehouseId].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return Object.entries(byWarehouse).map(([warehouseId, items]) => {
    const totalValue = sumBy(items, item => {
      const product = productMap.get(item.productId);
      return (product?.unitPrice ?? 0) * item.quantityOnHand;
    });
    const productCount = new Set(items.map(i => i.productId)).size;

    return {
      warehouseId,
      totalValue,
      productCount,
      averageValuePerProduct: productCount > 0 ? formatDecimal(totalValue / productCount, 2) : 0
    };
  });
}

/**
 * Calcula precio promedio de productos
 * @param products Array de productos
 * @param options Opciones (ej: por país)
 * @returns Precio promedio
 * @example
 * const avgPrice = calculateAverageProductPrice(products);
 */
export function calculateAverageProductPrice(
  products: Product[],
  options?: { country?: string }
): number {
  return averageBy(products, p => p.unitPrice);
}