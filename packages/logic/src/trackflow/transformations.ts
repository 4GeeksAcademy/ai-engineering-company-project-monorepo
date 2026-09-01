/**
 * TrackFlow - Transformaciones, Cálculos y Reportes
 * Hito 2: Fundamentos de Programación
 * 
 * Contiene toda la lógica de negocio para:
 * - Cálculo de costos de envío con fórmulas exactas
 * - Scoring de transportistas (0-100 puntos)
 * - Selección del mejor transportista
 * - Agregaciones y reportes de almacén
 */

import {
  Carrier,
  CarrierSelection,
  CarrierUsage,
  Product,
  ProductCategory,
  Shipment,
  ShipmentPriority,
  ShipmentStatus,
} from "./contracts";

// ============================================================================
// CÁLCULOS DE COSTOS Y SCORING DE TRANSPORTISTAS
// ============================================================================

/**
 * Calcula el costo total de envío basado en tarifas del transportista
 * 
 * Fórmula exacta:
 * Costo = Base + (Peso × Tasa/Kg × Cantidad) + (Distancia × Tasa/Km)
 * Luego se aplican recargos por prioridad:
 * - Standard: 0% adicional
 * - Express: +30%
 * - Same-day: +60%
 * 
 * @param shipment - Envío a calcular
 * @param product - Producto siendo enviado
 * @param carrier - Transportista seleccionado
 * @returns Costo total redondeado a 2 decimales
 * 
 * @example
 * // Base: 5.0
 * // Peso: 2.3 kg × 1.2 $/kg × 1 qty = 2.76
 * // Distancia: 320 km × 0.08 $/km = 25.6
 * // Subtotal: 5.0 + 2.76 + 25.6 = 33.36
 * // Express +30%: 33.36 × 1.30 = 43.37
 */
export function calculateShippingCost(
  shipment: Shipment,
  product: Product,
  carrier: Carrier
): number {
  const baseCost = carrier.baseRateUSD;
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost = shipment.destination.distanceKm * carrier.ratePerKmUSD;
  
  let subtotal = baseCost + weightCost + distanceCost;
  
  // Aplicar recargo por prioridad

  const priorityMultiplier: Record<ShipmentPriority, number> = {
    Standard: 1.0, // +0% -> multiplicar por 1 (sin cambio)
    Express: 1.3, // +30%
    "Same-day": 1.6, // +60%
  };

  const totalCost = subtotal * priorityMultiplier[shipment.priority];
  
  // Redondear a 2 decimales
  return Math.round(totalCost * 100) / 100;
}

/**
 * Calcula puntaje de idoneidad (0-100) del transportista para un envío
 * 
 * Sistema de puntos:
 * - Opera en destino (20 pts): +20 si opera en país destino, 0 si no
 * - Puede manejar peso (20 pts): +20 si weight × qty <= maxWeight, 0 si no
 * - Soporta prioridad (15 pts): +15 si soporta el nivel de prioridad, 0 si no
 * - Maneja frágiles (15 pts):
 *   - +15 si es frágil Y transportista maneja frágiles
 *   - +15 si NO es frágil (siempre soportado)
 *   - 0 si es frágil pero transportista no maneja frágiles
 * - Confiabilidad (30 pts): onTimeRate × 0.3 (ej: 90% → 27 pts)
 * 
 * @param carrier - Transportista a puntuar
 * @param shipment - Envío para el que se calcula
 * @param product - Producto siendo enviado
 * @returns Puntaje redondeado a 2 decimales (máximo 100)
 * 
 * @example
 * // DHL Express en España con laptop frágil:
 * // Opera en Spain: +20
 * // Peso 2.3kg × 1 = 2.3 <= 50kg: +20
 * // Acepta Express: +15
 * // Es frágil Y maneja frágiles: +15
 * // Confiabilidad 95% × 0.3: +28.5
 * // Total: 98.5 puntos
 */
export function scoreCarrierForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product
): number {
  let score = 0;
  
  // 1. Opera en país de destino (20 puntos)
  if (carrier.operatesIn.includes(shipment.destination.country)) {
    score += 20;
  }
  
  // 2. Puede manejar el peso (20 puntos)
  const totalWeight = product.weightKg * shipment.quantity;
  if (totalWeight <= carrier.maxWeightKg) {
    score += 20;
  }
  
  // 3. Soporta prioridad del envío (15 puntos)
  if (carrier.acceptsPriority.includes(shipment.priority)) {
    score += 15;
  }
  
  // 4. Maneja frágiles (15 puntos)
  if (product.isFragile) {
    if (carrier.handlesFragile) {
      score += 15;
    }
    // Si es frágil pero no maneja frágiles: +0
  } else {
    // Si no es frágil siempre suma puntos
    score += 15;
  }
  
  // 5. Confiabilidad (30 puntos máximo)
  const reliabilityScore = (carrier.onTimeRate / 100) * 30;
  score += reliabilityScore;
  
  // Redondear a 2 decimales y asegurar que no exceda 100
  const finalScore = Math.round(score * 100) / 100;
  return Math.min(finalScore, 100);
}

