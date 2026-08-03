import { Carrier, Product, ProductCategory, WarehouseLocation } from '../types/models';

export function filterProductsByWarehouse(products: Product[], warehouse: WarehouseLocation): Product[] {
  return products.filter((product: Product) => product.warehouse === warehouse);
}

export function filterProductsByCategory(products: Product[], category: ProductCategory): Product[] {
  return products.filter((product: Product) => product.category === category);
}

export function filterLowStockProducts(products: Product[]): Product[] {
  return products.filter((product: Product) => product.stockQuantity <= product.minStockThreshold);
}

export function sortProductsByStock(products: Product[], order: 'asc' | 'desc'): Product[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...products].sort(
    (left: Product, right: Product) => (left.stockQuantity - right.stockQuantity) * direction
  );
}

export function sortCarriersByReliability(carriers: Carrier[], order: 'asc' | 'desc'): Carrier[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...carriers].sort((left: Carrier, right: Carrier) => (left.onTimeRate - right.onTimeRate) * direction);
}