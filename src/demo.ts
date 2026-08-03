import {
  type Shipment,
  binarySearchProductByWeight,
  calculateAverageShipmentDistance,
  calculateShippingCost,
  calculateTotalInventoryValue,
  findProductBySKU,
  findShipmentById,
  sampleCarriers,
  sampleProducts,
  sampleShipment,
  scoreCarrierForShipment,
  selectBestCarrier,
  sortProductsByStock,
  validateCarrier,
  validateProduct,
  validateShipment
} from './index';

const productsSortedByWeight = [...sampleProducts].sort((left, right) => left.weightKg - right.weightKg);

const demoShipments: Shipment[] = [
  sampleShipment,
  {
    ...sampleShipment,
    id: 'SH-2024-9001',
    destination: {
      city: 'Los Angeles',
      country: 'United States',
      postalCode: '90001',
      distanceKm: 24
    },
    priority: 'Standard',
    carrier: 'UPS',
    status: 'Assigned',
    createdAt: new Date('2024-03-16')
  },
  {
    ...sampleShipment,
    id: 'SH-2024-9002',
    destination: {
      city: 'Barcelona',
      country: 'Spain',
      postalCode: '08001',
      distanceKm: 300
    },
    priority: 'Same-day',
    carrier: 'DHL Express',
    status: 'In transit',
    createdAt: new Date('2024-03-17')
  }
];

const foundProduct = findProductBySKU(sampleProducts, 'laptop-dell-15');
const foundShipment = findShipmentById(demoShipments, 'SH-2024-9002');
const binarySearchIndex = binarySearchProductByWeight(productsSortedByWeight, 0.8);
const productsByStockDesc = sortProductsByStock(sampleProducts, 'desc');

const shippingCost = calculateShippingCost(sampleShipment, sampleProducts[1], sampleCarriers[1]);
const carrierScore = scoreCarrierForShipment(sampleCarriers[1], sampleShipment, sampleProducts[1]);
const bestCarrier = selectBestCarrier(sampleCarriers, sampleShipment, sampleProducts[1]);

const inventoryValue = calculateTotalInventoryValue(sampleProducts);
const averageShipmentDistance = calculateAverageShipmentDistance(demoShipments);

console.log('Product found by SKU:', foundProduct?.sku ?? null);
console.log('Shipment found by ID:', foundShipment?.id ?? null);
console.log('Binary search index for weight 0.8kg:', binarySearchIndex);
console.log('Highest stock product:', productsByStockDesc[0]?.sku ?? null);
console.log('Shipping cost:', shippingCost);
console.log('Carrier score:', carrierScore);
console.log('Best carrier:', bestCarrier?.carrier.name ?? null);
console.log('Total inventory value:', inventoryValue);
console.log('Average shipment distance:', averageShipmentDistance);
console.log('Product validation:', validateProduct(sampleProducts[0]));
console.log('Shipment validation:', validateShipment(sampleShipment));
console.log('Carrier validation:', validateCarrier(sampleCarriers[0]));