/**
 * Selecciona el mejor transportista para un envío
 * 
 * Proceso:
 * 1. Puntúa todos los transportistas
 * 2. Filtra transportistas con puntaje < 50 (no adecuados)
 * 3. Entre los adecuados, selecciona el de menor costo
 * 4. Retorna transportista con score y costo, o null si no hay opciones
 * 
 * @param carriers - Array de transportistas disponibles
 * @param shipment - Envío a procesar
 * @param product - Producto siendo enviado
 * @returns CarrierSelection con transportista, score y costo, o null
 * 
 * @example
 * // Si DHL y SEUR califican pero DHL es más caro:
 * // Retorna SEUR con su score y costo menor
 */
export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product
): CarrierSelection | null {
  // Calcular score y costo para cada transportista adecuado
  const scoredCarriers = carriers
    .map((carrier) => ({
      carrier,
      score: scoreCarrierForShipment(carrier, shipment, product),
      cost: calculateShippingCost(shipment, product, carrier),
    }))
    // Filtrar solo transportistas con puntaje >= 50
    .filter((item) => item.score >= 50);
  
  if (scoredCarriers.length === 0) {
    return null;
  }
  
  // Seleccionar el de menor costo entre los adecuados
  const bestOption = scoredCarriers.reduce((min, current) =>
    current.cost < min.cost ? current : min
  );
  
  return bestOption;
}

// ============================================================================
// AGREGACIONES Y REPORTES DE ALMACÉN
// ============================================================================

/**
 * Cuenta productos por categoría
 * 
 * @param products - Array de productos
 * @returns Objeto con conteo de productos por categoría
 * 
 * @example
 * // { Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 }
 */
export function countProductsByCategory(
  products: Product[]
): Record<ProductCategory, number> {
  const categories: ProductCategory[] = [
    "Fashion",
    "Electronics",
    "Cosmetics",
    "Home",
    "Other",
  ];
  
  const counts = categories.reduce(
    (acc, category) => ({
      ...acc,
      [category]: 0,
    }),
    {} as Record<ProductCategory, number>
  );
  
  products.forEach((product) => {
    counts[product.category]++;
  });
  
  return counts;
}

/**
 * Calcula el valor total de inventario
 * 
 * Fórmula: Σ (stockQuantity × unitCostUSD) para todos los productos
 * 
 * @param products - Array de productos
 * @returns Valor total redondeado a 2 decimales
 * 
 * @example
 * // SHOE: 45 × 35 = 1,575
 * // LAPTOP: 8 × 650 = 5,200
 * // PERFUME: 120 × 85 = 10,200
 * // Total: 16,975.00
 */
export function calculateTotalInventoryValue(products: Product[]): number {
  const total = products.reduce(
    (sum, product) => sum + product.stockQuantity * product.unitCostUSD,
    0
  );
  
  return Math.round(total * 100) / 100;
}

/**
 * Calcula la distancia promedio de envíos
 * 
 * @param shipments - Array de envíos
 * @returns Distancia promedio redondeada a 2 decimales
 * 
 * @example
 * // Distancias: [100, 200, 300] → Promedio: 200.00
 */
export function calculateAverageShipmentDistance(
  shipments: Shipment[]
): number {
  if (shipments.length === 0) {
    return 0;
  }
  
  const totalDistance = shipments.reduce(
    (sum, shipment) => sum + shipment.destination.distanceKm,
    0
  );
  
  const average = totalDistance / shipments.length;
  return Math.round(average * 100) / 100;
}

/**
 * Agrupa envíos por estado
 * 
 * @param shipments - Array de envíos
 * @returns Objeto donde cada estado es una clave con array de envíos
 * 
 * @example
 * // {
 * //   Pending: [...],
 * //   Assigned: [...],
 * //   "In transit": [...],
 * //   Delivered: [...],
 * //   Failed: [...]
 * // }
 */
export function groupShipmentsByStatus(
  shipments: Shipment[]
): Record<ShipmentStatus, Shipment[]> {
  const statuses: ShipmentStatus[] = [
    "Pending",
    "Assigned",
    "In transit",
    "Delivered",
    "Failed",
  ];
  
  const grouped = statuses.reduce(
    (acc, status) => ({
      ...acc,
      [status]: [],
    }),
    {} as Record<ShipmentStatus, Shipment[]>
  );
  
  shipments.forEach((shipment) => {
    grouped[shipment.status].push(shipment);
  });
  
  return grouped;
}

/**
 * Encuentra los N transportistas más usados
 * 
 * - Ignora envíos con carrier null
 * - Devuelve ordenados por conteo (mayor primero)
 * 
 * @param shipments - Array de envíos
 * @param topN - Número de transportistas a retornar
 * @returns Array de CarrierUsage ordenado por uso descendente
 * 
 * @example
 * // [
 * //   { carrier: "UPS", count: 5 },
 * //   { carrier: "SEUR", count: 3 },
 * //   { carrier: "DHL", count: 1 }
 * // ]
 */
export function findTopCarriers(
  shipments: Shipment[],
  topN: number
): CarrierUsage[] {
  // Agrupar por carrier
  const carrierCounts = shipments
    .filter((shipment) => shipment.carrier !== null)
    .reduce(
      (acc, shipment) => {
        const carrierName = shipment.carrier!;
        return {
          ...acc,
          [carrierName]: (acc[carrierName] || 0) + 1,
        };
      },
      {} as Record<string, number>
    );
  
  // Convertir a array y ordenar por count descendente
  const sorted = Object.entries(carrierCounts)
    .map(([carrier, count]): CarrierUsage => ({ carrier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  
  return sorted;
}
