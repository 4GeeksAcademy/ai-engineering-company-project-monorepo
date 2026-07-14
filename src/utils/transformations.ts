import {
  Carrier,
  PRODUCT_CATEGORIES,
  Product,
  ProductCategory,
  SHIPMENT_STATUSES,
  Shipment,
  ShipmentStatus,
} from "../types/models";

export interface BestCarrierSelection {
  carrier: Carrier;
  score: number;
  cost: number;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateShippingCost(
  shipment: Shipment,
  product: Product,
  carrier: Carrier,
): number {
  const baseCost: number = carrier.baseRateUSD;
  const weightCost: number = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost: number = shipment.destination.distanceKm * carrier.ratePerKmUSD;

  const subtotal: number = baseCost + weightCost + distanceCost;

  const priorityMultiplierByType: Record<Shipment["priority"], number> = {
    Standard: 1,
    Express: 1.3,
    "Same-day": 1.6,
  };

  return roundToTwoDecimals(subtotal * priorityMultiplierByType[shipment.priority]);
}

export function scoreCarrierForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): number {
  let score: number = 0;

  if (carrier.operatesIn.includes(shipment.destination.country)) {
    score += 20;
  }

  const shipmentWeight: number = product.weightKg * shipment.quantity;
  if (shipmentWeight <= carrier.maxWeightKg) {
    score += 20;
  }

  if (carrier.acceptsPriority.includes(shipment.priority)) {
    score += 15;
  }

  if (!product.isFragile || carrier.handlesFragile) {
    score += 15;
  }

  score += carrier.onTimeRate * 0.3;

  return roundToTwoDecimals(score);
}

export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): BestCarrierSelection | null {
  let bestSelection: BestCarrierSelection | null = null;

  for (const carrier of carriers) {
    const score: number = scoreCarrierForShipment(carrier, shipment, product);

    if (score < 50) {
      continue;
    }

    const cost: number = calculateShippingCost(shipment, product, carrier);

    if (
      bestSelection === null ||
      cost < bestSelection.cost ||
      (cost === bestSelection.cost && score > bestSelection.score)
    ) {
      bestSelection = { carrier, score, cost };
    }
  }

  return bestSelection;
}

export function countProductsByCategory(products: Product[]): Record<ProductCategory, number> {
  const initialCounts: Record<ProductCategory, number> = PRODUCT_CATEGORIES.reduce(
    (accumulator: Record<ProductCategory, number>, category: ProductCategory) => {
      accumulator[category] = 0;
      return accumulator;
    },
    {} as Record<ProductCategory, number>,
  );

  return products.reduce(
    (accumulator: Record<ProductCategory, number>, product: Product) => {
      accumulator[product.category] += 1;
      return accumulator;
    },
    initialCounts,
  );
}

export function calculateTotalInventoryValue(products: Product[]): number {
  const totalValue: number = products.reduce(
    (accumulator: number, product: Product) =>
      accumulator + product.stockQuantity * product.unitCostUSD,
    0,
  );

  return roundToTwoDecimals(totalValue);
}

export function calculateAverageShipmentDistance(shipments: Shipment[]): number {
  if (shipments.length === 0) {
    return 0;
  }

  const totalDistance: number = shipments.reduce(
    (accumulator: number, shipment: Shipment) =>
      accumulator + shipment.destination.distanceKm,
    0,
  );

  return roundToTwoDecimals(totalDistance / shipments.length);
}

export function groupShipmentsByStatus(
  shipments: Shipment[],
): Record<ShipmentStatus, Shipment[]> {
  const initialGroups: Record<ShipmentStatus, Shipment[]> = SHIPMENT_STATUSES.reduce(
    (accumulator: Record<ShipmentStatus, Shipment[]>, status: ShipmentStatus) => {
      accumulator[status] = [];
      return accumulator;
    },
    {} as Record<ShipmentStatus, Shipment[]>,
  );

  return shipments.reduce(
    (accumulator: Record<ShipmentStatus, Shipment[]>, shipment: Shipment) => {
      accumulator[shipment.status].push(shipment);
      return accumulator;
    },
    initialGroups,
  );
}

export function findTopCarriers(
  shipments: Shipment[],
  topN: number,
): Array<{ carrier: string; count: number }> {
  if (topN <= 0) {
    return [];
  }

  const usageByCarrier: Record<string, number> = shipments.reduce(
    (accumulator: Record<string, number>, shipment: Shipment) => {
      if (shipment.carrier === null) {
        return accumulator;
      }

      accumulator[shipment.carrier] = (accumulator[shipment.carrier] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  return Object.entries(usageByCarrier)
    .map(([carrier, count]: [string, number]) => ({ carrier, count }))
    .sort(
      (a: { carrier: string; count: number }, b: { carrier: string; count: number }) =>
        b.count - a.count,
    )
    .slice(0, topN);
}