import { Product, Shipment } from '../types/models';

export function findProductBySKU(products: Product[], sku: string): Product | null {
  const normalizedSku = sku.trim().toLowerCase();

  for (const product of products) {
    if (product.sku.toLowerCase() === normalizedSku) {
      return product;
    }
  }

  return null;
}

export function findShipmentById(shipments: Shipment[], id: string): Shipment | null {
  for (const shipment of shipments) {
    if (shipment.id === id) {
      return shipment;
    }
  }

  return null;
}

export function binarySearchProductByWeight(sortedProducts: Product[], targetWeight: number): number {
  let left = 0;
  let right = sortedProducts.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const currentWeight = sortedProducts[middle].weightKg;

    if (currentWeight === targetWeight) {
      return middle;
    }

    if (currentWeight < targetWeight) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}