export interface Dimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export type ProductCategory = 'Fashion' | 'Electronics' | 'Cosmetics' | 'Home' | 'Other';

export type WarehouseLocation = 'Los Angeles' | 'Zaragoza';

export type ProductStatus = 'Active' | 'Low stock' | 'Out of stock' | 'Discontinued';

export interface Product {
  sku: string;
  name: string;
  category: ProductCategory;
  weightKg: number;
  dimensions: Dimensions;
  warehouse: WarehouseLocation;
  stockQuantity: number;
  minStockThreshold: number;
  unitCostUSD: number;
  isFragile: boolean;
  status: ProductStatus;
}

export interface Destination {
  city: string;
  country: Country;
  postalCode: string;
  distanceKm: number;
}

export type Country = 'United States' | 'Spain';

export type ShipmentPriority = 'Standard' | 'Express' | 'Same-day';

export type ShipmentStatus = 'Pending' | 'Assigned' | 'In transit' | 'Delivered' | 'Failed';

export interface Shipment {
  id: string;
  sku: string;
  quantity: number;
  origin: WarehouseLocation;
  destination: Destination;
  priority: ShipmentPriority;
  declaredValueUSD: number;
  carrier: string | null;
  status: ShipmentStatus;
  createdAt: Date;
}

export interface Carrier {
  id: string;
  name: string;
  operatesIn: Country[];
  baseRateUSD: number;
  ratePerKgUSD: number;
  ratePerKmUSD: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  maxWeightKg: number;
  handlesFragile: boolean;
  acceptsPriority: ShipmentPriority[];
}

export type MovementType = 'Inbound' | 'Outbound' | 'Transfer' | 'Adjustment';

export interface InventoryMovement {
  id: string;
  sku: string;
  warehouse: WarehouseLocation;
  type: MovementType;
  quantity: number;
  reason: string;
  timestamp: Date;
}

export const sampleProducts: Product[] = [
  {
    sku: 'SHOE-BLK-42',
    name: 'Black Running Shoes - Size 42',
    category: 'Fashion',
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    warehouse: 'Los Angeles',
    stockQuantity: 45,
    minStockThreshold: 20,
    unitCostUSD: 35.0,
    isFragile: false,
    status: 'Active'
  },
  {
    sku: 'LAPTOP-DELL-15',
    name: 'Dell Laptop 15 inch',
    category: 'Electronics',
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    warehouse: 'Zaragoza',
    stockQuantity: 8,
    minStockThreshold: 10,
    unitCostUSD: 650.0,
    isFragile: true,
    status: 'Low stock'
  },
  {
    sku: 'PERFUME-COCO-50',
    name: 'Coco Perfume 50ml',
    category: 'Cosmetics',
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    warehouse: 'Los Angeles',
    stockQuantity: 120,
    minStockThreshold: 30,
    unitCostUSD: 85.0,
    isFragile: true,
    status: 'Active'
  }
];

export const sampleCarriers: Carrier[] = [
  {
    id: 'CAR-UPS',
    name: 'UPS',
    operatesIn: ['United States'],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ['Standard', 'Express']
  },
  {
    id: 'CAR-SEUR',
    name: 'SEUR',
    operatesIn: ['Spain'],
    baseRateUSD: 6.5,
    ratePerKgUSD: 1.5,
    ratePerKmUSD: 0.08,
    avgDeliveryDays: 2,
    onTimeRate: 92,
    maxWeightKg: 25,
    handlesFragile: true,
    acceptsPriority: ['Standard', 'Express', 'Same-day']
  },
  {
    id: 'CAR-DHL',
    name: 'DHL Express',
    operatesIn: ['United States', 'Spain'],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ['Express', 'Same-day']
  }
];

export const sampleShipment: Shipment = {
  id: 'SH-2024-8821',
  sku: 'LAPTOP-DELL-15',
  quantity: 1,
  origin: 'Zaragoza',
  destination: {
    city: 'Madrid',
    country: 'Spain',
    postalCode: '28001',
    distanceKm: 320
  },
  priority: 'Express',
  declaredValueUSD: 650.0,
  carrier: null,
  status: 'Pending',
  createdAt: new Date('2024-03-15')
};