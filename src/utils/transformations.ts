import { Carrier, Product, ProductCategory, Shipment, ShipmentStatus } from '../types/models';

function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculatePriorityMultiplier(priority: Shipment['priority']): number {
  if (priority === 'Express') {
    return 1.3;
  }

  if (priority === 'Same-day') {
    return 1.6;
  }

  return 1;
}

export function calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number {
  const baseRate = carrier.baseRateUSD;
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost = shipment.destination.distanceKm * carrier.ratePerKmUSD;
  const subtotal = baseRate + weightCost + distanceCost;
  const total = subtotal * calculatePriorityMultiplier(shipment.priority);

  return roundTo2(total);
}

export function scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number {
  let score = 0;

  if (carrier.operatesIn.includes(shipment.destination.country)) {
    score += 20;
  }

  if (product.weightKg * shipment.quantity <= carrier.maxWeightKg) {
    score += 20;
  }

  if (carrier.acceptsPriority.includes(shipment.priority)) {
    score += 15;
  }

  if (!product.isFragile || carrier.handlesFragile) {
    score += 15;
  }

  score += carrier.onTimeRate * 0.3;

  return roundTo2(score);
}

export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product
): { carrier: Carrier; score: number; cost: number } | null {
  let best: { carrier: Carrier; score: number; cost: number } | null = null;

  for (const carrier of carriers) {
    const score = scoreCarrierForShipment(carrier, shipment, product);

    if (score < 50) {
      continue;
    }

    const cost = calculateShippingCost(shipment, product, carrier);

    if (best === null || cost < best.cost) {
      best = { carrier, score, cost };
    }
  }

  return best;
}

export function countProductsByCategory(products: Product[]): Record<ProductCategory, number> {
  const counts: Record<ProductCategory, number> = {
    Fashion: 0,
    Electronics: 0,
    Cosmetics: 0,
    Home: 0,
    Other: 0
  };

  for (const product of products) {
    counts[product.category] += 1;
  }

  return counts;
}

export function calculateTotalInventoryValue(products: Product[]): number {
  const total = products.reduce(
    (accumulator: number, product: Product) => accumulator + product.stockQuantity * product.unitCostUSD,
    0
  );

  return roundTo2(total);
}

export function calculateAverageShipmentDistance(shipments: Shipment[]): number {
  if (shipments.length === 0) {
    return 0;
  }

  const totalDistance = shipments.reduce(
    (accumulator: number, shipment: Shipment) => accumulator + shipment.destination.distanceKm,
    0
  );

  return roundTo2(totalDistance / shipments.length);
}

export function groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]> {
  const grouped: Record<ShipmentStatus, Shipment[]> = {
    Pending: [],
    Assigned: [],
    'In transit': [],
    Delivered: [],
    Failed: []
  };

  for (const shipment of shipments) {
    grouped[shipment.status].push(shipment);
  }

  return grouped;
}

export function findTopCarriers(shipments: Shipment[], topN: number): Array<{ carrier: string; count: number }> {
  if (topN <= 0) {
    return [];
  }

  const usageMap = new Map<string, number>();

  for (const shipment of shipments) {
    if (shipment.carrier === null) {
      continue;
    }

    const currentCount = usageMap.get(shipment.carrier) ?? 0;
    usageMap.set(shipment.carrier, currentCount + 1);
  }

  return Array.from(usageMap.entries())
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, topN);
}